export interface EncryptedData {
    encrypted: Buffer;
    iv: Buffer;
    salt: Buffer;
    tag: Buffer;
}
/**
 * Encrypt sensitive data (API keys, tokens, etc.)
 */
export declare function encrypt(plaintext: string): EncryptedData;
/**
 * Decrypt sensitive data
 */
export declare function decrypt(data: EncryptedData): string;
/**
 * Serialize encrypted data to single buffer for database storage
 */
export declare function serializeEncrypted(data: EncryptedData): Buffer;
/**
 * Deserialize encrypted data from database buffer
 */
export declare function deserializeEncrypted(buffer: Buffer): EncryptedData;
/**
 * Encrypt string and return serialized buffer for database storage
 */
export declare function encryptForStorage(plaintext: string): Buffer;
/**
 * Decrypt from database buffer to string
 */
export declare function decryptFromStorage(buffer: Buffer): string;
/**
 * Test encryption/decryption roundtrip
 */
export declare function testEncryption(): boolean;
/**
 * Utility to safely validate encryption key strength
 */
export declare function validateEncryptionKey(key: string): {
    valid: boolean;
    issues: string[];
};
/**
 * Rotate passphrase file as specified in prompt.md
 * Generates new passphrase and updates the file
 */
export declare function rotatePassphrase(): string;
/**
 * Get passphrase file path for external utilities
 */
export declare function getPassphraseFile(): string;
//# sourceMappingURL=encryption.d.ts.map