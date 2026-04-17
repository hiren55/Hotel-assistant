// Room card and selection components
import { formatCurrency, cn } from '../../utils';
import type { Room } from '../../types';

interface RoomCardProps {
  room: Room;
  selected?: boolean;
  onSelect: (room: Room) => void;
}

export function RoomCard({ room, selected, onSelect }: RoomCardProps) {
  return (
    <div
      className={cn(
        'room-card',
        selected ? 'room-card--selected' : ''
      )}
      onClick={() => onSelect(room)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect(room)}
      aria-selected={selected}
    >
      {/* Large Hero Image */}
      <div className="room-card-img-wrap">
        {room.images?.[0] ? (
          <img
            src={room.images[0]}
            alt={room.name}
            className="room-card-img"
          />
        ) : (
          <div className="room-card-img-placeholder" />
        )}
        <div className="room-card-pill">AVAILABLE</div>
      </div>

      <div className="room-card-body">
        <h4 className="room-card-title">{room.name}</h4>
        
        {/* Subtle Map Pin + Description / Location */}
        <p className="room-card-location">
          <svg className="room-card-pin" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
          {room.type} • City View
        </p>

        {/* Bottom row: Price and Select */}
        <div className="room-card-bottom">
          <div className="room-card-price-wrap">
            <span className="room-card-price">{formatCurrency(room.basePrice)}</span>
            <span className="room-card-price-label"> /night</span>
          </div>
          <button 
            className="room-card-select-btn"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(room);
            }}
          >
            Select
          </button>
        </div>
      </div>
    </div>
  );
}

interface RoomSelectionProps {
  rooms: Room[];
  selectedRoomId?: string;
  onSelect: (room: Room) => void;
  isLoading?: boolean;
}

export function RoomSelection({
  rooms,
  selectedRoomId,
  onSelect,
}: RoomSelectionProps) {
  if (rooms.length === 0) {
    return null;
  }

  return (
    <div className="room-carousel-container">
      <div className="room-carousel">
        {rooms.map((room) => (
          <RoomCard
            key={room.id}
            room={room}
            selected={room.id === selectedRoomId}
            onSelect={onSelect}
          />
        ))}
      </div>
      
      {/* Decorative Pagination Dots */}
      {rooms.length > 1 && (
        <div className="room-carousel-dots">
          {rooms.map((_, i) => (
            <span key={i} className={`room-dot ${i === 0 ? 'active' : ''}`}></span>
          ))}
        </div>
      )}
    </div>
  );
}
