import { render } from 'preact';
import { ChatWidget } from './components/ChatWidget';
import { initAPI } from './services/api';
import { chatStore } from './stores/chatStore';
import type { WidgetConfig } from './types';
import './styles/widget.css';

declare global {
  interface Window {
    HotelAssistant: {
      init: (config: WidgetConfig) => HotelAssistantInstance;
      open: () => void;
      close: () => void;
      toggle: () => void;
      destroy: () => void;
    };
  }
}

interface HotelAssistantInstance {
  open: () => void;
  close: () => void;
  toggle: () => void;
  destroy: () => void;
}

let widgetInstance: HTMLElement | null = null;
let styleSheet: HTMLStyleElement | null = null;

const HotelAssistant = {
  init: (config: WidgetConfig): HotelAssistantInstance => {
    if (!config.hotelId) {
      console.error('[HotelAssistant] hotelId is required');
      throw new Error('hotelId is required');
    }

    // Remove existing widget if any
    if (widgetInstance) {
      widgetInstance.remove();
    }

    // Initialize API
    const apiUrl = config.apiUrl || 'http://localhost:3001/api/v1';
    initAPI(apiUrl, config.hotelId);

    // Create container
    const container = document.createElement('div');
    container.id = 'hotel-assistant-widget';
    document.body.appendChild(container);

    // Create shadow DOM for style isolation
    const shadow = container.attachShadow({ mode: 'open' });

    // Create and inject styles
    styleSheet = document.createElement('style');
    styleSheet.textContent = getWidgetStyles(config);
    shadow.appendChild(styleSheet);

    // Create app container
    const appContainer = document.createElement('div');
    appContainer.className = 'widget-container';
    shadow.appendChild(appContainer);

    // Render widget
    render(
      <ChatWidget
        config={{
          hotelId: config.hotelId,
          apiUrl,
          position: config.position || 'bottom-right',
          theme: config.theme,
          welcomeMessage: config.welcomeMessage,
        }}
      />,
      appContainer
    );

    widgetInstance = container;
    console.log('[HotelAssistant] Widget initialized for hotel:', config.hotelId);

    return {
      open: () => chatStore.openWidget(),
      close: () => chatStore.closeWidget(),
      toggle: () => chatStore.toggleWidget(),
      destroy: () => HotelAssistant.destroy(),
    };
  },

  open: () => {
    chatStore.openWidget();
  },

  close: () => {
    chatStore.closeWidget();
  },

  toggle: () => {
    chatStore.toggleWidget();
  },

  destroy: () => {
    if (widgetInstance) {
      widgetInstance.remove();
      widgetInstance = null;
      styleSheet = null;
      chatStore.reset();
      console.log('[HotelAssistant] Widget destroyed');
    }
  },
};

