// Enhanced Token Encryption Utility for Secure Storage
// This provides client-side encryption for sensitive data before storing in Supabase

import { logger, LogCategory } from './logger';

const ENCRYPTION_ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const ITERATIONS = 100000;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

/**
 * Generate a secure encryption key
 */
async function generateKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
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
      salt,
      iterations: ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    {
      name: ENCRYPTION_ALGORITHM,
      length: KEY_LENGTH
    },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Generate a secure encryption key
 */
export function generateEncryptionKey(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Encrypt a token using AES-GCM with PBKDF2 key derivation
 */
export async function encryptToken(token: string, password: string): Promise<string> {
  try {
    if (!token || !password) {
      throw new Error('Token and password are required');
    }

    // Generate a random salt
    const salt = crypto.getRandomValues(new Uint8Array(16));
    
    // Derive key using PBKDF2
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    
    const derivedKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      key,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );

    // Generate IV
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt
    const encodedToken = new TextEncoder().encode(token);
    const encryptedData = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv
      },
      derivedKey,
      encodedToken
    );

    // Combine salt + iv + encrypted data
    const encryptedArray = new Uint8Array(salt.length + iv.length + encryptedData.byteLength);
    encryptedArray.set(salt, 0);
    encryptedArray.set(iv, salt.length);
    encryptedArray.set(new Uint8Array(encryptedData), salt.length + iv.length);

    // Convert to base64
    return btoa(String.fromCharCode(...encryptedArray));
  } catch (error) {
    logger.error(LogCategory.SYSTEM, `Encryption failed`, {
      error: error instanceof Error ? error : new Error('Unknown error')
    });
    throw error;
  }
}

/**
 * Decrypt a token using AES-GCM with PBKDF2 key derivation
 */
export async function decryptToken(ciphertext: string, password: string): Promise<string> {
  try {
    if (!ciphertext || !password) {
      throw new Error('Ciphertext and password are required');
    }

    // Convert from base64
    const encryptedArray = new Uint8Array(
      atob(ciphertext)
        .split('')
        .map(char => char.charCodeAt(0))
    );

    // Extract salt, iv and encrypted data
    const salt = encryptedArray.slice(0, 16);
    const iv = encryptedArray.slice(16, 28);
    const data = encryptedArray.slice(28);

    // Derive key using PBKDF2
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    
    const derivedKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      key,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );

    // Decrypt
    const decryptedData = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv
      },
      derivedKey,
      data
    );

    return new TextDecoder().decode(decryptedData);
  } catch (error) {
    logger.error(LogCategory.SYSTEM, `Decryption failed`, {
      error: error instanceof Error ? error : new Error('Unknown error')
    });
    throw error;
  }
}

/**
 * Hash user data using SHA-256
 */
export async function hashUserData(data: string): Promise<string> {
  try {
    if (!data) {
      throw new Error('Data is required for hashing');
    }

    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (error) {
    logger.error(LogCategory.SYSTEM, `Hashing failed`, {
      error: error instanceof Error ? error : new Error('Unknown error')
    });
    throw error;
  }
}

/**
 * Validate that a string is a valid encrypted token
 */
export function isValidEncryptedToken(token: string): boolean {
  try {
    if (!token) {
      return false;
    }

    // Try to decode base64
    const decoded = atob(token);
    
    // Check minimum length (16 bytes salt + 12 bytes IV + at least 1 byte data)
    if (decoded.length < 29) {
      return false;
    }

    return true;
  } catch (error) {
    logger.error(LogCategory.SYSTEM, `Token validation failed`, {
      error: error instanceof Error ? error : new Error('Unknown error')
    });
    return false;
  }
}

/**
 * Generate a secure random token for API keys
 */
export function generateSecureToken(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Secure token storage utilities
 */
export class SecureTokenStorage {
  private static readonly STORAGE_KEY_PREFIX = 'leadtrade_secure_';
  private static readonly TOKEN_KEY = 'alpaca_token';
  private static readonly REFRESH_KEY = 'alpaca_refresh';

  /**
   * Store encrypted token in localStorage
   */
  static async storeToken(token: string, refreshToken: string, userPassword: string): Promise<void> {
    try {
      const encryptedToken = await encryptToken(token, userPassword);
      const encryptedRefresh = await encryptToken(refreshToken, userPassword);
      
      localStorage.setItem(this.STORAGE_KEY_PREFIX + this.TOKEN_KEY, encryptedToken);
      localStorage.setItem(this.STORAGE_KEY_PREFIX + this.REFRESH_KEY, encryptedRefresh);
    } catch (error) {
      console.error('Failed to store encrypted tokens:', error);
      throw new Error('Failed to securely store tokens');
    }
  }

  /**
   * Retrieve and decrypt token from localStorage
   */
  static async getToken(userPassword: string): Promise<string | null> {
    try {
      const encryptedToken = localStorage.getItem(this.STORAGE_KEY_PREFIX + this.TOKEN_KEY);
      if (!encryptedToken) {
        return null;
      }
      
      return await decryptToken(encryptedToken, userPassword);
    } catch (error) {
      console.error('Failed to retrieve token:', error);
      return null;
    }
  }

  /**
   * Get refresh token from localStorage
   */
  static async getRefreshToken(userPassword: string): Promise<string | null> {
    try {
      const encryptedRefresh = localStorage.getItem(this.STORAGE_KEY_PREFIX + this.REFRESH_KEY);
      if (!encryptedRefresh) {
        return null;
      }
      
      return await decryptToken(encryptedRefresh, userPassword);
    } catch (error) {
      console.error('Failed to retrieve refresh token:', error);
      return null;
    }
  }

  /**
   * Clear stored tokens
   */
  static clearTokens(): void {
    localStorage.removeItem(this.STORAGE_KEY_PREFIX + this.TOKEN_KEY);
    localStorage.removeItem(this.STORAGE_KEY_PREFIX + this.REFRESH_KEY);
  }
}

/**
 * Security utilities for token validation
 */
export class TokenSecurity {
  /**
   * Validate token strength
   */
  static validateTokenStrength(token: string): { isValid: boolean; score: number; issues: string[] } {
    const issues: string[] = [];
    let score = 0;

    // Check length
    if (token.length < 32) {
      issues.push('Token too short (minimum 32 characters)');
    } else {
      score += 25;
    }

    // Check for mixed case
    if (/[a-z]/.test(token) && /[A-Z]/.test(token)) {
      score += 25;
    } else {
      issues.push('Token should contain both uppercase and lowercase characters');
    }

    // Check for numbers
    if (/\d/.test(token)) {
      score += 25;
    } else {
      issues.push('Token should contain numbers');
    }

    // Check for special characters
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(token)) {
      score += 25;
    } else {
      issues.push('Token should contain special characters');
    }

    return {
      isValid: score >= 75,
      score,
      issues
    };
  }

  /**
   * Sanitize token for logging (remove sensitive parts)
   */
  static sanitizeTokenForLogging(token: string): string {
    if (!token || token.length < 8) {
      return '[INVALID_TOKEN]';
    }
    
    return token.substring(0, 4) + '...' + token.substring(token.length - 4);
  }
}