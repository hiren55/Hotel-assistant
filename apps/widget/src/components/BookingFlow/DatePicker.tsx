// Date selection component
import { useState } from 'preact/hooks';
import { Button, Input } from '../common';
import {
  formatDate,
  calculateNights,
  getTodayDate,
  getTomorrowDate,
} from '../../utils';

interface DateSelectionProps {
  checkIn?: string;
  checkOut?: string;
  onSelect: (checkIn: string, checkOut: string) => void;
  onConfirm: () => void;
  onBack?: () => void;
  isLoading?: boolean;
}

export function DateSelection({
  checkIn: initialCheckIn,
  checkOut: initialCheckOut,
  onSelect,
  onConfirm,
  onBack,
  isLoading,
}: DateSelectionProps) {
  const [checkIn, setCheckIn] = useState(initialCheckIn || getTodayDate());
  const [checkOut, setCheckOut] = useState(initialCheckOut || getTomorrowDate());
  const [error, setError] = useState<string | null>(null);

  const handleCheckInChange = (e: Event) => {
    const value = (e.target as HTMLInputElement).value;
    setCheckIn(value);
    setError(null);

    // Auto-adjust checkout if needed
    if (value >= checkOut) {
      const nextDay = new Date(value);
      nextDay.setDate(nextDay.getDate() + 1);
      const parts = nextDay.toISOString().split('T');
      const newCheckOut = parts[0] || '';
      setCheckOut(newCheckOut);
      onSelect(value, newCheckOut);
    } else {
      onSelect(value, checkOut);
    }
  };

  const handleCheckOutChange = (e: Event) => {
    const value = (e.target as HTMLInputElement).value;
    setCheckOut(value);
    setError(null);

    if (value <= checkIn) {
      setError('Check-out date must be after check-in date');
    } else {
      onSelect(checkIn, value);
    }
  };

  const nights = calculateNights(checkIn, checkOut);
  const isValid = checkIn && checkOut && checkOut > checkIn;

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-900">Select Dates</h3>

      <div className="grid grid-cols-2 gap-3">
        <Input
          type="date"
          label="Check-in"
          value={checkIn}
          min={getTodayDate()}
          onChange={handleCheckInChange}
        />
        <Input
          type="date"
          label="Check-out"
          value={checkOut}
          min={checkIn || getTodayDate()}
          onChange={handleCheckOutChange}
          error={error || undefined}
        />
      </div>

      {isValid && (
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">
              {formatDate(checkIn)} - {formatDate(checkOut)}
            </span>
            <span className="font-semibold text-gray-900">
              {nights} night{nights !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {onBack && (
          <Button variant="outline" onClick={onBack} className="flex-1">
            Back
          </Button>
        )}
        <Button
          onClick={onConfirm}
          disabled={!isValid}
          isLoading={isLoading}
          className="flex-1"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
