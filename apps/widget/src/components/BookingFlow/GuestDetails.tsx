// Guest details form component
import { useState } from 'preact/hooks';
import { Button, Input, TextArea } from '../common';
import { isValidEmail, isValidPhone } from '../../utils';

interface GuestInfo {
  name: string;
  email: string;
  phone: string;
  adults: number;
  children: number;
  specialRequests: string;
}

interface GuestDetailsProps {
  initialValues?: Partial<GuestInfo>;
  onSubmit: (details: GuestInfo) => void;
  onBack?: () => void;
  isLoading?: boolean;
}

export function GuestDetails({
  initialValues,
  onSubmit,
  onBack,
  isLoading,
}: GuestDetailsProps) {
  const [form, setForm] = useState<GuestInfo>({
    name: initialValues?.name || '',
    email: initialValues?.email || '',
    phone: initialValues?.phone || '',
    adults: initialValues?.adults || 1,
    children: initialValues?.children || 0,
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
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-900">Guest Details</h3>

      <div className="space-y-3">
        <Input
          label="Full Name *"
          placeholder="John Doe"
          value={form.name}
          onInput={(e) =>
            updateField('name', (e.target as HTMLInputElement).value)
          }
          error={errors.name}
        />

        <Input
          type="email"
          label="Email Address *"
          placeholder="john@example.com"
          value={form.email}
          onInput={(e) =>
            updateField('email', (e.target as HTMLInputElement).value)
          }
          error={errors.email}
        />

        <Input
          type="tel"
          label="Phone Number"
          placeholder="+1 234 567 8900"
          value={form.phone}
          onInput={(e) =>
            updateField('phone', (e.target as HTMLInputElement).value)
          }
          error={errors.phone}
          helperText="Optional, but recommended for booking updates"
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Adults *
            </label>
            <select
              value={form.adults}
              onChange={(e) =>
                updateField('adults', parseInt((e.target as HTMLSelectElement).value, 10))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n} Adult{n > 1 ? 's' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Children
            </label>
            <select
              value={form.children}
              onChange={(e) =>
                updateField('children', parseInt((e.target as HTMLSelectElement).value, 10))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              {[0, 1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n} Child{n !== 1 ? 'ren' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <TextArea
          label="Special Requests"
          placeholder="Any special requests or requirements..."
          value={form.specialRequests}
          onInput={(e) =>
            updateField('specialRequests', (e.target as HTMLTextAreaElement).value)
          }
          rows={3}
        />
      </div>

      <div className="flex gap-2">
        {onBack && (
          <Button variant="outline" onClick={onBack} className="flex-1">
            Back
          </Button>
        )}
        <Button onClick={handleSubmit} isLoading={isLoading} className="flex-1">
          Review Booking
        </Button>
      </div>
    </div>
  );
}
