

interface GreetingScreenProps {
  onActionSelect: (action: string) => void;
}

export function GreetingScreen({ onActionSelect }: GreetingScreenProps) {
  const options = [
    {
      id: 'room_booking',
      title: 'Room Booking',
      subtitle: 'Reserve your stay',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" class="text-blue-500">
          <path d="M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7s-3 1.34-3 3 1.34 3 3 3zm12-6h-8v7H3V5H1v15h2v-3h18v3h2v-9c0-2.21-1.79-4-4-4z" />
        </svg>
      ),
      iconStyle: 'bg-blue-50',
    },
    {
      id: 'inquiry',
      title: 'Inquiry',
      subtitle: 'General questions',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" class="text-teal-500">
          <path d="M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z" />
        </svg>
      ),
      iconStyle: 'bg-teal-50',
    },
    {
      id: 'explore_hotel',
      title: 'Explore Hotel',
      subtitle: 'Discover amenities',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" class="text-purple-500">
          <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
        </svg>
      ),
      iconStyle: 'bg-purple-50',
    },
    {
      id: 'other',
      title: 'Other',
      subtitle: 'Speak with staff',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" class="text-gray-500">
          <path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
        </svg>
      ),
      iconStyle: 'bg-gray-100',
    },
  ];

  const commonRequests = ['Wifi Password', 'Checkout Time'];

  return (
    <div class="greeting-screen">
      {/* Hero Image Card */}
      <div class="greeting-hero">
        <img
          src="/bg.png"
          alt="Silver Waves Resort & Spa Daman"
          class="greeting-hero-img"
        />
        <div class="greeting-hero-overlay">
          <div class="greeting-hero-badge">
            <span class="greeting-hero-dot"></span> AI CONCIERGE ONLINE
          </div>
          <h2 class="greeting-hero-title">Silver Waves Resort & Spa Daman</h2>
        </div>
      </div>

      {/* Bot Welcome Message */}
      <div class="greeting-welcome-row">
        <div class="greeting-bot-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <path d="M20 9V7c0-1.1-.9-2-2-2h-3c0-1.66-1.34-3-3-3S9 3.34 9 5H6c-1.1 0-2 .9-2 2v2c-1.66 0-3 1.34-3 3s1.34 3 3 3v4c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4c1.66 0 3-1.34 3-3s-1.34-3-3-3z" />
          </svg>
        </div>
        <div class="greeting-welcome-bubble">
          <p>Hello! I'm your virtual assistant. How can I help you today?</p>
          <span class="greeting-welcome-time">Just now</span>
        </div>
      </div>

      {/* Options Grid */}
      <div class="greeting-options-grid">
        {options.map((opt) => (
          <button
            key={opt.id}
            class="greeting-option-card"
            onClick={() => onActionSelect(opt.title)}
          >
            <div class={`greeting-option-icon ${opt.iconStyle}`}>
              {opt.icon}
            </div>
            <div class="greeting-option-text">
              <h4 class="greeting-option-title">{opt.title}</h4>
              <p class="greeting-option-subtitle">{opt.subtitle}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Common Requests */}
      <div class="greeting-common-requests">
        <h4 class="greeting-common-title">COMMON REQUESTS</h4>
        <div class="greeting-common-pills">
          {commonRequests.map((req) => (
            <button
              key={req}
              class="greeting-pill-btn"
              onClick={() => onActionSelect(req)}
            >
              {req}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
