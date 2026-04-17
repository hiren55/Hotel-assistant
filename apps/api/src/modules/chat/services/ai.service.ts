import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  AIProvider,
  AIContext,
  AIResponse,
  IntentDetectionResult,
} from '../providers/ai-provider.interface';
import { GeminiProvider } from '../providers/gemini.provider';
import { MockProvider } from '../providers/mock.provider';

const CANNED_RESPONSES = {
  error: "I apologize, but I'm having trouble processing your request right now. Please try again in a moment, or contact our reception for immediate assistance.",
  rateLimit: "I'm currently experiencing high demand. Please wait a moment and try again.",
  unclear: "I'm not sure I understand. Could you please rephrase your question? I can help with hotel information, room details, pricing, and bookings.",
  offTopic: "I'm designed to help with hotel-related questions. Is there something about our hotel, rooms, or making a booking I can help you with?",
  fallback: "For this type of request, please contact our reception directly. They'll be happy to assist you!",
};

@Injectable()
export class AIService implements OnModuleInit {
  private readonly logger = new Logger(AIService.name);
  private provider: AIProvider;
  private readonly maxRetries = 2;
  private readonly retryDelay = 1000;

  constructor(
    private readonly geminiProvider: GeminiProvider,
    private readonly mockProvider: MockProvider,
  ) { }

  async onModuleInit() {
    const useMock = process.env.USE_MOCK_AI === 'true';
    this.provider = useMock ? this.mockProvider : this.geminiProvider;

    const available = await this.provider.isAvailable();
    this.logger.log(`AI provider (${this.provider.name}): ${available ? 'available' : 'unavailable'}`);

    if (!available && !useMock) {
      this.logger.warn('Gemini provider unavailable - check your GEMINI_API_KEY. Using canned responses only.');
    }
  }

  async generateResponse(
    userMessage: string,
    context: AIContext,
  ): Promise<AIResponse> {
    // Input validation
    if (!userMessage || userMessage.trim().length === 0) {
      return { content: CANNED_RESPONSES.unclear };
    }

    if (userMessage.length > 2000) {
      return {
        content: "Your message is quite long. Could you please summarize your question?",
      };
    }

    // Try with retries
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this.provider.generateResponse(userMessage, context);
        return this.validateAndSanitizeResponse(response);
      } catch (error) {
        this.logger.warn(`Gemini attempt ${attempt} failed:`, error);
        if (attempt < this.maxRetries) {
          await this.delay(this.retryDelay * attempt);
        }
      }
    }

    // All attempts failed - return canned response
    return { content: CANNED_RESPONSES.error };
  }

  async detectIntent(
    message: string,
    context?: Partial<AIContext>,
  ): Promise<IntentDetectionResult> {
    // Simple pattern-based intent detection as first pass
    const quickIntent = this.quickIntentDetection(message);
    if (quickIntent.confidence > 0.8) {
      return quickIntent;
    }

    // Use AI for more complex intent detection
    try {
      return await this.provider.detectIntent(message, context);
    } catch (error) {
      this.logger.warn('AI intent detection failed, using pattern matching:', error);
      return quickIntent;
    }
  }

  private quickIntentDetection(message: string): IntentDetectionResult {
    const lowerMessage = message.toLowerCase().trim();

    // Greeting patterns
    if (/^(hi|hello|hey|good\s*(morning|afternoon|evening)|howdy)/i.test(lowerMessage)) {
      return { intent: 'greeting', confidence: 0.95 };
    }

    // Farewell patterns
    if (/^(bye|goodbye|see\s*you|thanks?\s*(for|bye)|take\s*care)/i.test(lowerMessage)) {
      return { intent: 'farewell', confidence: 0.9 };
    }

    // Thanks patterns
    if (/^(thanks?|thank\s*you|thx|appreciated)/i.test(lowerMessage)) {
      return { intent: 'thanks', confidence: 0.9 };
    }

    // Booking intent
    if (/(book|reserve|reservation|stay|want\s*a\s*room)/i.test(lowerMessage)) {
      return { intent: 'booking_intent', confidence: 0.85 };
    }

    // Availability check
    if (/(available|availability|free|open)\s*(room|date|on)/i.test(lowerMessage)) {
      return { intent: 'availability_check', confidence: 0.85 };
    }

    // Pricing inquiry
    if (/(price|cost|rate|how\s*much|fee|charge)/i.test(lowerMessage)) {
      return { intent: 'pricing_inquiry', confidence: 0.85 };
    }

    // Room inquiry
    if (/(room|suite|accommodation|bed|single|double|twin)/i.test(lowerMessage)) {
      return { intent: 'room_inquiry', confidence: 0.7 };
    }

    // Policy questions
    if (/(check.?in|check.?out|cancel|policy|rule|pet|smoke|parking)/i.test(lowerMessage)) {
      return { intent: 'policy_question', confidence: 0.8 };
    }

    // Location
    if (/(where|address|location|direction|near|how\s*to\s*get)/i.test(lowerMessage)) {
      return { intent: 'location_directions', confidence: 0.85 };
    }

    // Amenities
    if (/(wifi|pool|gym|breakfast|spa|restaurant|facility|amenity)/i.test(lowerMessage)) {
      return { intent: 'amenities_inquiry', confidence: 0.85 };
    }

    // Hotel info (catch-all for hotel questions)
    if (/(hotel|about|tell\s*me)/i.test(lowerMessage)) {
      return { intent: 'hotel_info', confidence: 0.6 };
    }

    return { intent: 'unclear', confidence: 0.4 };
  }

  private validateAndSanitizeResponse(response: AIResponse): AIResponse {
    let content = response.content;

    // Remove any leaked system information
    content = content
      .replace(/\[SYSTEM[^\]]*\]/gi, '')
      .replace(/CRITICAL RULES/gi, '')
      .replace(/SYSTEM INSTRUCTIONS/gi, '')
      .trim();

    // Check for empty response
    if (!content || content.length < 5) {
      content = CANNED_RESPONSES.error;
    }

    // Limit response length
    if (content.length > 1500) {
      content = content.slice(0, 1500) + '...';
    }

    return { ...response, content };
  }

  getCannedResponse(type: keyof typeof CANNED_RESPONSES): string {
    return CANNED_RESPONSES[type] || CANNED_RESPONSES.error;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
