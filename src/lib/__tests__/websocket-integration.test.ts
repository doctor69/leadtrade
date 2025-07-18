// Integration test for WebSocket functionality
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { webSocketService, WebSocketService } from '../websocket-service';

// Mock dependencies
vi.mock('../supabase', () => ({
  supabase: {
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn((callback) => {
        callback('SUBSCRIBED');
        return {};
      }),
    })),
    removeChannel: vi.fn(),
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        })),
        order: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        })),
      })),
    })),
  },
}));

vi.mock('../auth', () => ({
  getAuthenticatedUser: vi.fn(() => Promise.resolve({
    id: 'test-user-id',
    email: 'test@example.com',
  })),
}));

describe('WebSocket Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize WebSocket service and handle notifications', async () => {
    // Initialize the service
    const initialized = await webSocketService.initialize();
    expect(initialized).toBe(true);
    expect(webSocketService.getConnectionStatus()).toBe(true);

    // Test notification sending
    const result = await WebSocketService.sendTradeNotification('user-123', {
      type: 'leader_trade',
      symbol: 'AAPL',
      side: 'buy',
      quantity: 100,
      price: 150.00,
      message: 'Test leader trade notification',
    });

    expect(result).toBe(true);
  });

  it('should handle follower notifications correctly', async () => {
    await webSocketService.initialize();

    // Test follower notification
    await WebSocketService.notifyFollowersOfLeaderTrade(
      'leader-123',
      'Test Leader',
      {
        symbol: 'TSLA',
        side: 'sell',
        quantity: 50,
        price: 240.50,
      }
    );

    // Should not throw errors
    expect(true).toBe(true);
  });

  it('should manage listeners correctly', async () => {
    await webSocketService.initialize();

    const mockListener = vi.fn();
    webSocketService.addListener('test-listener', mockListener);

    // Verify listener was added
    expect(webSocketService['listeners'].has('test-listener')).toBe(true);

    // Remove listener
    webSocketService.removeListener('test-listener');
    expect(webSocketService['listeners'].has('test-listener')).toBe(false);
  });

  it('should disconnect properly', async () => {
    await webSocketService.initialize();
    expect(webSocketService.getConnectionStatus()).toBe(true);

    webSocketService.disconnect();
    expect(webSocketService.getConnectionStatus()).toBe(false);
  });

  it('should handle static methods without initialization', async () => {
    // Test static methods work independently
    const count = await WebSocketService.getUnreadNotificationCount('user-123');
    expect(count).toBe(0);

    const notifications = await WebSocketService.getRecentNotifications('user-123');
    expect(notifications).toEqual([]);

    const marked = await WebSocketService.markNotificationAsRead('notification-123');
    expect(marked).toBe(true);
  });
});