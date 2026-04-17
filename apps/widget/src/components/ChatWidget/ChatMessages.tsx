// Chat messages component
import { useRef, useEffect } from 'preact/hooks';
import { useMessages, useIsTyping, useChatStore, useBookingState, chatStore } from '../../stores/chatStore';
import { getAPI } from '../../services/api';
import { formatTime, formatDate, parseSimpleMarkdown } from '../../utils';
import type { Message, Room } from '../../types';
import { RoomSelection, DateSelection, GuestDetails, BookingSummary, BookingSuccess } from '../BookingFlow';

interface MessageBubbleProps {
  message: Message;
  onRoomSelect?: (room: any) => void;
  onDateConfirm?: (checkIn: string, checkOut: string) => void;
  onGuestConfirm?: (guestInfo: any) => void;
  onBookingConfirm?: () => void;
}

function MessageBubble({ 
  message, 
  onRoomSelect, 
  onDateConfirm,
  onGuestConfirm,
  onBookingConfirm,
}: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const availableRooms = useChatStore((state) => state.availableRooms);
  const globalBookingState = useBookingState();

  // Determine if this message should show the room selection
  const showRoomSelection = 
    !isUser && (
      message.intent === 'room_selection' || 
      (message.metadata && message.metadata.rooms) ||
      message.content.includes('DZ_101') ||
      message.content.includes('available room types')
    );

  const showDateSelection = 
    !isUser && (
      message.bookingState?.step === 'date_selection' ||
      message.content.includes('provide your check-in')
    );

  const showGuestDetails = 
    !isUser && (
      message.bookingState?.step === 'guest_details' ||
      message.content.includes('provide your details')
    );

  const showBookingSummary = 
    !isUser && (
      message.bookingState?.step === 'confirmation' ||
      message.intent === 'confirmation'
    );

  // Heuristic: search for booking reference patterns in text if metadata is missing
  const refMatch = message.content.match(/Booking Reference:\s*([A-Z0-9]+)/i);
  const confirmationNumber = message.metadata?.confirmationNumber || (refMatch ? refMatch[1] : null);
  const showBookingSuccess = !isUser && !!confirmationNumber;

  // If we should show rooms but have none, try to fetch them on demand
  useEffect(() => {
    if (showRoomSelection && availableRooms.length === 0) {
      const fetchRooms = async () => {
        try {
          const api = getAPI();
          const rooms = await api.getRooms();
          if (rooms.length > 0) {
            chatStore.setAvailableRooms(rooms);
          }
        } catch (err) {
          console.error('Failed to fetch rooms on demand:', err);
        }
      };
      fetchRooms();
    }
  }, [showRoomSelection, availableRooms.length]);

  if (isUser) {
    return (
      <div className="msg-user-row">
        <div className="msg-col" style={{ alignItems: 'flex-end' }}>
          <div className="msg-bubble msg-bubble--user">
            <div
              className="msg-text"
              dangerouslySetInnerHTML={{ __html: parseSimpleMarkdown(message.content) }}
            />
          </div>
          <div className="msg-time msg-time--user">{formatTime(message.timestamp)}</div>
        </div>
        <div className="msg-user-avatar">
          <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop" alt="User" />
        </div>
      </div>
    );
  }

  return (
    <div className="msg-bot-row">
      <div className="msg-bot-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 8V4H8"></path>
          <rect x="2" y="8" width="20" height="12" rx="2"></rect>
          <circle cx="7" cy="13" r="1"></circle>
          <circle cx="17" cy="13" r="1"></circle>
          <path d="M7 17h10"></path>
        </svg>
      </div>
      <div className={`msg-col${(showRoomSelection || showDateSelection || showGuestDetails || showBookingSummary || showBookingSuccess) ? ' msg-col--full' : ''}`}>
        {/* Only show text bubble if no GUI component is active for this message, 
            EXCEPT for luxury action steps (rooms, dates) which show a dark navy bubble if they don't have internal headers */}
        {((!showRoomSelection && !showDateSelection && !showGuestDetails && !showBookingSummary && !showBookingSuccess) || 
          showRoomSelection || showDateSelection) && (
          <div className={`msg-bubble ${(showRoomSelection || showDateSelection) ? 'msg-bubble--bot-luxury' : 'msg-bubble--bot'}`}>
            <div
              className="msg-text"
              dangerouslySetInnerHTML={{ __html: parseSimpleMarkdown(message.content) }}
            />
          </div>
        )}
        {showRoomSelection && availableRooms.length > 0 && (
          <RoomSelection 
            rooms={message.metadata?.rooms || availableRooms} 
            onSelect={onRoomSelect || (() => {})}
          />
        )}
        {showDateSelection && (
          <DateSelection 
            onConfirm={onDateConfirm || (() => {})}
          />
        )}
        {showGuestDetails && (
          <GuestDetails 
            onSubmit={onGuestConfirm || (() => {})}
          />
        )}
        {showBookingSummary && message.bookingState && availableRooms.length > 0 && (
          <BookingSummary 
            room={availableRooms.find(r => r.id === message.bookingState?.roomId) || availableRooms[0] as Room}
            bookingState={message.bookingState}
            onConfirm={onBookingConfirm || (() => {})}
            onBack={onDateConfirm ? () => {} : undefined}
          />
        )}
        {showBookingSuccess && (
          <BookingSuccess 
            confirmationNumber={confirmationNumber}
            checkIn={(message.bookingState?.checkIn || globalBookingState?.checkIn) ? formatDate(message.bookingState?.checkIn || globalBookingState?.checkIn || '') : undefined}
            property={availableRooms.find(r => r.id === (message.bookingState?.roomId || globalBookingState?.roomId))?.name}
            onClose={() => {}}
          />
        )}
        <div className="msg-time msg-time--bot">{formatTime(message.timestamp)}</div>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="msg-bot-row">
      <div className="msg-bot-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 8V4H8"></path>
          <rect x="2" y="8" width="20" height="12" rx="2"></rect>
          <circle cx="7" cy="13" r="1"></circle>
          <circle cx="17" cy="13" r="1"></circle>
          <path d="M7 17h10"></path>
        </svg>
      </div>
      <div className="msg-bubble msg-bubble--bot msg-typing" style={{ alignSelf: 'flex-start' }}>
        <span className="typing-dot"></span>
        <span className="typing-dot"></span>
        <span className="typing-dot"></span>
      </div>
    </div>
  );
}