function getWidgetStyles(config: WidgetConfig): string {
  const theme = config.theme || {};
  const primaryColor = theme.primaryColor || '#2563eb';
  const primaryDark = adjustColor(primaryColor, -15);

  // Import the base CSS and override with theme colors
  return `
    /* CSS Variables */
    :host {
      --primary: ${primaryColor};
      --primary-dark: ${primaryDark};
      --primary-light: ${adjustColor(primaryColor, 15)};

      --gray-50: #f9fafb;
      --gray-100: #f3f4f6;
      --gray-200: #e5e7eb;
      --gray-300: #d1d5db;
      --gray-400: #9ca3af;
      --gray-500: #6b7280;
      --gray-600: #4b5563;
      --gray-700: #374151;
      --gray-800: #1f2937;
      --gray-900: #111827;

      --white: #ffffff;
      --red-500: #ef4444;
      --green-100: #dcfce7;
      --green-600: #16a34a;

      --font-family: ${theme.fontFamily || "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"};
      --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
      --shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    }

    /* Base reset */
    .widget-container *,
    .widget-container *::before,
    .widget-container *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    .widget-container {
      font-family: var(--font-family);
      font-size: 14px;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    /* Typography */
    .text-xs { font-size: 0.75rem; line-height: 1rem; }
    .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
    .text-base { font-size: 1rem; line-height: 1.5rem; }
    .text-lg { font-size: 1.125rem; line-height: 1.75rem; }
    .text-xl { font-size: 1.25rem; line-height: 1.75rem; }

    .font-medium { font-weight: 500; }
    .font-semibold { font-weight: 600; }
    .font-bold { font-weight: 700; }

    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .uppercase { text-transform: uppercase; }
    .tracking-wide { letter-spacing: 0.025em; }

    .text-white { color: var(--white); }
    .text-gray-400 { color: var(--gray-400); }
    .text-gray-500 { color: var(--gray-500); }
    .text-gray-600 { color: var(--gray-600); }
    .text-gray-700 { color: var(--gray-700); }
    .text-gray-800 { color: var(--gray-800); }
    .text-gray-900 { color: var(--gray-900); }
    .text-primary { color: var(--primary); }
    .text-red-500 { color: var(--red-500); }
    .text-green-600 { color: var(--green-600); }

    /* Backgrounds */
    .bg-white { background-color: var(--white); }
    .bg-gray-50 { background-color: var(--gray-50); }
    .bg-gray-100 { background-color: var(--gray-100); }
    .bg-primary { background-color: var(--primary); }
    .bg-primary-dark { background-color: var(--primary-dark); }
    .bg-primary\\/5 { background-color: rgba(37, 99, 235, 0.05); }
    .bg-primary\\/10 { background-color: rgba(37, 99, 235, 0.1); }
    .bg-white\\/10 { background-color: rgba(255, 255, 255, 0.1); }
    .bg-white\\/20 { background-color: rgba(255, 255, 255, 0.2); }
    .bg-white\\/80 { background-color: rgba(255, 255, 255, 0.8); }
    .bg-red-500 { background-color: var(--red-500); }
    .bg-green-100 { background-color: var(--green-100); }

    /* Borders */
    .border { border-width: 1px; border-style: solid; }
    .border-t { border-top-width: 1px; border-top-style: solid; }
    .border-gray-200 { border-color: var(--gray-200); }
    .border-gray-300 { border-color: var(--gray-300); }
    .border-primary { border-color: var(--primary); }
    .border-primary\\/20 { border-color: rgba(37, 99, 235, 0.2); }
    .border-red-500 { border-color: var(--red-500); }
    .border-transparent { border-color: transparent; }

    /* Border Radius */
    .rounded { border-radius: 0.25rem; }
    .rounded-md { border-radius: 0.375rem; }
    .rounded-lg { border-radius: 0.5rem; }
    .rounded-xl { border-radius: 0.75rem; }
    .rounded-2xl { border-radius: 1rem; }
    .rounded-full { border-radius: 9999px; }
    .rounded-t-xl { border-top-left-radius: 0.75rem; border-top-right-radius: 0.75rem; }
    .rounded-b-xl { border-bottom-left-radius: 0.75rem; border-bottom-right-radius: 0.75rem; }
    .rounded-br-md { border-bottom-right-radius: 0.375rem; }
    .rounded-bl-md { border-bottom-left-radius: 0.375rem; }

    /* Layout */
    .flex { display: flex; }
    .inline-flex { display: inline-flex; }
    .grid { display: grid; }
    .block { display: block; }

    .flex-col { flex-direction: column; }
    .flex-1 { flex: 1 1 0%; }
    .flex-shrink-0 { flex-shrink: 0; }
    .flex-wrap { flex-wrap: wrap; }

    .items-start { align-items: flex-start; }
    .items-center { align-items: center; }
    .items-end { align-items: flex-end; }
    .justify-start { justify-content: flex-start; }
    .justify-end { justify-content: flex-end; }
    .justify-center { justify-content: center; }
    .justify-between { justify-content: space-between; }

    .gap-1 { gap: 0.25rem; }
    .gap-2 { gap: 0.5rem; }
    .gap-3 { gap: 0.75rem; }

    .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }

    /* Spacing */
    .p-2 { padding: 0.5rem; }
    .p-2\\.5 { padding: 0.625rem; }
    .p-3 { padding: 0.75rem; }
    .p-4 { padding: 1rem; }
    .px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
    .px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
    .px-4 { padding-left: 1rem; padding-right: 1rem; }
    .px-6 { padding-left: 1.5rem; padding-right: 1.5rem; }
    .py-0\\.5 { padding-top: 0.125rem; padding-bottom: 0.125rem; }
    .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
    .py-1\\.5 { padding-top: 0.375rem; padding-bottom: 0.375rem; }
    .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
    .py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
    .py-4 { padding-top: 1rem; padding-bottom: 1rem; }
    .py-6 { padding-top: 1.5rem; padding-bottom: 1.5rem; }
    .py-8 { padding-top: 2rem; padding-bottom: 2rem; }
    .pt-2 { padding-top: 0.5rem; }
    .pr-10 { padding-right: 2.5rem; }

    .mb-1 { margin-bottom: 0.25rem; }
    .mb-2 { margin-bottom: 0.5rem; }
    .mb-3 { margin-bottom: 0.75rem; }
    .mb-4 { margin-bottom: 1rem; }
    .mt-1 { margin-top: 0.25rem; }
    .mt-2 { margin-top: 0.5rem; }
    .ml-2 { margin-left: 0.5rem; }
    .mx-auto { margin-left: auto; margin-right: auto; }

    /* Sizing */
    .w-2 { width: 0.5rem; }
    .w-3 { width: 0.75rem; }
    .w-4 { width: 1rem; }
    .w-5 { width: 1.25rem; }
    .w-6 { width: 1.5rem; }
    .w-8 { width: 2rem; }
    .w-14 { width: 3.5rem; }
    .w-16 { width: 4rem; }
    .w-20 { width: 5rem; }
    .w-full { width: 100%; }
    .w-\\[360px\\] { width: 360px; }

    .h-2 { height: 0.5rem; }
    .h-3 { height: 0.75rem; }
    .h-4 { height: 1rem; }
    .h-5 { height: 1.25rem; }
    .h-6 { height: 1.5rem; }
    .h-8 { height: 2rem; }
    .h-14 { height: 3.5rem; }
    .h-16 { height: 4rem; }
    .h-24 { height: 6rem; }
    .h-\\[500px\\] { height: 500px; }

    .max-w-\\[80\\%\\] { max-width: 80%; }
    .max-w-\\[calc\\(100vw-2rem\\)\\] { max-width: calc(100vw - 2rem); }
    .max-h-\\[120px\\] { max-height: 120px; }
    .max-h-\\[70vh\\] { max-height: 70vh; }
    .max-h-60 { max-height: 15rem; }

    /* Positioning */
    .relative { position: relative; }
    .absolute { position: absolute; }
    .fixed { position: fixed; }
    .inset-0 { top: 0; right: 0; bottom: 0; left: 0; }
    .bottom-4 { bottom: 1rem; }
    .bottom-16 { bottom: 4rem; }
    .left-0 { left: 0; }
    .right-0 { right: 0; }
    .left-4 { left: 1rem; }
    .right-4 { right: 1rem; }
    .-top-1 { top: -0.25rem; }
    .-right-1 { right: -0.25rem; }
    .z-10 { z-index: 10; }
    .z-\\[9999\\] { z-index: 9999; }

    /* Overflow */
    .overflow-hidden { overflow: hidden; }
    .overflow-y-auto { overflow-y: auto; }

    /* Object Fit */
    .object-cover { object-fit: cover; }

    /* Cursor */
    .cursor-pointer { cursor: pointer; }
    .cursor-not-allowed { cursor: not-allowed; }

    /* Visibility */
    .opacity-0 { opacity: 0; }
    .opacity-25 { opacity: 0.25; }
    .opacity-50 { opacity: 0.5; }
    .opacity-75 { opacity: 0.75; }
    .opacity-80 { opacity: 0.8; }
    .pointer-events-none { pointer-events: none; }
    .pointer-events-auto { pointer-events: auto; }

    /* Transforms */
    .scale-95 { transform: scale(0.95); }
    .scale-100 { transform: scale(1); }
    .rotate-180 { transform: rotate(180deg); }
    .origin-bottom { transform-origin: bottom; }

    /* Transitions */
    .transition-all {
      transition-property: all;
      transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
      transition-duration: 150ms;
    }
    .transition-colors {
      transition-property: color, background-color, border-color;
      transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
      transition-duration: 150ms;
    }
    .duration-200 { transition-duration: 200ms; }
    .duration-300 { transition-duration: 300ms; }

    /* Shadows */
    .shadow-lg { box-shadow: var(--shadow-lg); }
    .shadow-2xl { box-shadow: var(--shadow-2xl); }

    /* Ring/Focus */
    .ring-2 { box-shadow: 0 0 0 2px var(--primary); }
    .focus\\:outline-none:focus { outline: none; }
    .focus\\:ring-2:focus { box-shadow: 0 0 0 2px var(--primary); }
    .focus\\:border-transparent:focus { border-color: transparent; }
    .focus\\:ring-offset-2:focus { box-shadow: 0 0 0 2px var(--white), 0 0 0 4px var(--primary); }
    .focus\\:ring-primary:focus { box-shadow: 0 0 0 2px var(--primary); }
    .focus\\:ring-red-500:focus { box-shadow: 0 0 0 2px var(--red-500); }

    /* Hover States */
    .hover\\:bg-white\\/10:hover { background-color: rgba(255, 255, 255, 0.1); }
    .hover\\:bg-gray-100:hover { background-color: var(--gray-100); }
    .hover\\:bg-gray-200:hover { background-color: var(--gray-200); }
    .hover\\:bg-gray-50:hover { background-color: var(--gray-50); }
    .hover\\:bg-primary:hover { background-color: var(--primary); }
    .hover\\:bg-primary-dark:hover { background-color: var(--primary-dark); }
    .hover\\:text-white:hover { color: var(--white); }
    .hover\\:scale-105:hover { transform: scale(1.05); }
    .hover\\:border-primary\\/50:hover { border-color: rgba(37, 99, 235, 0.5); }

    /* Active States */
    .active\\:scale-95:active { transform: scale(0.95); }

    /* Disabled States */
    .disabled\\:opacity-50:disabled { opacity: 0.5; }
    .disabled\\:cursor-not-allowed:disabled { cursor: not-allowed; }

    /* Animations */
    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @keyframes bounce {
      0%, 100% {
        transform: translateY(-25%);
        animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
      }
      50% {
        transform: translateY(0);
        animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
      }
    }

    .animate-spin { animation: spin 1s linear infinite; }
    .animate-bounce { animation: bounce 1s infinite; }

    /* Text Handling */
    .whitespace-pre-wrap { white-space: pre-wrap; }
    .break-words { word-wrap: break-word; overflow-wrap: break-word; }
    .resize-none { resize: none; }

    .line-clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    /* Placeholder */
    .placeholder\\:text-gray-400::placeholder { color: var(--gray-400); }

    /* Space Utilities */
    .space-y-1 > * + * { margin-top: 0.25rem; }
    .space-y-2 > * + * { margin-top: 0.5rem; }
    .space-y-3 > * + * { margin-top: 0.75rem; }
    .space-y-4 > * + * { margin-top: 1rem; }

    /* Responsive */
    @media (min-width: 640px) {
      .sm\\:bottom-6 { bottom: 1.5rem; }
      .sm\\:left-6 { left: 1.5rem; }
      .sm\\:right-6 { right: 1.5rem; }
    }

    /* Widget Window */
    .widget-window {
      font-family: var(--font-family);
    }

    .widget-button {
      font-family: var(--font-family);
    }

    .chat-header {
      background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
    }

    /* Custom Scrollbar */
    .overflow-y-auto::-webkit-scrollbar {
      width: 6px;
    }

    .overflow-y-auto::-webkit-scrollbar-track {
      background: transparent;
    }

    .overflow-y-auto::-webkit-scrollbar-thumb {
      background-color: var(--gray-300);
      border-radius: 3px;
    }

    .overflow-y-auto::-webkit-scrollbar-thumb:hover {
      background-color: var(--gray-400);
    }

    /* Input Styles */
    input, textarea, select {
      font-family: inherit;
      font-size: inherit;
    }

    input:focus, textarea:focus, select:focus {
      outline: none;
    }

    /* Button Base */
    button {
      font-family: inherit;
      cursor: pointer;
      border: none;
      background: none;
    }

    button:disabled {
      cursor: not-allowed;
    }
  `;
}

