export default () => ({
  // Server
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Frontend URLs
  frontend: {
    adminUrl: process.env.ADMIN_URL || 'http://localhost:3000',
    widgetUrl: process.env.WIDGET_URL || 'http://localhost:3002',
  },

  // Database
  database: {
    url: process.env.DATABASE_URL,
  },

  // Supabase
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    jwtSecret: process.env.SUPABASE_JWT_SECRET,
  },

  // Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'development-secret-change-in-production',
    accessTokenExpiresIn: process.env.JWT_ACCESS_EXPIRES || '15m',
    refreshTokenExpiresIn: process.env.JWT_REFRESH_EXPIRES || '7d',
  },

  // AI Provider
  ai: {
    provider: process.env.AI_PROVIDER || 'openai',
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: process.env.ANTHROPIC_MODEL || 'claude-3-haiku-20240307',
    },
  },

  // Email
  email: {
    provider: process.env.EMAIL_PROVIDER || 'resend',
    resend: {
      apiKey: process.env.RESEND_API_KEY,
      webhookSecret: process.env.RESEND_WEBHOOK_SECRET,
    },
    from: process.env.EMAIL_FROM || 'noreply@hotelassistant.com',
    rateLimitPerMinute: parseInt(process.env.EMAIL_RATE_LIMIT_PER_MINUTE || '30', 10),
    rateLimitPerHour: parseInt(process.env.EMAIL_RATE_LIMIT_PER_HOUR || '500', 10),
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },

  // Security
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
    rateLimitTtl: parseInt(process.env.RATE_LIMIT_TTL || '60', 10),
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  },
});
