import * as Joi from 'joi';

export const configValidationSchema = Joi.object({
  WALLET_ENCRYPTION_KEY: Joi.string().required(),
  SALT_ROUNDS: Joi.number().default(10),
});