interface QuickRepliesProps {
  suggestions: string[];
  onSelect: (s: string) => void;
}

export function QuickReplies({ suggestions, onSelect }: QuickRepliesProps) {
  if (!suggestions.length) return null;

  return (
    <div className="quick-replies">
      {suggestions.map((s) => (
        <button key={s} onClick={() => onSelect(s)} className="quick-reply-btn">
          {s}
        </button>
      ))}
    </div>
  );
}

import { GreetingScreen } from './GreetingScreen';

interface ChatMessagesProps {
  suggestedActions?: string[];
  onSuggestionSelect?: (suggestion: string) => void;
  onRoomSelect?: (room: any) => void;
  onDateConfirm?: (checkIn: string, checkOut: string) => void;
  onGuestConfirm?: (guestInfo: any) => void;
  onBookingConfirm?: () => void;
}

export function ChatMessages({
  suggestedActions = [],
  onSuggestionSelect,
  onRoomSelect,
  onDateConfirm,
  onGuestConfirm,
  onBookingConfirm,
}: ChatMessagesProps) {
  const messages = useMessages();
  const isTyping = useIsTyping();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  if (messages.length === 0) {
    return (
      <div className="chat-messages" style={{ display: 'flex', flexDirection: 'column' }}>
        <GreetingScreen onActionSelect={onSuggestionSelect || (() => {})} />
      </div>
    );
  }

  return (
    <div className="chat-messages">
      <div className="chat-messages-inner">
        {messages.map((msg) => (
          <MessageBubble 
            key={msg.id} 
            message={msg} 
            onRoomSelect={onRoomSelect} 
            onDateConfirm={onDateConfirm}
            onGuestConfirm={onGuestConfirm}
            onBookingConfirm={onBookingConfirm}
          />
        ))}
        {isTyping && <TypingIndicator />}
        <div ref={endRef} />
      </div>

      {!isTyping && suggestedActions.length > 0 && onSuggestionSelect && (
        <div className="quick-replies-wrap">
          <QuickReplies suggestions={suggestedActions} onSelect={onSuggestionSelect} />
        </div>
      )}
    </div>
  );
}
