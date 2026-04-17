import { useState, useMemo } from 'preact/hooks';
import { cn } from '../../utils';

interface DateSelectionProps {
  onConfirm: (checkIn: string, checkOut: string) => void;
  isLoading?: boolean;
}

export function DateSelection({ onConfirm, isLoading }: DateSelectionProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const viewMonth = currentDate.getMonth();
  const viewYear = currentDate.getFullYear();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysInMonth = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay(); // 0 is Sunday
    // Adjust to start with Monday (1)
    const padding = firstDay === 0 ? 6 : firstDay - 1;
    const daysCount = new Date(viewYear, viewMonth + 1, 0).getDate();
    
    const days = [];
    // Padding from previous month
    for (let i = 0; i < padding; i++) {
      days.push(null);
    }
    // Days of current month
    for (let i = 1; i <= daysCount; i++) {
      days.push(new Date(viewYear, viewMonth, i));
    }
    return days;
  }, [viewYear, viewMonth]);

  const handleDayClick = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return;

    if (!startDate || (startDate && endDate)) {
      setStartDate(date);
      setEndDate(null);
    } else if (startDate && !endDate) {
      if (date < startDate) {
        setStartDate(date);
      } else if (date.getTime() === startDate.getTime()) {
        setStartDate(null);
      } else {
        setEndDate(date);
      }
    }
  };


  const isSelected = (date: Date) => {
    if (!date) return false;
    return (startDate && date.getTime() === startDate.getTime()) ||
           (endDate && date.getTime() === endDate.getTime());
  };

  const isInRange = (date: Date) => {
    if (!date || !startDate || !endDate) return false;
    return date > startDate && date < endDate;
  };

  const isDisabled = (date: Date) => {
    if (!date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'Select Date';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(viewYear, viewMonth + 1, 1));
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(viewYear, viewMonth - 1, 1));
  };

  const handleConfirm = () => {
    if (startDate && endDate) {
      const checkIn = startDate.toISOString().slice(0, 10);
      const checkOut = endDate.toISOString().slice(0, 10);
      onConfirm(checkIn, checkOut);
    }
  };

  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <button onClick={handlePrevMonth} className="calendar-nav-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <div className="calendar-month">
          {monthNames[viewMonth]} {viewYear}
        </div>
        <button onClick={handleNextMonth} className="calendar-nav-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      </div>

      <div className="calendar-weekdays">
        {['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'].map(day => (
          <div key={day} className="calendar-weekday">{day}</div>
        ))}
      </div>

      <div className="calendar-grid">
        {daysInMonth.map((date, i) => (
          <div
            key={i}
            className={cn(
              'calendar-day',
              date && isDisabled(date) && 'calendar-day--disabled',
              date && isSelected(date) && 'calendar-day--selected',
              date && isInRange(date) && 'calendar-day--in-range',
              date && startDate && date.getTime() === startDate.getTime() && endDate && 'calendar-day--range-start',
              date && endDate && date.getTime() === endDate.getTime() && 'calendar-day--range-end'
            )}
            onClick={() => date && handleDayClick(date)}
          >
            {date ? date.getDate() : ''}
          </div>
        ))}
      </div>

      <div className="calendar-divider" />

      <div className="calendar-summary">
        <div>
          <div className="calendar-info-label">Check-in</div>
          <div className="calendar-info-value">{formatDate(startDate)}</div>
        </div>
        <div>
          <div className="calendar-info-label">Check-out</div>
          <div className="calendar-info-value">{formatDate(endDate)}</div>
        </div>
      </div>

      <button
        className="calendar-confirm-btn"
        disabled={!startDate || !endDate || isLoading}
        onClick={handleConfirm}
      >
        {isLoading ? 'Processing...' : 'Confirm Dates'}
      </button>
    </div>
  );
}
