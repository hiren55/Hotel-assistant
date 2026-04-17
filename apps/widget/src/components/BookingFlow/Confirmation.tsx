// Booking confirmation components
import { formatCurrency, calculateNights } from '../../utils';
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
  
  const subtotal = room.basePrice * nights;
  const resortFees = subtotal * 0.097; // Match the ~9.7% from the image
  const totalPrice = subtotal + resortFees;

  const formatLongDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  return (
    <div className="booking-preview-flow">
      {/* Bot Header Message */}
      <div className="guest-header-bubble">
        <div className="guest-bot-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 8V4H8"></path>
            <rect x="2" y="8" width="20" height="12" rx="2"></rect>
            <circle cx="7" cy="13" r="1"></circle>
            <circle cx="17" cy="13" r="1"></circle>
            <path d="M7 17h10"></path>
          </svg>
        </div>
        <div className="guest-bubble-text">
          I've prepared a summary of your requested stay at the Silver Waves Resort & Spa Daman. Please review the details below before we finalize your reservation.
        </div>
      </div>

      {/* Luxury Preview Card */}
      <div className="preview-card">
        {/* Card Image Header */}
        <div className="preview-img-wrap">
          <img
            src={room.images?.[0] || 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80'}
            alt={room.name}
            className="preview-img"
          />
          <div className="pill-premium">PREMIUM SELECTION</div>
        </div>

        <div className="preview-body">
          <div className="preview-title-row">
            <h3 className="preview-room-name">{room.name}</h3>
            <p className="preview-hotel-name">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="mr-1 inline">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
              Azure Heights Resort & Spa
            </p>
          </div>

          <div className="date-cards-row">
            <div className="date-summary-card">
              <span className="date-card-label">CHECK-IN</span>
              <span className="date-card-value">{formatLongDate(bookingState.checkIn)}</span>
              <span className="date-card-sub">After 3:00 PM</span>
            </div>
            <div className="date-summary-card">
              <span className="date-card-label">CHECK-OUT</span>
              <span className="date-card-value">{formatLongDate(bookingState.checkOut)}</span>
              <span className="date-card-sub">Before 11:00 AM</span>
            </div>
          </div>

          <div className="guest-info-summary-card">
            <div className="flex flex-col">
              <span className="date-card-label">GUEST INFORMATION</span>
              <span className="date-card-value">
                {bookingState.adults || 1} Adult{(bookingState.adults || 1) > 1 ? 's' : ''}
                {bookingState.children ? `, ${bookingState.children} Child${bookingState.children > 1 ? 'ren' : ''}` : ''}
              </span>
            </div>
            <span className="guest-card-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </span>
          </div>

          <div className="preview-divider"></div>

          <div className="price-breakdown">
            <div className="price-row">
              <span className="price-desc">{formatCurrency(room.basePrice)} × {nights} nights</span>
              <span className="price-val">{formatCurrency(subtotal)}</span>
            </div>
            <div className="price-row">
              <span className="price-desc">Resort Fees & Taxes</span>
              <span className="price-val">{formatCurrency(resortFees)}</span>
            </div>
            <div className="total-row mt-4">
              <span className="total-label">Total Price</span>
              <span className="total-price-large">{formatCurrency(totalPrice)}</span>
            </div>
          </div>

          <div className="preview-actions">
            <button
              className="guest-confirm-btn"
              disabled={isLoading}
              onClick={onConfirm}
            >
              {isLoading ? 'Processing...' : 'Confirm Booking'}
            </button>
            <div className="flex gap-3 mt-3">
              <button className="btn-edit-details" onClick={onBack}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                Edit Details
              </button>
              <button className="btn-cancel-stay" onClick={onBack}>
                Cancel stay
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface BookingSuccessProps {
  confirmationNumber: string;
  onClose: () => void;
  property?: string;
  checkIn?: string;
}

export function BookingSuccess({
  confirmationNumber,
  onClose
}: BookingSuccessProps) {
  return (
    <div className="booking-confirmation-flow">
      {/* Success Card */}
      <div className="success-card">
        <div className="success-header">
          <div className="success-icon-wrap">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <h2 className="success-title">Booking Confirmed!</h2>
          <p className="booking-id-text">ID: #{confirmationNumber}</p>
        </div>

        {/* <div className="success-details-row">
          <div className="flex-1">
            <span className="detail-header">PROPERTY</span>
            <span className="well-value">{property}</span>
          </div>
          <div className="flex-1 border-l border-gray-100 pl-4">
            <span className="detail-header">CHECK-IN</span>
            <span className="well-value">{checkIn}</span>
          </div>
        </div> */}

        <div className="info-note-box">
          <span className="info-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
          </span>
          <p className="info-text">
            Check your WhatsApp and email for your receipt. Your digital key will be available 24h before arrival.
          </p>
        </div>
      </div>

      {/* Bot Follow-up - Matches standard luxury bot bubble */}
      <div className="guest-header-bubble" style={{ marginTop: '0.5rem' }}>
        <div className="guest-bot-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 8V4H8"></path>
            <rect x="2" y="8" width="20" height="12" rx="2"></rect>
            <circle cx="7" cy="13" r="1"></circle>
            <circle cx="17" cy="13" r="1"></circle>
            <path d="M7 17h10"></path>
          </svg>
        </div>
        <div className="guest-bubble-text">
          Anything else I can help you with today?
        </div>
      </div>

      {/* Suggestions below the bubble */}
      <div className="suggestion-pills-row" style={{ paddingLeft: '42px' }}>
        <button className="suggestion-pill" onClick={onClose}>Request Airport Pickup</button>
        <button className="suggestion-pill" onClick={onClose}>Local Dining Tips</button>
        <button className="suggestion-pill" onClick={onClose}>Add Breakfast</button>
      </div>
    </div>
  );
}
