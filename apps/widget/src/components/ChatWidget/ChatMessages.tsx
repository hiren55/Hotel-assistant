// Chat messages component
import { useRef, useEffect } from 'preact/hooks';
import { useMessages, useIsTyping, useBranding } from '../../stores/chatStore';
import { TypingIndicator } from '../common';
import { formatTime, parseSimpleMarkdown, cn } from '../../utils';
import type { Message } from '../../types';

interface MessageBubbleProps {
  message: Message;
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={cn(
        'flex w-full mb-3',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-2',
          isUser
            ? 'bg-primary text-white rounded-br-md'
            : 'bg-gray-100 text-gray-800 rounded-bl-md'
        )}
      >
        <div
          className="text-sm whitespace-pre-wrap break-words"
          dangerouslySetInnerHTML={{
            __html: parseSimpleMarkdown(message.content),
          }}
        />
        <div
          className={cn(
            'text-xs mt-1',
            isUser ? 'text-white/70' : 'text-gray-500'
          )}
        >
          {formatTime(message.timestamp)}
        </div>
      </div>
    </div>
  );
}

interface QuickRepliesProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
}

export function QuickReplies({ suggestions, onSelect }: QuickRepliesProps) {
  if (!suggestions.length) return null;

  return (
    <div className="flex flex-wrap gap-2 px-4 py-2">
      {suggestions.map((suggestion) => (
        <button
          key={suggestion}
          onClick={() => onSelect(suggestion)}
          className="px-3 py-1.5 text-sm bg-white border border-primary text-primary rounded-full hover:bg-primary hover:text-white transition-colors"
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}

interface ChatMessagesProps {
  suggestedActions?: string[];
  onSuggestionSelect?: (suggestion: string) => void;
}

export function ChatMessages({
  suggestedActions = [],
  onSuggestionSelect,
}: ChatMessagesProps) {
  const messages = useMessages();
  const isTyping = useIsTyping();
  const branding = useBranding();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3">
      {/* Welcome message if no messages */}
      {messages.length === 0 && (
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-primary"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-800 mb-1">
            Welcome to {branding?.hotelName || 'our chat'}!
          </h3>
          <p className="text-sm text-gray-600">
            {branding?.welcomeMessage ||
              'How can I help you today? Ask me about rooms, amenities, or bookings.'}
          </p>
        </div>
      )}

      {/* Message list */}
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}

      {/* Typing indicator */}
      {isTyping && <TypingIndicator />}

      {/* Quick replies */}
      {!isTyping && suggestedActions.length > 0 && onSuggestionSelect && (
        <QuickReplies
          suggestions={suggestedActions}
          onSelect={onSuggestionSelect}
        />
      )}

      {/* Scroll anchor */}
      <div ref={messagesEndRef} />
    </div>
  );
}
