import { vi, describe, it, expect, beforeEach } from 'vitest';
import { encryptToken, decryptToken, hashUserData, isValidEncryptedToken } from '../encryption';

describe('Encryption Utilities', () => {
  const testData = 'test-data';
  const testPassword = 'test-password';

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

  it('should generate valid encryption keys', async () => {
    const encrypted = await encryptToken(testData, testPassword);
    expect(isValidEncryptedToken(encrypted)).toBe(true);
  });

  it('should hash user data consistently', async () => {
    const hash1 = await hashUserData(testData);
    const hash2 = await hashUserData(testData);

    expect(hash1).toBe(hash2);
  });

  it('should validate encrypted tokens', () => {
    expect(isValidEncryptedToken('invalid-token')).toBe(false);
    expect(isValidEncryptedToken('')).toBe(false);
  });

  it('should handle empty strings', async () => {
    await expect(encryptToken('', testPassword)).rejects.toThrow('Token and password are required');
    await expect(encryptToken(testData, '')).rejects.toThrow('Token and password are required');
    await expect(decryptToken('', testPassword)).rejects.toThrow('Ciphertext and password are required');
    await expect(decryptToken(testData, '')).rejects.toThrow('Ciphertext and password are required');
    await expect(hashUserData('')).rejects.toThrow('Data is required for hashing');
  });

  it('should handle special characters', async () => {
    const specialData = '!@#$%^&*()_+{}[]|\\:;"\'<>,.?/~`';
    const encrypted = await encryptToken(specialData, testPassword);
    const decrypted = await decryptToken(encrypted, testPassword);

    expect(decrypted).toBe(specialData);
  });
});