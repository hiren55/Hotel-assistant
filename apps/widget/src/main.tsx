import { render } from 'preact';
import { ChatWidget } from './components/ChatWidget';
import { initAPI } from './services/api';
import { chatStore } from './stores/chatStore';
import type { WidgetConfig } from './types';

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
  const fontFamily = theme.fontFamily || "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif";

  return `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    button { cursor: pointer; border: none; background: none; font-family: inherit; }
    input, textarea { font-family: inherit; font-size: inherit; }
    input:focus, textarea:focus { outline: none; }
    button:disabled { cursor: not-allowed; }
    img { display: block; }

    /* ── Root Container ── */
    .widget-container {
      font-family: ${fontFamily};
      font-size: 14px;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }

    .widget-container-root {
      position: fixed;
      bottom: 24px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }

    /* ── Chat Window ── */
    .widget-window {
      position: absolute;
      bottom: 80px;
      width:500px;
      max-width: 95vw;
      height:800px;
      max-height: 95vh;
      background: #ffffff;
      border-radius: 24px;
      box-shadow: 0 24px 60px rgba(0,0,0,0.12), 0 8px 24px rgba(0,0,0,0.08);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transform-origin: bottom right;
      transform: scale(0.92) translateY(8px);
      opacity: 0;
      pointer-events: none;
      transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
                  opacity 0.25s ease;
    }

    .widget-window--open {
      transform: scale(1) translateY(0);
      opacity: 1;
      pointer-events: auto;
    }

    /* ── Loading Overlay ── */
    .widget-loading-overlay {
      position: absolute;
      inset: 0;
      background: rgba(255,255,255,0.85);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
      border-radius: 24px;
    }
    .widget-loading-spinner {
      width: 32px; height: 32px;
      border: 3px solid #e2e8f0;
      border-top-color: #0f172a;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Chat Header ── */
    .chat-header {
      display: flex;
      align-items: center;
      padding: 18px 20px;
      background: #ffffff;
      border-bottom: 1px solid #f1f5f9;
      flex-shrink: 0;
    }

    .chat-header-title {
      font-size: 18px;
      font-weight: 700;
      color: #1e3a8a;
      margin: 0;
      display: flex;
      flex-direction: column;
    }
    .chat-header-subtitle {
      font-size: 10px;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-top: 2px;
    }
    .chat-header-actions {
      display: flex;
      gap: 12px;
      align-items: center;
      margin-left: auto;
    }

    .chat-avatar-wrap {
      position: relative;
      flex-shrink: 0;
    }

    .chat-avatar-img {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid #f1f5f9;
    }

    .chat-avatar-dot {
      position: absolute;
      bottom: 1px;
      right: 1px;
      width: 11px;
      height: 11px;
      background: #22c55e;
      border-radius: 50%;
      border: 2px solid #ffffff;
    }

    .chat-close-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      color: #94a3b8;
      transition: background 0.15s, color 0.15s;
    }
    .chat-icon-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      transition: background 0.15s, color 0.15s;
      color: #64748b;
    }
    .chat-icon-btn:hover {
      background: #f1f5f9;
      color: #0f172a;
    }

    .chat-icon-btn svg {
      width: 20px;
      height: 20px;
    }

    /* ── Greeting Screen ── */
    .greeting-screen {
      padding: 16px;
      background: #fafafc;
      min-height: 100%;
      flex: 1;
    }

    .greeting-hero {
      position: relative;
      border-radius: 16px;
      overflow: hidden;
      margin-bottom: 20px;
      height: 140px;
    }
    
    .greeting-hero-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .greeting-hero-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(to bottom, rgba(0,0,0,0) 20%, rgba(15,23,42,0.9) 100%);
      padding: 16px;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
    }

    .greeting-hero-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 10px;
      font-weight: 700;
      color: #ffffff;
      letter-spacing: 0.05em;
      margin-bottom: 4px;
    }

    .greeting-hero-dot {
      width: 6px;
      height: 6px;
      background: #34d399;
      border-radius: 50%;
    }

    .greeting-hero-title {
      color: #ffffff;
      font-size: 18px;
      font-weight: 700;
    }

    .greeting-welcome-row {
      display: flex;
      gap: 12px;
      margin-bottom: 20px;
    }

    .greeting-bot-icon {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #1e293b;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .greeting-welcome-bubble {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      border-top-left-radius: 4px;
      padding: 14px 18px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.02);
    }
    
    .greeting-welcome-bubble p {
      font-size: 14px;
      color: #1e293b;
      line-height: 1.5;
      margin-bottom: 6px;
    }

    .greeting-welcome-time {
      font-size: 10px;
      color: #94a3b8;
    }

    .greeting-options-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 24px;
    }

    .greeting-option-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 16px;
      text-align: left;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
      transition: all 0.2s;
    }
    
    .greeting-option-card:hover {
      border-color: #cbd5e1;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    }

    .greeting-option-icon {
      width: 32px;
      height: 32px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .greeting-option-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .greeting-option-title {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
    }

    .greeting-option-subtitle {
      font-size: 12px;
      color: #64748b;
    }

    .greeting-common-requests {
      margin-bottom: 8px;
    }

    .greeting-common-title {
      font-size: 11px;
      font-weight: 700;
      color: #94a3b8;
      letter-spacing: 0.05em;
      margin-bottom: 12px;
      text-transform: uppercase;
    }

    .greeting-common-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .greeting-pill-btn {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      padding: 8px 14px;
      font-size: 13px;
      color: #475569;
      transition: all 0.2s;
    }
    
    .greeting-pill-btn:hover {
      background: #f8fafc;
      border-color: #cbd5e1;
      color: #0f172a;
    }

    /* ── Chat Navigation & Input Extras ── */
    .chat-bottom-nav {
      display: flex;
      align-items: center;
      justify-content: space-around;
      padding: 12px 16px;
      background: #ffffff;
      border-top: 1px solid #f1f5f9;
      flex-shrink: 0;
    }

    .chat-bottom-nav .nav-item {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      color: #94a3b8;
      border-radius: 12px;
      transition: all 0.2s;
    }

    .chat-bottom-nav .nav-item:hover {
      color: #64748b;
      background: #f8fafc;
    }

    .chat-bottom-nav .nav-item.active {
      color: #1e40af; /* Deeper blue for active icon */
      background: transparent;
    }

    .chat-plus-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      background: #94a3b8;
      color: #ffffff;
      border-radius: 50%;
      margin: 10px 0 10px 10px;
      flex-shrink: 0;
      transition: all 0.2s;
    }
    
    .chat-plus-btn:hover:not(:disabled) {
      background: #64748b;
    }

    /* ── Chat Messages ── */
    .chat-messages {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      background: #ffffff;
    }

    .chat-messages::-webkit-scrollbar { width: 4px; }
    .chat-messages::-webkit-scrollbar-track { background: transparent; }
    .chat-messages::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 4px; }

    .chat-messages-inner {
      flex: 1;
      padding: 20px 18px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    /* ── Message Rows ── */
    .msg-row {
      display: flex;
      align-items: flex-end;
      gap: 8px;
      margin-bottom: 16px;
      animation: fadeSlideIn 0.25s ease;
    }
    .msg-row--user {
      justify-content: flex-end;
    }
    .msg-row--bot {
      justify-content: flex-start;
    }

    @keyframes fadeSlideIn {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .msg-col {
      display: flex;
      flex-direction: column;
      max-width: 82%;
    }
    .msg-row--user .msg-col {
      align-items: flex-end;
    }
    .msg-row--bot .msg-col {
      align-items: flex-start;
    }

    /* ── Bubbles ── */
    .msg-bubble {
      max-width: 85%;
      padding: 12px 16px;
      font-size: 14px;
      line-height: 1.5;
      position: relative;
    }
    .msg-bubble--user {
      background: #1a2a47; /* Deeper navy */
      color: #ffffff;
      border-radius: 20px 20px 4px 20px;
      align-self: flex-end;
    }
    .msg-bubble--bot {
      background: #ffffff;
      color: #1e293b;
      border-radius: 4px 20px 20px 20px;
      align-self: flex-start;
      border: 1px solid #e2e8f0;
    }

    .msg-bubble--bot-luxury {
      background: #0c162d; 
      color: #ffffff;
      border-radius: 20px 20px 20px 4px;
      align-self: flex-start;
      box-shadow: 0 4px 12px rgba(12, 22, 45, 0.15);
      border: none;
    }

    .msg-bot-row {
      display: flex;
      gap: 10px;
      margin-bottom: 16px;
      align-items: flex-start;
    }

    .msg-bot-icon {
      width: 32px;
      height: 32px;
      background: #0f172a;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      color: #ffffff;
    }
    .msg-bot-icon svg {
      width: 18px;
      height: 18px;
    }

    .msg-user-row {
      display: flex;
      gap: 10px;
      margin-bottom: 16px;
      justify-content: flex-end;
      align-items: flex-start;
    }
    
    .msg-user-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      overflow: hidden;
      flex-shrink: 0;
    }
    .msg-user-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .msg-text { font-size: 14px; line-height: 1.65; }
    .msg-text a { color: #3b82f6; text-decoration: underline; }
    .msg-text img {
      margin-top: 10px;
      max-width: 100%;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
    }

    .msg-time {
      font-size: 10px;
      color: #94a3b8;
      font-weight: 600;
      letter-spacing: 0.05em;
      margin-top: 6px;
    }
    .msg-time--user { padding-right: 4px; }
    .msg-time--bot  { padding-left: 4px; }

    /* ── Typing indicator ── */
    .msg-typing {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 14px 18px;
      min-width: 60px;
    }

    .typing-dot {
      width: 7px;
      height: 7px;
      background: #94a3b8;
      border-radius: 50%;
      animation: typingBounce 1.4s ease-in-out infinite;
    }
    .typing-dot:nth-child(1) { animation-delay: 0s; }
    .typing-dot:nth-child(2) { animation-delay: 0.2s; }
    .typing-dot:nth-child(3) { animation-delay: 0.4s; }

    @keyframes typingBounce {
      0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
      30%            { transform: translateY(-6px); opacity: 1; }
    }

    /* ── Quick Replies ── */
    .quick-replies-wrap {
      padding: 0 18px 4px;
      background: linear-gradient(to bottom, transparent, #fff 40%);
    }

    .quick-replies {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      padding: 8px 0 12px;
    }

    .quick-reply-btn {
      padding: 8px 16px;
      border-radius: 20px;
      border: 1px solid #e2e8f0;
      background: #ffffff;
      color: #334155;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;
    }
    .quick-reply-btn:hover {
      background: #0f172a;
      color: #ffffff;
      border-color: #0f172a;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(15,23,42,0.15);
    }

    /* ── Chat Input ── */
    .chat-input-container {
      padding: 16px;
      background: #ffffff;
      border-top: 1px solid #f1f5f9;
      flex-shrink: 0;
    }

    .chat-input-wrapper {
      display: flex;
      align-items: center;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 28px;
      padding: 4px;
      transition: all 0.2s;
    }

    .chat-input-wrapper:focus-within {
      border-color: #94a3b8;
      background: #ffffff;
      box-shadow: 0 0 0 4px rgba(148, 163, 184, 0.1);
    }

    .chat-input-field {
      flex: 1;
      border: none;
      background: transparent;
      padding: 10px 16px;
      font-size: 14px;
      color: #1e293b;
      outline: none;
      resize: none;
      max-height: 120px;
      font-family: inherit;
    }

    .chat-send-btn {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #000a20;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      flex-shrink: 0;
    }

    .chat-send-btn:hover:not(:disabled) {
      transform: scale(1.05);
      background: #1a2a47;
    }

    .chat-send-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* ── Room Selection Carousel ── */
    .room-carousel-container {
      margin: 8px 0 16px;
      padding: 0 4px;
    }

    .room-carousel {
      display: flex;
      gap: 16px;
      overflow-x: auto;
      padding: 8px 16px 16px;
      scroll-snap-type: x mandatory;
      scrollbar-width: none; /* Hide scrollbar for Firefox */
    }

    .room-carousel::-webkit-scrollbar {
      display: none; /* Hide scrollbar for Chrome/Safari */
    }

    .room-card {
      flex: 0 0 280px;
      background: #ffffff;
      border-radius: 28px;
      overflow: hidden;
      scroll-snap-align: center;
      box-shadow: 0 20px 40px rgba(0,0,0,0.06);
      border: 1px solid #f1f5f9;
      transition: all 0.3s ease;
      cursor: pointer;
    }

    .room-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 25px 50px rgba(0,0,0,0.1);
      border-color: #cbd5e1;
    }

    .room-card--selected {
      border-color: #0f172a;
      box-shadow: 0 0 0 2px #0f172a;
    }

    .room-card-img-wrap {
      position: relative;
      height: 180px;
      width: 100%;
    }

    .room-card-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .room-card-img-placeholder {
      width: 100%;
      height: 100%;
      background: #f1f5f9;
    }

    .room-card-pill {
      position: absolute;
      top: 14px;
      right: 14px;
      background: #ffffff;
      color: #0f172a;
      padding: 5px 12px;
      border-radius: 20px;
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 0.08em;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .room-card-body {
      padding: 16px;
    }

    .room-card-title {
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 4px;
    }

    .room-card-location {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 13px;
      color: #64748b;
      margin-bottom: 16px;
    }

    .room-card-pin {
      width: 14px;
      height: 14px;
      color: #94a3b8;
    }

    .room-card-bottom {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 1px solid #f1f5f9;
      padding-top: 12px;
    }

    .room-card-price {
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
    }

    .room-card-price-label {
      font-size: 12px;
      color: #94a3b8;
    }

    .room-card-select-btn {
      background: #0f172a;
      color: #ffffff;
      padding: 8px 20px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
      transition: all 0.2s;
    }

    .room-card-select-btn:hover {
      background: #1e293b;
      transform: scale(1.05);
    }

    .room-carousel-dots {
      display: flex;
      justify-content: center;
      gap: 6px;
      margin-top: 4px;
    }

    .room-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #cbd5e1;
      transition: all 0.3s;
    }

    .room-dot.active {
      width: 18px;
      background: #0f172a;
      border-radius: 10px;
    }

    /* ── Date Selection Calendar ── */
    .calendar-container {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 28px;
      padding: 24px;
      margin: 12px 0;
      box-shadow: 0 4px 20px rgba(0,0,0,0.03);
    }

    .calendar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
    }

    .calendar-month {
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
    }

    .calendar-nav-btn {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: all 0.2s;
      color: #64748b;
    }

    .calendar-nav-btn:hover {
      background: #f1f5f9;
      color: #0f172a;
    }

    .calendar-weekdays {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      margin-bottom: 12px;
    }

    .calendar-weekday {
      text-align: center;
      font-size: 11px;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .calendar-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 2px;
    }

    .calendar-day {
      aspect-ratio: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 500;
      color: #334155;
      cursor: pointer;
      border-radius: 50%;
      transition: all 0.2s;
      position: relative;
      z-index: 1;
    }

    .calendar-day:hover:not(.calendar-day--disabled) {
      background: #f1f5f9;
    }

    .calendar-day--disabled {
      color: #e2e8f0;
      cursor: not-allowed;
    }

    .calendar-day--selected {
      background: #0f172a !important;
      color: #ffffff !important;
      font-weight: 700;
    }

    .calendar-day--in-range {
      background: #f1f5f9;
      border-radius: 0;
    }

    .calendar-day--range-start {
      border-top-right-radius: 0;
      border-bottom-right-radius: 0;
    }

    .calendar-day--range-end {
      border-top-left-radius: 0;
      border-bottom-left-radius: 0;
    }

    .calendar-divider {
      height: 1px;
      background: #f1f5f9;
      margin: 24px 0;
    }

    .calendar-summary {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 24px;
    }

    .calendar-info-label {
      font-size: 10px;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 4px;
    }

    .calendar-info-value {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
    }

    .calendar-confirm-btn {
      width: 100%;
      background: #7c3aed;
      color: #ffffff;
      padding: 14px;
      border-radius: 28px;
      font-size: 15px;
      font-weight: 700;
      transition: all 0.2s;
      box-shadow: 0 4px 12px rgba(124, 58, 237, 0.2);
    }

    .calendar-confirm-btn:hover:not(:disabled) {
      background: #6d28d9;
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(124, 58, 237, 0.3);
    }

    .calendar-confirm-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .chat-secured-label {
      text-align: center;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #94a3b8;
      margin-top: 10px;
      font-family: inherit;
    }

    /* ── Widget FAB Button ── */
    .widget-btn-wrap {
      position: relative;
      display: inline-flex;
    }

    .widget-fab {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: #0f172a;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 24px rgba(15,23,42,0.35), 0 2px 8px rgba(15,23,42,0.2);
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      position: relative;
    }
    .widget-fab:hover {
      transform: scale(1.08);
      background: #1e293b;
      box-shadow: 0 12px 32px rgba(15,23,42,0.4);
    }
    .widget-fab:active { transform: scale(0.94); }

    .widget-fab-icon {
      position: absolute;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: opacity 0.2s, transform 0.3s;
    }
    .widget-fab-icon--hidden {
      opacity: 0;
      pointer-events: none;
      transform: rotate(90deg) scale(0.6);
    }

    .widget-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      width: 20px;
      height: 20px;
      background: #22c55e;
      color: #fff;
      font-size: 10px;
      font-weight: 700;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid #fff;
    }

    /* ── Luxury Booking Flow ── */
    .flex-1 { flex: 1 1 0%; }
    .ml-2 { margin-left: 0.5rem; }

    .msg-bot-row .msg-col--full {
      max-width: calc(100% - 42px);
      flex: 1;
    }

    /* Guest Details Flow */
    .guest-details-flow {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      padding: 0.5rem 0;
      background-color: transparent;
      border-radius: 0;
      width: 100%;
    }
    .guest-form-card {
      background-color: white; padding: 1.5rem 1.25rem; border-radius: 1.75rem;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
      border: 1px solid #f1f5f9;
      width: 100%;
    }
    .guest-form-header { margin-bottom: 1.25rem; }
    .guest-form-title { font-size: 1.25rem; font-weight: 700; color: #0f172a; margin-bottom: 0.25rem; }
    .guest-form-subtitle { font-size: 0.8125rem; color: #64748b; }
    .guest-form-grid { display: flex; flex-direction: column; gap: 1rem; }
    .guest-input-group { display: flex; flex-direction: column; gap: 0.4rem; }
    .guest-label { font-size: 0.6875rem; font-weight: 700; color: #94a3b8; letter-spacing: 0.05em; padding-left: 0.25rem; }
    .guest-input-wrapper {
      display: flex; align-items: center; background-color: #f8fafc;
      border: 1px solid transparent; border-radius: 1rem; padding: 0 1.25rem;
      transition: all 0.2s ease; height: 3.5rem;
    }
    .guest-input-wrapper:focus-within { background-color: white; border-color: #2563eb; box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1); }
    .guest-input-wrapper.has-error { border-color: #ef4444; background-color: #fef2f2; }
    .guest-input-icon { color: #94a3b8; display: flex; align-items: center; justify-content: center; margin-right: 0.75rem; }
    .guest-input { flex: 1; background: none; border: none; font-size: 0.9375rem; color: #1e293b; width: 100%; }
    .guest-form-row { display: flex; gap: 0.75rem; }
    .select-input { appearance: none; cursor: pointer; }
    .guest-select-arrow { color: #94a3b8; display: flex; align-items: center; pointer-events: none; }
    .guest-confirm-btn {
      width: 100%; background-color: #0c162d; color: white;
      font-weight: 700; font-size: 1rem; padding: 1.125rem;
      border-radius: 1rem; margin-top: 1.5rem;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.2s ease; box-shadow: 0 4px 12px rgba(12, 22, 45, 0.2);
    }
    .guest-confirm-btn:hover:not(:disabled) { background-color: #1a2b4b; transform: translateY(-1px); box-shadow: 0 6px 16px rgba(12, 22, 45, 0.3); }
    .field-error { font-size: 0.75rem; color: #ef4444; padding-left: 0.5rem; }

    /* Destination Preview */
    .destination-preview { margin-top: 0.25rem; padding: 0 0.25rem; }
    .destination-preview-label { font-size: 0.8125rem; font-weight: 600; color: #64748b; margin-bottom: 0.75rem; }
    .destination-card { border-radius: 1.5rem; overflow: hidden; box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1); }
    .destination-img-wrap { position: relative; height: 11rem; width: 100%; }
    .destination-img { width: 100%; height: 100%; object-fit: cover; }
    .destination-gradient { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0, 0, 0, 0.7) 0%, transparent 60%); }
    .destination-content { position: absolute; bottom: 1.125rem; left: 1.125rem; color: white; }
    .destination-title { font-size: 1.125rem; font-weight: 700; margin-bottom: 0.125rem; }
    .destination-subtitle { font-size: 0.75rem; opacity: 0.9; }

    /* Booking Preview */
    .booking-preview-flow { display: flex; flex-direction: column; gap: 1rem; padding: 0.5rem 0; width: 100%; }
    .preview-card { background-color: white; border-radius: 1.75rem; overflow: hidden; box-shadow: 0 15px 35px rgba(0, 0, 0, 0.08); }
    .preview-img-wrap { position: relative; height: 14rem; width: 100%; }
    .preview-img { width: 100%; height: 100%; object-fit: cover; }
    .pill-premium {
      position: absolute; bottom: 1.125rem; left: 1.125rem;
      background: rgba(255, 255, 255, 0.9); color: #0f172a;
      padding: 6px 14px; border-radius: 10px; font-size: 10px;
      font-weight: 800; letter-spacing: 0.08em; backdrop-filter: blur(8px);
    }
    .preview-body { padding: 1.75rem; }
    .preview-title-row { margin-bottom: 1.5rem; }
    .preview-room-name { font-size: 1.5rem; font-weight: 700; color: #0f172a; margin-bottom: 0.25rem; }
    .preview-hotel-name { font-size: 0.8125rem; color: #64748b; display: flex; align-items: center; }
    .date-cards-row { display: flex; gap: 0.75rem; margin-bottom: 1rem; }
    .date-summary-card { flex: 1; background-color: #f0f4ff; padding: 1rem; border-radius: 1.25rem; display: flex; flex-direction: column; gap: 0.25rem; }
    .date-card-label { font-size: 0.625rem; font-weight: 800; color: #64748b; letter-spacing: 0.05em; }
    .date-card-value { font-size: 0.9375rem; font-weight: 700; color: #1e293b; }
    .date-card-sub { font-size: 0.75rem; color: #64748b; }
    .guest-info-summary-card { background-color: #f0f4ff; padding: 1rem 1.25rem; border-radius: 1.25rem; display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .preview-divider { border-top: 1px dashed #e2e8f0; margin: 1.5rem 0; }
    .price-breakdown { display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 2rem; }
    .price-row { display: flex; justify-content: space-between; font-size: 0.875rem; }
    .price-desc { color: #64748b; }
    .price-val { font-weight: 600; color: #1e293b; }
    .total-row { display: flex; justify-content: space-between; align-items: baseline; }
    .total-label { font-size: 1.125rem; font-weight: 700; color: #0f172a; }
    .total-price-large { font-size: 1.75rem; font-weight: 700; color: #7c3aed; }
    .btn-edit-details {
      background-color: #eef2ff; color: #1e293b; font-weight: 700;
      font-size: 0.875rem; padding: 0.875rem; border-radius: 1rem;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.2s ease; margin-bottom: 10px;
    }
    .btn-cancel-stay {
      background-color: white; color: #ef4444; border: 1px solid #fee2e2;
      font-weight: 700; font-size: 0.875rem; padding: 0.875rem;
      border-radius: 1rem; transition: all 0.2s ease;
    }

    /* Booking Confirmation Success */
    .booking-confirmation-flow { display: flex; flex-direction: column; gap: 1rem; padding: 0; width: 100%; }
    .success-card {
      background-color: #f8ffff; border-radius: 2rem; padding: 2.5rem 1.5rem;
      text-align: center; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.04);
      border: 1px solid #f0fdfa; margin-bottom: 1rem;
      width: 100%;
    }
    .success-icon-wrap {
      width: 4rem; height: 4rem; background-color: #0c162d;
      color: #5eead4; border-radius: 50%; display: flex;
      align-items: center; justify-content: center; margin: 0 auto 1.5rem;
      box-shadow: 0 8px 16px rgba(12, 22, 45, 0.2);
    }
    .success-title { font-size: 1.75rem; font-weight: 800; color: #0f172a; margin-bottom: 0.5rem; }
    .booking-id-text { font-size: 1.125rem; font-weight: 700; color: #0d9488; }
    .success-details-row {
      display: flex; background-color: white; padding: 1.5rem;
      border-radius: 1.5rem; margin-bottom: 2rem; text-align: left;
      border: 1px solid #f1f5f9;
    }
    .detail-header { display: block; font-size: 0.625rem; font-weight: 800; color: #94a3b8; letter-spacing: 0.05em; margin-bottom: 0.25rem; }
    .well-value { font-size: 1.125rem; font-weight: 700; color: #1e293b; }
    .info-note-box {
      background-color: #cbd5e1; padding: 1.5rem; border-radius: 1.5rem;
      display: flex; gap: 1rem; align-items: flex-start; text-align: left;
      opacity: 1;
    }
    .info-icon { color: #475569; flex-shrink: 0; margin-top: 0.125rem; }
    .info-text { font-size: 0.9375rem; color: #1e293b; line-height: 1.4; }
    .suggestion-pills-row { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-top: 0.5rem; }
    .suggestion-pill {
      background-color: white; border: 1px solid #e2e8f0; color: #1e293b;
      padding: 0.75rem 1.25rem; border-radius: 1.25rem; font-size: 0.875rem;
      font-weight: 600; transition: all 0.2s ease; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
    }
    .suggestion-pill:hover { background-color: #f8fafc; border-color: #cbd5e1; transform: translateY(-1px); }
  `;
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
