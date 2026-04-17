import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import {
    AIProvider,
    AIContext,
    AIResponse,
    IntentDetectionResult,
} from './ai-provider.interface';

@Injectable()
export class MockProvider extends AIProvider {
    readonly name = 'mock';
    private readonly logger = new Logger(MockProvider.name);
    // Stores the entire parsed JSON
    private mockData: any = {};

    constructor() {
        super();
        this.loadResponses();
    }

    private loadResponses() {
        try {
            const filePath = path.join(process.cwd(), 'demo-bot-responses.json');
            if (fs.existsSync(filePath)) {
                const data = fs.readFileSync(filePath, 'utf8');
                this.mockData = JSON.parse(data);
                this.logger.log('Loaded mock responses from demo-bot-responses.json');
            } else {
                this.logger.warn(`Could not find demo-bot-responses.json at ${filePath}`);
            }
        } catch (error) {
            this.logger.error('Failed to load mock responses', error);
        }
    }

    private replacePlaceholders(content: string, context: AIContext): string {
        let text = content;
        const state = context.bookingState;

        // Find dummy room data if applicable
        let selectedRoom: any = null;
        if (state?.roomId && this.mockData.database?.roomTypes) {
            selectedRoom = this.mockData.database.roomTypes.find((r: any) => r.id === state.roomId)
                || this.mockData.database.roomTypes[0]; // fallback to first room 
        }

        // Replace common hotel placeholders
        text = text.replace(/{HOTEL_NAME}/g, context.hotelName || this.mockData.database?.hotel?.name || 'Hotel');
        text = text.replace(/{CHECK_IN_TIME}/g, this.mockData.database?.hotel?.policies?.checkIn || '3:00 PM');
        text = text.replace(/{CHECK_OUT_TIME}/g, this.mockData.database?.hotel?.policies?.checkOut || '11:00 AM');
        text = text.replace(/{CANCELLATION_POLICY}/g, this.mockData.database?.hotel?.policies?.cancellation || 'standard cancellation');

        // Dynamically replace booking/room related placeholders
        if (selectedRoom) {
            text = text.replace(/{ROOM_NAME}/g, selectedRoom.name);
            text = text.replace(/{MAX_GUESTS}/g, String(selectedRoom.maxGuests));
            text = text.replace(/{BED_TYPE}/g, selectedRoom.bedType);
            text = text.replace(/{PRICE}/g, String(selectedRoom.basePrice));
            text = text.replace(/{AMENITIES}/g, selectedRoom.amenities?.join(', ') || 'standard amenities');
        } else {
            // Fallback to first room type details if nothing selected for general inquiries
            const defaultRoom = this.mockData.database?.roomTypes?.[0];
            text = text.replace(/{ROOM_NAME}/g, defaultRoom?.name || 'Standard Room');
            text = text.replace(/{MAX_GUESTS}/g, String(defaultRoom?.maxGuests || '2'));
            text = text.replace(/{BED_TYPE}/g, defaultRoom?.bedType || 'Queen Bed');
            text = text.replace(/{PRICE}/g, String(defaultRoom?.basePrice || '99.99'));
            text = text.replace(/{AMENITIES}/g, defaultRoom?.amenities?.join(', ') || 'standard amenities');
        }

        if (state) {
            text = text.replace(/{CHECK_IN_DATE}/g, state.checkIn || 'your check-in date');
            text = text.replace(/{CHECK_OUT_DATE}/g, state.checkOut || 'your check-out date');
            text = text.replace(/{GUEST_NAME}/g, state.guestName || 'Guest');
            text = text.replace(/{GUEST_EMAIL}/g, state.guestEmail || 'your email');
            text = text.replace(/{TOTAL_PRICE}/g, String(state.roomId ? (selectedRoom?.basePrice || 'price') : 'total price'));
            text = text.replace(/{CONFIRMATION_NUMBER}/g, `CONF-${Math.floor(Math.random() * 10000)}`);
        }

        return text;
    }

