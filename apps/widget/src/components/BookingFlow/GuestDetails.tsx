import { useState } from 'preact/hooks';
import { isValidEmail, isValidPhone } from '../../utils';

interface GuestInfo {
  name: string;
  email: string;
  phone: string;
  adults: number;
  children: number;
  travelingFrom: string;
  specialRequests: string;
}

interface GuestDetailsProps {
  initialValues?: Partial<GuestInfo>;
  onSubmit: (details: GuestInfo) => void;
  isLoading?: boolean;
}

export function GuestDetails({
  initialValues,
  onSubmit,
  isLoading,
}: GuestDetailsProps) {
  const [form, setForm] = useState<GuestInfo>({
    name: initialValues?.name || '',
    email: initialValues?.email || '',
    phone: initialValues?.phone || '',
    adults: initialValues?.adults || 1,
    children: initialValues?.children || 0,
    travelingFrom: (initialValues as any)?.travelingFrom || '',
    specialRequests: initialValues?.specialRequests || '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof GuestInfo, string>>>(
    {}
  );

  const updateField = <K extends keyof GuestInfo>(
    field: K,
    value: GuestInfo[K]
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof GuestInfo, string>> = {};

    if (!form.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (form.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!form.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!isValidEmail(form.email)) {
      newErrors.email = 'Invalid email address';
    }

    if (form.phone && !isValidPhone(form.phone)) {
      newErrors.phone = 'Invalid phone number';
    }

    if (form.adults < 1) {
      newErrors.adults = 'At least 1 adult required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      onSubmit(form);
    }
  };

  return (
    <div className="guest-details-flow">
      {/* Main Form Card */}
      <div className="guest-form-card">
        <div className="guest-form-header">
          <h2 className="guest-form-title">Stay Customization</h2>
          <p className="guest-form-subtitle">Please fill in the fields below to continue.</p>
        </div>

        <div className="guest-form-grid">
          {/* Name Field */}
          <div className="guest-input-group">
            <label className="guest-label">YOUR NAME</label>
            <div className={`guest-input-wrapper ${errors.name ? 'has-error' : ''}`}>
              <span className="guest-input-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </span>
              <input
                type="text"
                placeholder="e.g. Julianne Moore"
                value={form.name}
                onInput={(e) => updateField('name', (e.target as HTMLInputElement).value)}
                className="guest-input"
              />
            </div>
            {errors.name && <span className="field-error">{errors.name}</span>}
          </div>

          {/* Phone Field */}
          <div className="guest-input-group">
            <label className="guest-label">PHONE NUMBER</label>
            <div className={`guest-input-wrapper ${errors.phone ? 'has-error' : ''}`}>
              <span className="guest-input-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                </svg>
              </span>
              <input
                type="tel"
                placeholder="+1 (555) 000-0000"
                value={form.phone}
                onInput={(e) => updateField('phone', (e.target as HTMLInputElement).value)}
                className="guest-input"
              />
            </div>
          </div>

          {/* Email Field */}
          <div className="guest-input-group">
            <label className="guest-label">EMAIL</label>
            <div className={`guest-input-wrapper ${errors.email ? 'has-error' : ''}`}>
              <span className="guest-input-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
              </span>
              <input
                type="email"
                placeholder="julianne@example.com"
                value={form.email}
                onInput={(e) => updateField('email', (e.target as HTMLInputElement).value)}
                className="guest-input"
              />
            </div>
            {errors.email && <span className="field-error">{errors.email}</span>}
          </div>

          <div className="guest-form-row">
            {/* Guests Selection */}
            <div className="guest-input-group flex-1">
              <label className="guest-label">NUMBER OF GUESTS</label>
              <div className="guest-input-wrapper">
                <span className="guest-input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                </span>
                <select
                  value={form.adults}
                  onChange={(e) => updateField('adults', parseInt((e.target as HTMLSelectElement).value, 10))}
                  className="guest-input select-input"
                >
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={n}>
                      {n} Guest{n > 1 ? 's' : ''}
                    </option>
                  ))}
                </select>
                <span className="guest-select-arrow">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </span>
              </div>
            </div>

            {/* Traveling From */}
            <div className="guest-input-group flex-1">
              <label className="guest-label">TRAVELING FROM</label>
              <div className="guest-input-wrapper">
                <span className="guest-input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.3c.4-.2.6-.7.5-1.1z"></path>
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="City"
                  value={form.travelingFrom}
                  onInput={(e) => updateField('travelingFrom', (e.target as HTMLInputElement).value)}
                  className="guest-input"
                />
              </div>
            </div>
          </div>
        </div>

        <button
          className="guest-confirm-btn"
          disabled={isLoading}
          onClick={handleSubmit}
        >
          {isLoading ? 'Processing...' : 'Confirm Details'}
          {!isLoading && (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="ml-2">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          )}
        </button>
      </div>

      {/* Destination Preview */}
      <div className="destination-preview">
        <h4 className="destination-preview-label">Your Destination Awaits</h4>
        <div className="destination-card">
          <div className="destination-img-wrap">
            <img 
              src="https://images.unsplash.com/photo-1578683010236-d716f9a3f28d?w=800&q=80" 
              alt="Riviera Dream Suite" 
              className="destination-img" 
            />
            <div className="destination-gradient"></div>
            <div className="destination-content">
              <h3 className="destination-title">Riviera Dream Suite</h3>
              <p className="destination-subtitle">Concierge service active</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
