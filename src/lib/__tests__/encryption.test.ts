import { describe, it, expect } from 'vitest';
import { 
  encryptToken, 
  decryptToken, 
  generateEncryptionKey, 
  hashUserData, 
  isValidEncryptedToken 
} from '../encryption';

describe('Encryption Utilities', () => {
  const testPassword = 'test-password-123';
  const testData = 'sensitive-token-data';

  it('should encrypt and decrypt tokens correctly', async () => {
    const encrypted = await encryptToken(testData, testPassword);
    const decrypted = await decryptToken(encrypted, testPassword);
    
    expect(decrypted).toBe(testData);
  });

  it('should produce different encrypted values for same input', async () => {
    const encrypted1 = await encryptToken(testData, testPassword);
    const encrypted2 = await encryptToken(testData, testPassword);
    
    expect(encrypted1).not.toBe(encrypted2);
  });

  it('should fail to decrypt with wrong password', async () => {
    const encrypted = await encryptToken(testData, testPassword);
    
    await expect(decryptToken(encrypted, 'wrong-password')).rejects.toThrow();
  });

  it('should generate valid encryption keys', () => {
    const key1 = generateEncryptionKey();
    const key2 = generateEncryptionKey();
    
    expect(key1).toBeTruthy();
    expect(key2).toBeTruthy();
    expect(key1).not.toBe(key2);
    expect(key1.length).toBeGreaterThan(0);
  });

  it('should hash user data consistently', async () => {
    const userData = 'user@example.com';
    const hash1 = await hashUserData(userData);
    const hash2 = await hashUserData(userData);
    
    expect(hash1).toBe(hash2);
    expect(hash1).toBeTruthy();
  });

  it('should validate encrypted tokens', async () => {
    const encrypted = await encryptToken(testData, testPassword);
    
    expect(isValidEncryptedToken(encrypted)).toBe(true);
    expect(isValidEncryptedToken('invalid-token')).toBe(false);
    expect(isValidEncryptedToken('')).toBe(false);
  });

  it('should handle empty strings', async () => {
    const encrypted = await encryptToken('', testPassword);
    const decrypted = await decryptToken(encrypted, testPassword);
    
    expect(decrypted).toBe('');
  });

  it('should handle special characters', async () => {
    const specialData = 'token-with-special-chars!@#$%^&*()';
    const encrypted = await encryptToken(specialData, testPassword);
    const decrypted = await decryptToken(encrypted, testPassword);
    
    expect(decrypted).toBe(specialData);
  });
});