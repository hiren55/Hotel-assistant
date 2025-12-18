// Room card and selection components
import { Button } from '../common';
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
        'border rounded-lg p-3 cursor-pointer transition-all',
        selected
          ? 'border-primary bg-primary/5 ring-2 ring-primary'
          : 'border-gray-200 hover:border-primary/50'
      )}
      onClick={() => onSelect(room)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect(room)}
      aria-selected={selected}
    >
      {/* Room Image */}
      {room.images?.[0] && (
        <img
          src={room.images[0]}
          alt={room.name}
          className="w-full h-24 object-cover rounded-md mb-2"
        />
      )}

      <div className="space-y-1">
        <div className="flex justify-between items-start">
          <div>
            <h4 className="font-semibold text-sm text-gray-900">{room.name}</h4>
            <p className="text-xs text-gray-500">{room.type}</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-primary">
              {formatCurrency(room.basePrice)}
            </p>
            <p className="text-xs text-gray-500">per night</p>
          </div>
        </div>

        <p className="text-xs text-gray-600 line-clamp-2">{room.description}</p>

        {/* Amenities */}
        {room.amenities?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {room.amenities.slice(0, 3).map((amenity) => (
              <span
                key={amenity}
                className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded"
              >
                {amenity}
              </span>
            ))}
            {room.amenities.length > 3 && (
              <span className="text-xs text-gray-500">
                +{room.amenities.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Capacity */}
        <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
          </svg>
          Up to {room.maxOccupancy} guests
        </p>
      </div>

      {selected && (
        <div className="mt-2 pt-2 border-t border-primary/20">
          <p className="text-xs text-primary font-medium flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Selected
          </p>
        </div>
      )}
    </div>
  );
}

interface RoomSelectionProps {
  rooms: Room[];
  selectedRoomId?: string;
  onSelect: (room: Room) => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function RoomSelection({
  rooms,
  selectedRoomId,
  onSelect,
  onConfirm,
  isLoading,
}: RoomSelectionProps) {
  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-gray-900">Select a Room</h3>

      {rooms.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">
          No rooms available for selected dates
        </p>
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {rooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              selected={room.id === selectedRoomId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}

      {selectedRoom && (
        <Button onClick={onConfirm} fullWidth isLoading={isLoading}>
          Continue with {selectedRoom.name}
        </Button>
      )}
    </div>
  );
}
