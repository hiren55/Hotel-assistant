// Booking confirmation components
import { Button } from '../common';
import { formatDate, formatCurrency, calculateNights } from '../../utils';
import type { Room, BookingState } from '../../types';

interface BookingSummaryProps {
  room: Room;
  bookingState: BookingState;
  onConfirm: () => void;
  onBack?: () => void;
  isLoading?: boolean;
}

export function BookingSummary({
  room,
  bookingState,
  onConfirm,
  onBack,
  isLoading,
}: BookingSummaryProps) {
  const nights =
    bookingState.checkIn && bookingState.checkOut
      ? calculateNights(bookingState.checkIn, bookingState.checkOut)
      : 0;
  const totalPrice = room.basePrice * nights;

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-900">Booking Summary</h3>

      {/* Room Info */}
      <div className="bg-gray-50 rounded-lg p-3">
        <div className="flex gap-3">
          {room.images?.[0] && (
            <img
              src={room.images[0]}
              alt={room.name}
              className="w-20 h-16 object-cover rounded"
            />
          )}
          <div className="flex-1">
            <h4 className="font-semibold text-sm">{room.name}</h4>
            <p className="text-xs text-gray-500">{room.type}</p>
            <p className="text-sm font-medium text-primary mt-1">
              {formatCurrency(room.basePrice)}/night
            </p>
          </div>
        </div>
      </div>

      {/* Dates */}
      <div className="border rounded-lg p-3 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Check-in</span>
          <span className="font-medium">
            {bookingState.checkIn ? formatDate(bookingState.checkIn) : '-'}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Check-out</span>
          <span className="font-medium">
            {bookingState.checkOut ? formatDate(bookingState.checkOut) : '-'}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Duration</span>
          <span className="font-medium">
            {nights} night{nights !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Guest Info */}
      <div className="border rounded-lg p-3 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Guest Name</span>
          <span className="font-medium">{bookingState.guestName || '-'}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Email</span>
          <span className="font-medium text-xs">
            {bookingState.guestEmail || '-'}
          </span>
        </div>
        {bookingState.guestPhone && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Phone</span>
            <span className="font-medium">{bookingState.guestPhone}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Guests</span>
          <span className="font-medium">
            {bookingState.adults || 1} Adult{(bookingState.adults || 1) > 1 ? 's' : ''}
            {bookingState.children
              ? `, ${bookingState.children} Child${bookingState.children > 1 ? 'ren' : ''}`
              : ''}
          </span>
        </div>
      </div>

      {/* Total */}
      <div className="bg-primary/5 rounded-lg p-3">
        <div className="flex justify-between items-center">
          <span className="font-semibold">Total Amount</span>
          <span className="text-xl font-bold text-primary">
            {formatCurrency(totalPrice)}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {formatCurrency(room.basePrice)} x {nights} nights
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {onBack && (
          <Button variant="outline" onClick={onBack} className="flex-1">
            Back
          </Button>
        )}
        <Button onClick={onConfirm} isLoading={isLoading} className="flex-1">
          Confirm Booking
        </Button>
      </div>

      <p className="text-xs text-gray-500 text-center">
        By confirming, you agree to the hotel's booking policies.
      </p>
    </div>
  );
}

interface BookingSuccessProps {
  confirmationNumber: string;
  onClose: () => void;
}

export function BookingSuccess({
  confirmationNumber,
  onClose,
}: BookingSuccessProps) {
  return (
    <div className="text-center py-6 space-y-4">
      <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
        <svg
          className="w-8 h-8 text-green-600"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900">
          Booking Confirmed!
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Your reservation has been successfully made.
        </p>
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <p className="text-xs text-gray-500 uppercase tracking-wide">
          Confirmation Number
        </p>
        <p className="text-xl font-bold text-primary mt-1">
          {confirmationNumber}
        </p>
      </div>

      <p className="text-sm text-gray-600">
        A confirmation email has been sent to your email address.
      </p>

      <Button onClick={onClose} fullWidth>
        Done
      </Button>
    </div>
  );
}
