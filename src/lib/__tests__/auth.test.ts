import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkAuthStatus, handleAuthStateChange } from '../auth';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

// Mock window and localStorage globally
Object.defineProperty(globalThis, 'window', {
  value: {
    localStorage: localStorageMock,
  },
  writable: true,
});

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock Supabase
vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      refreshSession: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
    })),
  }
}));

describe('Authentication Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
  });

  describe('checkAuthStatus', () => {
    it('should return true when both tokens exist', () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'sb-access-token') return 'access-token';
        if (key === 'sb-refresh-token') return 'refresh-token';
        return null;
      });

      expect(checkAuthStatus()).toBe(true);
    });

    it('should return false when access token is missing', () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'sb-access-token') return null;
        if (key === 'sb-refresh-token') return 'refresh-token';
        return null;
      });

      expect(checkAuthStatus()).toBe(false);
    });

    it('should return false when refresh token is missing', () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'sb-access-token') return 'access-token';
        if (key === 'sb-refresh-token') return null;
        return null;
      });

      expect(checkAuthStatus()).toBe(false);
    });

    it('should return false when both tokens are missing', () => {
      localStorageMock.getItem.mockReturnValue(null);

      expect(checkAuthStatus()).toBe(false);
    });
  });

  describe('handleAuthStateChange', () => {
    it('should set up auth state change listener', async () => {
      const mockOnAuthStateChange = vi.fn();
      
      // Mock the supabase auth module
      const { supabase } = await import('../supabase');
      supabase.auth.onAuthStateChange = mockOnAuthStateChange;

      await handleAuthStateChange();

      expect(mockOnAuthStateChange).toHaveBeenCalledWith(expect.any(Function));
    });
  });
});