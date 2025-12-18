// Chat input component
import { useState, useRef, useEffect } from 'preact/hooks';
import { cn } from '../../utils';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = 'Type your message...',
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(
        inputRef.current.scrollHeight,
        120
      )}px`;
    }
  }, [message]);

  const handleSubmit = () => {
    const trimmedMessage = message.trim();
    if (trimmedMessage && !disabled) {
      onSend(trimmedMessage);
      setMessage('');
      // Reset height
      if (inputRef.current) {
        inputRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-gray-200 px-4 py-3 bg-white rounded-b-xl">
      <div className="flex items-end gap-2">
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={message}
            onInput={(e) => setMessage((e.target as HTMLTextAreaElement).value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className={cn(
              'w-full px-4 py-2 pr-10 border border-gray-300 rounded-2xl resize-none',
              'text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
              'placeholder:text-gray-400 max-h-[120px]',
              disabled && 'bg-gray-50 cursor-not-allowed'
            )}
            aria-label="Message input"
          />
        </div>
        <button
          onClick={handleSubmit}
          disabled={disabled || !message.trim()}
          className={cn(
            'p-2.5 rounded-full transition-colors flex-shrink-0',
            message.trim() && !disabled
              ? 'bg-primary text-white hover:bg-primary-dark'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          )}
          aria-label="Send message"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
          </svg>
        </button>
      </div>
      <p className="text-xs text-gray-400 mt-2 text-center">
        Press Enter to send, Shift+Enter for new line
      </p>
    </div>
  );
}
