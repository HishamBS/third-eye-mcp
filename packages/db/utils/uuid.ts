import { nanoid } from 'nanoid';

/**
 * UUID Generation Utility - SSOT for all entity ID generation
 * 
 * V1 Standard: ALL entities MUST use this function for ID generation
 * Uses nanoid for consistent UUID format across the entire system
 */
export function generateId(): string {
  return nanoid();
}

