
import * as Joi from 'joi';

export const JoiValidationSchema = Joi.object({
  // Application
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(8080),
  APP_URL: Joi.string().allow('').optional(),
  FRONTEND_URL: Joi.string().allow('').optional(),

  // Database
  DATABASE_URL: Joi.string().required(),

  // Clerk Authentication
  CLERK_SECRET_KEY: Joi.string().optional(),
  CLERK_PUBLISHABLE_KEY: Joi.string().optional(),
  CLERK_ISSUER_URL: Joi.string().required(),

  // Legacy (Optional now)
  JWT_ACCESS_SECRET: Joi.string().optional().allow(''),
  JWT_REFRESH_SECRET: Joi.string().optional().allow(''),

  // AI
  API_KEY: Joi.string().required(),

  // Throttler (Rate Limiting)
  THROTTLE_TTL: Joi.number().default(60000), // 60 seconds
  THROTTLE_LIMIT: Joi.number().default(100), // 100 requests per minute

  // Paddle Billing
  PADDLE_API_KEY: Joi.string().required(),
  PADDLE_CLIENT_SIDE_TOKEN: Joi.string().required(),
  PADDLE_WEBHOOK_SECRET_KEY: Joi.string().required(),
  PADDLE_PRICE_ID: Joi.string().required(),
  PADDLE_ENV: Joi.string().valid('sandbox', 'production').default('sandbox'),

  // Feature Flags
  ANALYSIS_TRACKER_ENABLED: Joi.boolean().default(false),
}).unknown(true); // Allow other keys
