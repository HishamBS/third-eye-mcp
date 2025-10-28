/**
 * Response Constants
 * 
 * Constants for API response formats
 */

import { freezeTokens, tokenValues } from './taxonomy';
import type { TokenLiteral } from './taxonomy';

/**
 * Response format types
 */
export const ResponseFormatType = freezeTokens({
  JSON_OBJECT: 'json_object',
} as const);

export type ResponseFormatType = TokenLiteral<typeof ResponseFormatType>;
export const ALL_RESPONSE_FORMAT_TYPES = tokenValues(ResponseFormatType);

/**
 * Type strings for runtime checks
 */
export const TypeString = freezeTokens({
  OBJECT: 'object',
  STRING: 'string',
  NUMBER: 'number',
  BOOLEAN: 'boolean',
} as const);

export type TypeString = TokenLiteral<typeof TypeString>;
export const ALL_TYPE_STRINGS = tokenValues(TypeString);

