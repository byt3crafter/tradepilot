import * as Joi from 'joi';

export const JoiValidationSchema = Joi.object({
  // Application
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(8080),
  APP_URL: Joi.string().uri().required(),
  FRONTEND_URL: Joi.string().required(),
  
  // Database
  DATABASE_URL: Joi.string().required(),
  
  // JWT
  JWT_ACCESS_SECRET: Joi.string().required(),
  JWT_REFRESH_SECRET: Joi.string().required(),
  ACCESS_TOKEN_TTL: Joi.string().default('15m'),
  REFRESH_TOKEN_TTL: Joi.string().default('3650d'), // 10 years for persistent sessions
  EMAIL_VERIFY_TOKEN_TTL: Joi.string().default('24h'),
  PASSWORD_RESET_TOKEN_TTL: Joi.string().default('1h'),
  
  // Mail
  EMAIL_FROM_NAME: Joi.string().default('tradePilot'),
  EMAIL_FROM: Joi.string().email().required(),
  SMTP_HOST: Joi.string().required(),
  SMTP_PORT: Joi.number().required(),
  SMTP_USER: Joi.string().allow(''),
  SMTP_PASS: Joi.string().allow(''),
  SMTP_SECURE: Joi.boolean().default(false),

  // Throttler
  THROTTLE_TTL: Joi.number().default(60000),
  THROTTLE_LIMIT: Joi.number().default(10),

  // AI
  API_KEY: Joi.string().required(),

  // Paddle Billing
  PADDLE_API_KEY: Joi.string().required(),
  PADDLE_CLIENT_SIDE_TOKEN: Joi.string().required(),
  PADDLE_WEBHOOK_SECRET: Joi.string().required(),
  PADDLE_PRICE_ID: Joi.string().required(),
  PADDLE_ENV: Joi.string().valid('sandbox', 'production').default('sandbox'),
});