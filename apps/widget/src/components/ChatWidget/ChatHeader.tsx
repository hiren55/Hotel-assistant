// Chat header component
import { useBranding } from '../../stores/chatStore';

interface ChatHeaderProps {
  onClose: () => void;
  onMinimize?: () => void;
}

export function ChatHeader({ onClose, onMinimize }: ChatHeaderProps) {
  const branding = useBranding();

  return (
    <div className="chat-header flex items-center justify-between px-4 py-3 bg-primary text-white rounded-t-xl">
      <div className="flex items-center gap-3">
        {branding?.logo ? (
          <img
            src={branding.logo}
            alt={branding.hotelName}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm3.293 1.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L7.586 10 5.293 7.707a1 1 0 010-1.414zM11 12a1 1 0 100 2h3a1 1 0 100-2h-3z" />
            </svg>
          </div>
        )}
        <div>
          <h3 className="font-semibold text-sm">
            {branding?.hotelName || 'Hotel Assistant'}
          </h3>
          <p className="text-xs opacity-80">Online</p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {onMinimize && (
          <button
            onClick={onMinimize}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Minimize chat"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
        <button
          onClick={onClose}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          aria-label="Close chat"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
