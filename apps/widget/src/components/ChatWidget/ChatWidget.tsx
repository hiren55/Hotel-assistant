// Main chat widget component
import { useState, useEffect, useCallback } from 'preact/hooks';
import { ChatHeader } from './ChatHeader';
import { ChatMessages } from './ChatMessages';
import { ChatInput } from './ChatInput';
import { WidgetButton } from './WidgetButton';
import {
  chatStore,
  useIsOpen,
  useIsLoading,
  useBookingState,
  useBranding,
} from '../../stores/chatStore';
import { getAPI } from '../../services/api';
import { generateId } from '../../utils';
import type { WidgetConfig, Message } from '../../types';

interface ChatWidgetProps {
  config: WidgetConfig;
}

export function ChatWidget({ config }: ChatWidgetProps) {
  const isOpen = useIsOpen();
  const isLoading = useIsLoading();
  const bookingState = useBookingState();
  const branding = chatStore.getState().branding; // We'll get it from hook below
  const [suggestedActions, setSuggestedActions] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize widget
  useEffect(() => {
    const initWidget = async () => {
      try {
        chatStore.setLoading(true);
        const api = getAPI();

        try {
          const branding = await api.getHotelBranding();
          chatStore.setBranding(branding);
        } catch (err) {
          console.warn('Failed to load branding, using defaults:', err);
        }

        try {
          const conversation = await api.getConversation();
          if (conversation?.messages) {
            chatStore.setMessages(
              conversation.messages.map((m: any) => ({
                id: m.id,
                role: m.role,
                content: m.content,
                intent: m.intent,
                timestamp: new Date(m.createdAt || m.timestamp || new Date()),
              }))
            );
            if (conversation.bookingState) {
              chatStore.setBookingState(conversation.bookingState);
            }
          }
        } catch (err) {
          console.warn('Failed to restore conversation:', err);
        }

        try {
          const rooms = await api.getRooms();
          chatStore.setAvailableRooms(rooms);
        } catch (err) {
          console.error('Failed to load rooms:', err);
        }

        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize widget:', error);
        chatStore.setError('Failed to load chat. Please refresh the page.');
        setIsInitialized(true);
      } finally {
        chatStore.setLoading(false);
      }
    };

    initWidget();
  }, [config.hotelId]);

  const handleSendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage = {
      id: generateId(),
      role: 'user' as const,
      content,
      timestamp: new Date(),
    };
    chatStore.addMessage(userMessage);
    chatStore.setTyping(true);
    setSuggestedActions([]);

    try {
      const api = getAPI();
      const response = await api.sendMessage(content);
      console.log('Chat response:', response);

      const botMsg: Message = {
        id: generateId(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
        intent: response.intent,
        metadata: response.metadata,
        bookingState: response.bookingState,
      };
      chatStore.addMessage(botMsg);

      if (response.bookingState) {
        chatStore.setBookingState(response.bookingState);
      }
      if (response.suggestedActions) {
        setSuggestedActions(response.suggestedActions);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      chatStore.addMessage({
        id: generateId(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again or contact the hotel directly.',
        timestamp: new Date(),
      });
    } finally {
      chatStore.setTyping(false);
    }
  }, []);

  const handleSuggestionSelect = useCallback(
    (suggestion: string) => { handleSendMessage(suggestion); },
    [handleSendMessage]
  );

  const handleRoomSelect = useCallback(
    (room: any) => {
      handleSendMessage(`I'd like to book the ${room.name}`);
    },
    [handleSendMessage]
  );

  const handleDateConfirm = useCallback(async (checkIn: string, checkOut: string) => {
    if (isLoading) return;
    const message = `${checkIn} to ${checkOut}`;
    handleSendMessage(message);
  }, [isLoading, handleSendMessage]);

  const handleGuestConfirm = useCallback(async (guestInfo: any) => {
    if (isLoading) return;
    chatStore.updateBookingState(guestInfo);
    const message = `My details: ${guestInfo.name}, ${guestInfo.email}${guestInfo.phone ? `, ${guestInfo.phone}` : ''}`;
    handleSendMessage(message);
  }, [isLoading, handleSendMessage]);

  const handleBookingConfirm = useCallback(async () => {
    if (isLoading) return;
    handleSendMessage('I confirm this booking. Please proceed.');
  }, [isLoading, handleSendMessage]);

  const handleToggle = useCallback(() => { chatStore.toggleWidget(); }, []);
  const handleClose = useCallback(() => { chatStore.closeWidget(); }, []);

  const positionRight = config.position !== 'bottom-left';

  // Read live primary color from hotel branding or fallback
  const liveBranding = chatStore.getState().branding; // Preact hook state isn't sufficient for dynamic styles without re-render trigger if we don't use useBranding
  // Let's use the hook to ensure it re-renders when branding loads
  const currentBranding = useBranding();
  const primaryColor = currentBranding?.primaryColor || config.theme?.primaryColor || '#0f172a';

  return (
    <>
      <style>
        {`
          .widget-fab,
          .msg-bubble--user,
          .chat-send-btn,
          .room-card-select-btn,
          .room-dot.active,
          .calendar-day--selected,
          .calendar-confirm-btn,
          .guest-confirm-btn,
          .success-icon-wrap,
          .greeting-bot-icon,
          .msg-bot-icon {
            background-color: ${primaryColor} !important;
          }
          
          .widget-fab:hover,
          .chat-send-btn:hover:not(:disabled),
          .room-card-select-btn:hover,
          .calendar-confirm-btn:hover:not(:disabled),
          .guest-confirm-btn:hover:not(:disabled) {
            filter: brightness(0.85) !important;
          }

          .room-card--selected {
            border-color: ${primaryColor} !important;
            box-shadow: 0 0 0 2px ${primaryColor} !important;
          }
          
          .chat-input-wrapper:focus-within {
            border-color: ${primaryColor} !important;
          }

          .total-price-large,
          .booking-id-text {
            color: ${primaryColor} !important;
          }
        `}
      </style>
      <div class="widget-container-root" style={positionRight ? 'right:24px' : 'left:24px'}>
      {/* Chat Window */}
      <div
        class={`widget-window${isOpen ? ' widget-window--open' : ''}`}
        style={positionRight ? 'right:0' : 'left:0'}
        aria-hidden={!isOpen}
      >
        {isLoading && !isInitialized && (
          <div class="widget-loading-overlay">
            <div class="widget-loading-spinner"></div>
          </div>
        )}

        <ChatHeader onClose={handleClose} />
        <ChatMessages
          suggestedActions={suggestedActions}
          onSuggestionSelect={handleSuggestionSelect}
          onRoomSelect={handleRoomSelect}
          onDateConfirm={handleDateConfirm}
          onGuestConfirm={handleGuestConfirm}
          onBookingConfirm={handleBookingConfirm}
        />
        <ChatInput
          onSend={handleSendMessage}
          disabled={!isInitialized || isLoading}
          placeholder={bookingState.step !== 'idle' ? 'Continue with your booking...' : 'Type your message...'}
        />
        <div class="chat-bottom-nav">
          <button class="nav-item active">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
            </svg>
          </button>
          <button class="nav-item">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </button>
          <button class="nav-item">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Toggle Button */}
      <WidgetButton onClick={handleToggle} isOpen={isOpen} />
    </div>
    </>
  );
}