function adjustColor(color: string, amount: number): string {
  const clamp = (num: number) => Math.min(255, Math.max(0, num));
  const hex = color.replace('#', '');
  const r = clamp(parseInt(hex.slice(0, 2), 16) + amount);
  const g = clamp(parseInt(hex.slice(2, 4), 16) + amount);
  const b = clamp(parseInt(hex.slice(4, 6), 16) + amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Auto-init if config is present
if (typeof window !== 'undefined') {
  window.HotelAssistant = HotelAssistant;

  // Check for auto-init script tag
  const script =
    document.currentScript || document.querySelector('script[data-hotel-id]');
  if (script) {
    const hotelId = script.getAttribute('data-hotel-id');
    const apiUrl = script.getAttribute('data-api-url');
    const position = script.getAttribute('data-position') as
      | 'bottom-right'
      | 'bottom-left';
    const primaryColor = script.getAttribute('data-primary-color');

    if (hotelId) {
      const initWidget = () => {
        HotelAssistant.init({
          hotelId,
          apiUrl: apiUrl || undefined,
          position: position || undefined,
          theme: primaryColor ? { primaryColor } : undefined,
        });
      };

      // Wait for DOM ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initWidget);
      } else {
        initWidget();
      }
    }
  }
}

export default HotelAssistant;
