import { afterEach, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { encryptForStorage, decryptFromStorage } from '../encryption';
import { reloadConfig } from '@third-eye/config';

const ORIGINAL_ENV = { ...process.env };

describe('Provider key encryption', () => {
  beforeAll(() => {
    process.env.THIRD_EYE_SECURITY_ENCRYPTION_KEY = 'a'.repeat(64);
    reloadConfig();
  });

  beforeEach(() => {
    // Ensure deterministic key for each test
    process.env.THIRD_EYE_SECURITY_ENCRYPTION_KEY = 'a'.repeat(64);
    reloadConfig();
  });

  afterEach(() => {
    if (ORIGINAL_ENV.THIRD_EYE_SECURITY_ENCRYPTION_KEY) {
      process.env.THIRD_EYE_SECURITY_ENCRYPTION_KEY = ORIGINAL_ENV.THIRD_EYE_SECURITY_ENCRYPTION_KEY;
    } else {
      delete process.env.THIRD_EYE_SECURITY_ENCRYPTION_KEY;
    }
    reloadConfig();
  });

  test('encrypts and decrypts provider keys with AES-GCM', () => {
    const plaintext = 'groq-secret-key-123';
    const encryptedBuffer = encryptForStorage(plaintext);

    expect(encryptedBuffer).toBeInstanceOf(Buffer);
    expect(encryptedBuffer.byteLength).toBeGreaterThan(plaintext.length);

    const decrypted = decryptFromStorage(encryptedBuffer);
    expect(decrypted).toBe(plaintext);
  });

  test('creates unique ciphertext for identical inputs', () => {
    const value = 'duplicate-key';
    const first = encryptForStorage(value);
    const second = encryptForStorage(value);

    expect(first.equals(second)).toBe(false);

    expect(decryptFromStorage(first)).toBe(value);
    expect(decryptFromStorage(second)).toBe(value);
  });
});
