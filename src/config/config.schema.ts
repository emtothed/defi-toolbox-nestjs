import * as Joi from 'joi';

export const configValidationSchema = Joi.object({
  // Database
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().default(5432),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_DATABASE: Joi.string().required(),

  // Environment
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),

  // Encryption & Security
  WALLET_ENCRYPTION_KEY: Joi.string()
    .length(64) // 32 bytes in hex = 64 characters
    .hex()
    .required(),
  SALT_ROUNDS: Joi.number().min(10).max(13).default(10),

  // Email Configuration
  SMTP_HOST: Joi.string().required(),
  SMTP_PORT: Joi.number().default(587),
  SMTP_USER: Joi.string().email().required(),
  SMTP_PASSWORD: Joi.string().required(),

  // Blockchain
  CHAIN_ID: Joi.number().valid(1, 11155111).default(1),
});
