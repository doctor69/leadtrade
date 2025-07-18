// Token Encryption Utility for Secure Storage
// This provides client-side encryption for sensitive data before storing in Supabase

/**
 * Simple encryption utility using Web Crypto API
 * Note: This is for basic obfuscation. For production, consider using server-side encryption
 * with proper key management (HSM, AWS KMS, etc.)
 */

const ENCRYPTION_ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;

/**
 * Generates a cryptographic key from a password using PBKDF2
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: ENCRYPTION_ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a string using AES-GCM
 */
export async function encryptToken(plaintext: string, userPassword: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);
    
    // Generate random salt and IV
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Derive key from user password
    const key = await deriveKey(userPassword, salt);
    
    // Encrypt the data
    const encrypted = await crypto.subtle.encrypt(
      {
        name: ENCRYPTION_ALGORITHM,
        iv: iv,
      },
      key,
      data
    );
    
    // Combine salt, iv, and encrypted data
    const result = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    result.set(salt, 0);
    result.set(iv, salt.length);
    result.set(new Uint8Array(encrypted), salt.length + iv.length);
    
    // Return as base64 string
    return btoa(String.fromCharCode(...result));
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt token');
  }
}

/**
 * Decrypts a string using AES-GCM
 */
export async function decryptToken(encryptedData: string, userPassword: string): Promise<string> {
  try {
    // Decode from base64
    const data = new Uint8Array(
      atob(encryptedData)
        .split('')
        .map(char => char.charCodeAt(0))
    );
    
    // Extract salt, iv, and encrypted data
    const salt = data.slice(0, 16);
    const iv = data.slice(16, 28);
    const encrypted = data.slice(28);
    
    // Derive key from user password
    const key = await deriveKey(userPassword, salt);
    
    // Decrypt the data
    const decrypted = await crypto.subtle.decrypt(
      {
        name: ENCRYPTION_ALGORITHM,
        iv: iv,
      },
      key,
      encrypted
    );
    
    // Convert back to string
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt token');
  }
}

/**
 * Generates a secure random password for encryption
 * This can be used as a fallback if user password is not available
 */
export function generateEncryptionKey(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
}

/**
 * Simple hash function for creating consistent keys from user data
 */
export async function hashUserData(userData: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(userData);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);
  return btoa(String.fromCharCode(...hashArray));
}

/**
 * Validates if a string is a valid encrypted token
 */
export function isValidEncryptedToken(token: string): boolean {
  try {
    // Check if it's valid base64
    const decoded = atob(token);
    // Check minimum length (salt + iv + some encrypted data)
    return decoded.length >= 32;
  } catch {
    return false;
  }
}