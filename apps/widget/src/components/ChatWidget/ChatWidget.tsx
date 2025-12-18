// Main chat widget component
import { useState, useEffect, useCallback } from 'preact/hooks';
import { ChatHeader } from './ChatHeader';
import { ChatMessages } from './ChatMessages';
import { ChatInput } from './ChatInput';
import { WidgetButton } from './WidgetButton';
import { LoadingOverlay } from '../common';
import {
  chatStore,
  useIsOpen,
  useIsLoading,
  useBookingState,
} from '../../stores/chatStore';
import { getAPI } from '../../services/api';
import { generateId, cn } from '../../utils';
import type { WidgetConfig } from '../../types';

interface ChatWidgetProps {
  config: WidgetConfig;
}

export function ChatWidget({ config }: ChatWidgetProps) {
  const isOpen = useIsOpen();
  const isLoading = useIsLoading();
  const bookingState = useBookingState();
  const [suggestedActions, setSuggestedActions] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize widget
  useEffect(() => {
    const initWidget = async () => {
      try {
        chatStore.setLoading(true);

        const api = getAPI();

        // Fetch hotel branding
        const branding = await api.getHotelBranding();
        chatStore.setBranding(branding);

        // Restore existing conversation if any
        const conversation = await api.getConversation();
        if (conversation?.messages) {
          chatStore.setMessages(
            conversation.messages.map((m) => ({
              ...m,
              timestamp: new Date(m.timestamp),
            }))
          );
          if (conversation.bookingState) {
            chatStore.setBookingState(conversation.bookingState);
          }
        }

        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize widget:', error);
        chatStore.setError('Failed to load chat. Please refresh the page.');
      } finally {
        chatStore.setLoading(false);
      }
    };

    initWidget();
  }, []);

  // Handle sending messages
  const handleSendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    // Add user message immediately
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

      // Add assistant response
      const assistantMessage = {
        id: generateId(),
        role: 'assistant' as const,
        content: response.message,
        timestamp: new Date(),
        intent: response.intent,
      };
      chatStore.addMessage(assistantMessage);

      // Update booking state if present
      if (response.bookingState) {
        chatStore.setBookingState(response.bookingState);
      }

      // Set suggested actions
      if (response.suggestedActions) {
        setSuggestedActions(response.suggestedActions);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      // Add error message
      chatStore.addMessage({
        id: generateId(),
        role: 'assistant',
        content:
          'Sorry, I encountered an error. Please try again or contact the hotel directly.',
        timestamp: new Date(),
      });
    } finally {
      chatStore.setTyping(false);
    }
  }, []);

  // Handle suggestion selection
  const handleSuggestionSelect = useCallback(
    (suggestion: string) => {
      handleSendMessage(suggestion);
    },
    [handleSendMessage]
  );

  // Toggle widget open/close
  const handleToggle = useCallback(() => {
    chatStore.toggleWidget();
  }, []);

  const handleClose = useCallback(() => {
    chatStore.closeWidget();
  }, []);

  // Determine position classes
  const positionClasses =
    config.position === 'bottom-left'
      ? 'left-4 sm:left-6'
      : 'right-4 sm:right-6';

  return (
    <div
      className={cn('fixed bottom-4 sm:bottom-6 z-[9999]', positionClasses)}
      role="complementary"
      aria-label="Chat widget"
    >
      {/* Chat Window */}
      <div
        className={cn(
          'widget-window absolute bottom-16 mb-2',
          config.position === 'bottom-left' ? 'left-0' : 'right-0',
          'w-[360px] max-w-[calc(100vw-2rem)] h-[500px] max-h-[70vh]',
          'bg-white rounded-xl shadow-2xl',
          'flex flex-col',
          'transform transition-all duration-300 origin-bottom',
          isOpen
            ? 'scale-100 opacity-100 pointer-events-auto'
            : 'scale-95 opacity-0 pointer-events-none'
        )}
        aria-hidden={!isOpen}
      >
        {isLoading && !isInitialized && <LoadingOverlay />}

        <ChatHeader onClose={handleClose} />

        <ChatMessages
          suggestedActions={suggestedActions}
          onSuggestionSelect={handleSuggestionSelect}
        />

        <ChatInput
          onSend={handleSendMessage}
          disabled={!isInitialized || isLoading}
          placeholder={
            bookingState.step !== 'idle'
              ? 'Continue with your booking...'
              : 'Type your message...'
          }
        />
      </div>

      {/* Toggle Button */}
      <WidgetButton onClick={handleToggle} isOpen={isOpen} />
    </div>
  );
}
