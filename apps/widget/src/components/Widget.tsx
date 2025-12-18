import { useState, useEffect, useRef } from 'preact/hooks';
import { MessageCircle, X, Send, Loader2 } from './icons';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface WidgetProps {
  hotelId: string;
  apiUrl: string;
  position: 'bottom-right' | 'bottom-left';
  primaryColor: string;
}

export function Widget({ hotelId, apiUrl, position, primaryColor }: WidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Listen for external open/close events
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    const handleClose = () => setIsOpen(false);

    document.addEventListener('hotel-assistant:open', handleOpen);
    document.addEventListener('hotel-assistant:close', handleClose);

    return () => {
      document.removeEventListener('hotel-assistant:open', handleOpen);
      document.removeEventListener('hotel-assistant:close', handleClose);
    };
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Add welcome message on first open
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: "Hi! I'm your hotel assistant. How can I help you today? I can answer questions about our hotel, rooms, amenities, and help you make a booking.",
          timestamp: new Date(),
        },
      ]);
    }
  }, [isOpen, messages.length]);

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch(`${apiUrl}/api/v1/widget/${hotelId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          message: userMessage.content,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: data.data?.id || `msg_${Date.now()}`,
        role: 'assistant',
        content: data.data?.message || "I'm sorry, I couldn't process your request. Please try again.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      const errorMessage: Message = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please try again later or contact the hotel directly.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="widget-container">
      {/* Chat Window */}
      {isOpen && (
        <div
          className="widget-window"
          style={{
            position: 'absolute',
            bottom: '72px',
            [position === 'bottom-right' ? 'right' : 'left']: '0',
            width: '380px',
            height: '600px',
            maxHeight: 'calc(100vh - 100px)',
            backgroundColor: 'var(--widget-bg)',
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px',
              backgroundColor: primaryColor,
              color: 'white',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MessageCircle size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '16px' }}>Hotel Assistant</div>
                <div style={{ fontSize: '12px', opacity: 0.9 }}>We typically reply instantly</div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'white',
                padding: '4px',
              }}
            >
              <X size={24} />
            </button>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {messages.map((message) => (
              <div
                key={message.id}
                style={{
                  display: 'flex',
                  justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    maxWidth: '80%',
                    padding: '12px 16px',
                    borderRadius: '16px',
                    backgroundColor: message.role === 'user' ? primaryColor : '#f3f4f6',
                    color: message.role === 'user' ? 'white' : 'var(--widget-text)',
                    fontSize: '14px',
                    lineHeight: '1.5',
                  }}
                >
                  {message.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: '16px',
                    backgroundColor: '#f3f4f6',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <Loader2 size={16} className="animate-spin" />
                  <span style={{ fontSize: '14px', color: 'var(--widget-text-secondary)' }}>
                    Typing...
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div
            style={{
              padding: '16px',
              borderTop: '1px solid var(--widget-border)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#f3f4f6',
                borderRadius: '24px',
                padding: '8px 16px',
              }}
            >
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue((e.target as HTMLInputElement).value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                style={{
                  flex: 1,
                  border: 'none',
                  background: 'none',
                  outline: 'none',
                  fontSize: '14px',
                  color: 'var(--widget-text)',
                }}
              />
              <button
                onClick={sendMessage}
                disabled={!inputValue.trim() || isLoading}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: inputValue.trim() && !isLoading ? 'pointer' : 'not-allowed',
                  color: inputValue.trim() && !isLoading ? primaryColor : '#9ca3af',
                  padding: '4px',
                }}
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: primaryColor,
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        onMouseOver={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)';
        }}
        onMouseOut={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
        }}
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>
    </div>
  );
}
