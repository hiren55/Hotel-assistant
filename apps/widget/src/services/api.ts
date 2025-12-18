import type {
  ChatResponse,
  ConversationResponse,
  Room,
  AvailabilityResponse,
  BookingResponse,
  HotelBranding,
} from '../types';

class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

class WidgetAPI {
  private baseUrl: string;
  private hotelId: string;
  private sessionId: string;

  constructor(baseUrl: string, hotelId: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.hotelId = hotelId;
    this.sessionId = this.getOrCreateSessionId();
  }

  private getOrCreateSessionId(): string {
    const storageKey = `hotel_chat_session_${this.hotelId}`;
    let sessionId = sessionStorage.getItem(storageKey);

    if (!sessionId) {
      sessionId = this.generateSessionId();
      sessionStorage.setItem(storageKey, sessionId);
    }

    return sessionId;
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  resetSession(): void {
    const storageKey = `hotel_chat_session_${this.hotelId}`;
    sessionStorage.removeItem(storageKey);
    this.sessionId = this.generateSessionId();
    sessionStorage.setItem(storageKey, this.sessionId);
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new APIError(
          errorData.message || `HTTP error ${response.status}`,
          response.status,
          errorData.code
        );
      }

      return response.json();
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError(
        error instanceof Error ? error.message : 'Network error',
        0,
        'NETWORK_ERROR'
      );
    }
  }

  // Chat endpoints
  async sendMessage(message: string, visitorId?: string): Promise<ChatResponse> {
    return this.request<ChatResponse>(`/chat/${this.hotelId}/message`, {
      method: 'POST',
      body: JSON.stringify({
        message,
        sessionId: this.sessionId,
        visitorId,
      }),
    });
  }

  async getConversation(): Promise<ConversationResponse | null> {
    try {
      return await this.request<ConversationResponse>(
        `/chat/${this.hotelId}/conversation?sessionId=${this.sessionId}`
      );
    } catch (error) {
      if (error instanceof APIError && error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  async endConversation(): Promise<void> {
    await this.request<{ message: string }>(
      `/chat/${this.hotelId}/conversation/end?sessionId=${this.sessionId}`,
      { method: 'POST' }
    );
  }

  // Hotel endpoints
  async getHotelBranding(): Promise<HotelBranding> {
    try {
      return await this.request<HotelBranding>(`/hotels/${this.hotelId}/branding`);
    } catch {
      // Return defaults if branding endpoint doesn't exist
      return {
        hotelName: 'Hotel Assistant',
        welcomeMessage: 'Hello! How can I help you today?',
      };
    }
  }

  // Room endpoints
  async getRooms(): Promise<Room[]> {
    const response = await this.request<{ rooms: Room[] }>(
      `/rooms/${this.hotelId}`
    );
    return response.rooms || [];
  }

  async checkAvailability(
    checkIn: string,
    checkOut: string,
    guests?: number
  ): Promise<AvailabilityResponse> {
    const params = new URLSearchParams({
      checkIn,
      checkOut,
      ...(guests && { guests: guests.toString() }),
    });

    return this.request<AvailabilityResponse>(
      `/rooms/${this.hotelId}/availability?${params}`
    );
  }

  // Booking endpoints
  async createBooking(bookingData: {
    roomId: string;
    checkIn: string;
    checkOut: string;
    guestName: string;
    guestEmail: string;
    guestPhone?: string;
    adults: number;
    children?: number;
    specialRequests?: string;
  }): Promise<BookingResponse> {
    return this.request<BookingResponse>(`/bookings/${this.hotelId}`, {
      method: 'POST',
      body: JSON.stringify({
        ...bookingData,
        sessionId: this.sessionId,
      }),
    });
  }
}

// Singleton instance
let apiInstance: WidgetAPI | null = null;

export function initAPI(baseUrl: string, hotelId: string): WidgetAPI {
  apiInstance = new WidgetAPI(baseUrl, hotelId);
  return apiInstance;
}

export function getAPI(): WidgetAPI {
  if (!apiInstance) {
    throw new Error('API not initialized. Call initAPI first.');
  }
  return apiInstance;
}

export { WidgetAPI, APIError };
