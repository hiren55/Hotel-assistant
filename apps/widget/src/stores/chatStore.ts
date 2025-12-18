import type { Message, BookingState, HotelBranding, Room } from '../types';

// Simple reactive store for Preact
type Listener = () => void;

interface ChatState {
  // Widget state
  isOpen: boolean;
  isLoading: boolean;
  error: string | null;

  // Chat state
  messages: Message[];
  isTyping: boolean;

  // Booking state
  bookingState: BookingState;
  availableRooms: Room[];

  // Hotel info
  branding: HotelBranding | null;
}

const initialBookingState: BookingState = {
  step: 'idle',
};

const initialState: ChatState = {
  isOpen: false,
  isLoading: false,
  error: null,
  messages: [],
  isTyping: false,
  bookingState: initialBookingState,
  availableRooms: [],
  branding: null,
};

class ChatStore {
  private state: ChatState = { ...initialState };
  private listeners: Set<Listener> = new Set();

  getState(): ChatState {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }

  private setState(partial: Partial<ChatState>): void {
    this.state = { ...this.state, ...partial };
    this.notify();
  }

  // Widget actions
  toggleWidget(): void {
    this.setState({ isOpen: !this.state.isOpen });
  }

  openWidget(): void {
    this.setState({ isOpen: true });
  }

  closeWidget(): void {
    this.setState({ isOpen: false });
  }

  setLoading(isLoading: boolean): void {
    this.setState({ isLoading });
  }

  setError(error: string | null): void {
    this.setState({ error });
  }

  // Chat actions
  addMessage(message: Message): void {
    this.setState({
      messages: [...this.state.messages, message],
    });
  }

  setMessages(messages: Message[]): void {
    this.setState({ messages });
  }

  setTyping(isTyping: boolean): void {
    this.setState({ isTyping });
  }

  // Booking actions
  setBookingState(bookingState: BookingState): void {
    this.setState({ bookingState });
  }

  updateBookingState(partial: Partial<BookingState>): void {
    this.setState({
      bookingState: { ...this.state.bookingState, ...partial },
    });
  }

  resetBooking(): void {
    this.setState({ bookingState: initialBookingState });
  }

  setAvailableRooms(rooms: Room[]): void {
    this.setState({ availableRooms: rooms });
  }

  // Hotel actions
  setBranding(branding: HotelBranding): void {
    this.setState({ branding });
  }

  // Reset all state
  reset(): void {
    this.state = { ...initialState };
    this.notify();
  }
}

// Singleton instance
export const chatStore = new ChatStore();

// Hook for Preact components
import { useState, useEffect } from 'preact/hooks';

export function useChatStore<T>(selector: (state: ChatState) => T): T {
  const [value, setValue] = useState(() => selector(chatStore.getState()));

  useEffect(() => {
    const unsubscribe = chatStore.subscribe(() => {
      const newValue = selector(chatStore.getState());
      setValue(newValue);
    });
    return unsubscribe;
  }, [selector]);

  return value;
}

// Convenience hooks
export function useIsOpen(): boolean {
  return useChatStore((state) => state.isOpen);
}

export function useMessages(): Message[] {
  return useChatStore((state) => state.messages);
}

export function useIsTyping(): boolean {
  return useChatStore((state) => state.isTyping);
}

export function useBookingState(): BookingState {
  return useChatStore((state) => state.bookingState);
}

export function useBranding(): HotelBranding | null {
  return useChatStore((state) => state.branding);
}

export function useIsLoading(): boolean {
  return useChatStore((state) => state.isLoading);
}

export function useError(): string | null {
  return useChatStore((state) => state.error);
}