    async generateResponse(
        userMessage: string,
        context: AIContext,
    ): Promise<AIResponse> {
        const lowerMsg = userMessage.toLowerCase();
        let matchedIntent = context.currentIntent || 'fallback';

        // Always reload the responses file for every generation so the user can natively edit demo-bot-responses.json while texting
        this.loadResponses();

        const botResponses = this.mockData.botResponses || {};

        // 1. Check if we are inside an active booking flow
        if (context.bookingState && context.bookingState.step !== 'idle') {
            const step = context.bookingState.step;

            // Handle cancel requests
            if (lowerMsg.includes('cancel') || lowerMsg.includes('stop')) {
                matchedIntent = 'cancel_booking';
            } else {
                // Progress sequentially through the flow based on backend state
                if (step === 'room_selection') {
                    matchedIntent = 'show_rooms';
                } else if (step === 'guest_details') {
                    matchedIntent = botResponses['collect_guest_info'] ? 'collect_guest_info' : 'flow_collect_guest_info';
                } else if (step === 'confirmation') {
                    matchedIntent = 'confirm_booking';
                } else if (step === 'date_selection') {
                    matchedIntent = 'check_availability';
                }
            }
        } else {
            // 2. Normal intent matching if not in booking flow
            if (matchedIntent === 'unclear' || !botResponses[matchedIntent]) {
                // HIGH PRIORITY: Booking and Availability
                if (lowerMsg.includes('book') || lowerMsg.includes('reserve')) matchedIntent = 'check_availability';
                else if (lowerMsg.includes('availab')) matchedIntent = 'check_availability';

                // GREETINGS
                else if (lowerMsg.includes('hi') || lowerMsg.includes('hello')) matchedIntent = 'greeting';

                // INFO
                else if (lowerMsg.includes('price') || lowerMsg.includes('rate') || lowerMsg.includes('much')) matchedIntent = 'room_details';
                else if (lowerMsg.includes('room') || lowerMsg.includes('bed')) matchedIntent = 'room_details';
                else if (lowerMsg.includes('hotel') || lowerMsg.includes('info')) matchedIntent = 'hotel_info';

                // LOWER PRIORITY: Policy (catch 'check' only if not already matched above)
                else if (lowerMsg.includes('policy') || lowerMsg.includes('rule') || (lowerMsg.includes('check') && !lowerMsg.includes('availab'))) matchedIntent = 'policy_inquiry';

                else if (lowerMsg.includes('location') || lowerMsg.includes('where')) matchedIntent = 'location_directions';
                else if (lowerMsg.includes('pool') || lowerMsg.includes('wifi')) matchedIntent = 'amenities_inquiry';
                else matchedIntent = 'fallback';
            }

            // Special case check if confirmation succeeded
            if (lowerMsg.includes('confirm') && context.bookingState?.step === 'idle' && matchedIntent === 'fallback') {
                matchedIntent = 'booking_success';
            }
        }

        // 3. ✨ PRIMITIVE RAG SEARCH OVER DATABASE KNOWLEDGE
        // If we have scraped data in the DB, let's search it by keyword so the dashboard mock data actually works in chat!
        if (context.knowledgeContext && matchedIntent !== 'check_availability' && matchedIntent !== 'booking_intent' && matchedIntent !== 'greeting') {
            const queryWords = lowerMsg.replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length >= 4);
            if (queryWords.length > 0) {
                const lines = context.knowledgeContext.split('\n');
                let bestMatch = null;
                let maxScore = 0;
                
                for (const line of lines) {
                    if (line.trim().startsWith('[') || line.trim().length < 10) continue;
                    
                    const lowerLine = line.toLowerCase();
                    let score = 0;
                    
                    for (const word of queryWords) {
                        if (lowerLine.includes(word)) score++;
                    }
                    
                    if (score > maxScore && score > 0) {
                        maxScore = score;
                        bestMatch = line;
                    }
                }
                
                if (bestMatch) {
                    // Strip the prefix like "faq_wifi:" or "description:"
                    const parts = bestMatch.split(':');
                    const answer = parts.length > 1 ? parts.slice(1).join(':').trim() : bestMatch;
                    
                    // Add a tiny delay to simulate network latency
                    await new Promise(resolve => setTimeout(resolve, 800));

                    return {
                        content: answer,
                        metadata: { provider: this.name, mocked: true, dataSource: 'database_knowledge' },
                    };
                }
            }
        }

        const responseObj = botResponses[matchedIntent] || botResponses['fallback'] || this.mockData.responses?.[matchedIntent] || "I don't have a response for that yet.";

        // Debug log
        try {
            fs.appendFileSync(path.join(process.cwd(), 'debug-bot.log'), `[${new Date().toISOString()}] Intent: ${matchedIntent}, Message: ${userMessage.substring(0, 20)}\n`);
        } catch (e) { }

        // Add a tiny delay to simulate network latency
        await new Promise(resolve => setTimeout(resolve, 800));

        // Support flat strings if the user edits the JSON simply
        if (typeof responseObj === 'string') {
            const content = this.replacePlaceholders(responseObj, context);
            try { fs.appendFileSync(path.join(process.cwd(), 'debug-bot.log'), `[${new Date().toISOString()}] String Response: ${content.substring(0, 20)}\n`); } catch (e) { }
            return {
                content,
                metadata: { provider: this.name, mocked: true, matchedIntent },
            };
        }

        const content = this.replacePlaceholders(responseObj.content || 'Hello from the Mock Bot!', context);
        try { fs.appendFileSync(path.join(process.cwd(), 'debug-bot.log'), `[${new Date().toISOString()}] Object Response: ${content.substring(0, 20)}\n`); } catch (e) { }

        return {
            content,
            bookingAction: responseObj.action || responseObj.bookingAction,
            suggestedResponses: responseObj.suggestedResponses,
            metadata: { provider: this.name, mocked: true, matchedIntent },
        };
    }

    async detectIntent(
        _message: string,
        _context?: Partial<AIContext>,
    ): Promise<IntentDetectionResult> {
        return { intent: 'unclear', confidence: 0 };
    }

    async isAvailable(): Promise<boolean> {
        return true;
    }
}
