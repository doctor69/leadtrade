// Tests for WebSocket Service - Real-time Trade Notifications
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebSocketService, webSocketService } from '../websocket-service';

// Mock Supabase
vi.mock('../supabase', () => {
  const mockChannel = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn(),
  };

  const mockSupabase = {
    channel: vi.fn(() => mockChannel),
    removeChannel: vi.fn(),
    from: vi.fn(),
  };

  return { supabase: mockSupabase };
});

// Mock auth
vi.mock('../auth', () => ({
  getAuthenticatedUser: vi.fn(() => Promise.resolve({
    id: 'test-user-id',
    email: 'test@example.com',
  })),
}));

describe('WebSocketService', () => {
  let mockSupabase: any;
  let mockChannel: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Get the mocked supabase instance
    const { supabase } = await import('../supabase');
    mockSupabase = supabase as any;
    
    // Setup mock channel
    mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn((callback) => {
        callback('SUBSCRIBED');
        return mockChannel;
      }),
    };
    
    mockSupabase.channel.mockReturnValue(mockChannel);
  });

  afterEach(() => {
    webSocketService.disconnect();
  });

  describe('initialization', () => {
    it('should initialize WebSocket service successfully', async () => {
      const result = await webSocketService.initialize();
      
      expect(result).toBe(true);
      expect(mockSupabase.channel).toHaveBeenCalledWith('trade_notifications_test-user-id');
      expect(mockChannel.on).toHaveBeenCalledTimes(2); // Two event listeners
      expect(mockChannel.subscribe).toHaveBeenCalled();
    });

    it('should handle initialization failure gracefully', async () => {
      mockChannel.subscribe.mockImplementation((callback) => {
        callback('CHANNEL_ERROR');
        return mockChannel;
      });

      const result = await webSocketService.initialize();
      
      expect(result).toBe(true); // Still returns true but sets isConnected to false
      expect(webSocketService.getConnectionStatus()).toBe(false);
    });
  });

  describe('notification handling', () => {
    it('should handle trade notifications correctly', async () => {
      await webSocketService.initialize();
      
      const mockNotification = {
        id: 'test-notification-id',
        user_id: 'test-user-id',
        data: {
          type: 'leader_trade',
          leaderId: 'leader-id',
          leaderName: 'Test Leader',
          symbol: 'AAPL',
          side: 'buy',
          quantity: 100,
          price: 150.00,
          message: 'Test Leader executed a buy order for 100 shares of AAPL at $150.00.',
        },
        created_at: new Date().toISOString(),
        read: false,
      };

      const listener = vi.fn();
      webSocketService.addListener('test-listener', listener);

      // Simulate receiving a notification
      const onCall = mockChannel.on.mock.calls.find(call => 
        call[0] === 'postgres_changes' && 
        call[1].table === 'trade_notifications'
      );
      
      if (onCall) {
        const handler = onCall[2];
        handler({ new: mockNotification });
      }

      expect(listener).toHaveBeenCalledWith({
        id: mockNotification.id,
        userId: mockNotification.user_id,
        data: mockNotification.data,
        timestamp: mockNotification.created_at,
        read: mockNotification.read,
      });
    });

    it('should handle copied trade updates correctly', async () => {
      await webSocketService.initialize();
      
      const mockCopiedTrade = {
        id: 'copied-trade-id',
        follower_id: 'test-user-id',
        symbol: 'TSLA',
        side: 'sell',
        quantity: 50,
        execution_status: 'filled',
        executed_at: new Date().toISOString(),
      };

      const listener = vi.fn();
      webSocketService.addListener('test-listener', listener);

      // Simulate receiving a copied trade update
      const onCall = mockChannel.on.mock.calls.find(call => 
        call[0] === 'postgres_changes' && 
        call[1].table === 'copied_trades'
      );
      
      if (onCall) {
        const handler = onCall[2];
        handler({ new: mockCopiedTrade });
      }

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'copied_trade_copied-trade-id',
          userId: 'test-user-id',
          data: expect.objectContaining({
            type: 'copied_trade',
            symbol: 'TSLA',
            side: 'sell',
            quantity: 50,
            executionStatus: 'filled',
          }),
        })
      );
    });
  });

  describe('listener management', () => {
    it('should add and remove listeners correctly', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      webSocketService.addListener('listener1', listener1);
      webSocketService.addListener('listener2', listener2);

      expect(webSocketService['listeners'].size).toBe(2);

      webSocketService.removeListener('listener1');
      expect(webSocketService['listeners'].size).toBe(1);
      expect(webSocketService['listeners'].has('listener2')).toBe(true);
    });

    it('should handle listener errors gracefully', async () => {
      await webSocketService.initialize();
      
      const errorListener = vi.fn(() => {
        throw new Error('Listener error');
      });
      const normalListener = vi.fn();

      webSocketService.addListener('error-listener', errorListener);
      webSocketService.addListener('normal-listener', normalListener);

      const mockNotification = {
        id: 'test-id',
        user_id: 'test-user-id',
        data: { type: 'leader_trade', symbol: 'AAPL', side: 'buy', quantity: 100, message: 'Test' },
        created_at: new Date().toISOString(),
        read: false,
      };

      // Simulate notification
      const onCall = mockChannel.on.mock.calls.find(call => 
        call[0] === 'postgres_changes' && 
        call[1].table === 'trade_notifications'
      );
      
      if (onCall) {
        const handler = onCall[2];
        handler({ new: mockNotification });
      }

      // Both listeners should be called despite error in one
      expect(errorListener).toHaveBeenCalled();
      expect(normalListener).toHaveBeenCalled();
    });
  });

  describe('static methods', () => {
    beforeEach(() => {
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: null }),
        update: vi.fn().mockResolvedValue({ error: null }),
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
        count: 0,
      });
    });

    it('should send trade notification successfully', async () => {
      const insertMock = vi.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({ insert: insertMock });

      const result = await WebSocketService.sendTradeNotification('user-id', {
        type: 'leader_trade',
        symbol: 'AAPL',
        side: 'buy',
        quantity: 100,
        message: 'Test notification',
      });

      expect(result).toBe(true);
      expect(insertMock).toHaveBeenCalledWith({
        user_id: 'user-id',
        data: {
          type: 'leader_trade',
          symbol: 'AAPL',
          side: 'buy',
          quantity: 100,
          message: 'Test notification',
        },
        read: false,
      });
    });

    it('should handle notification send failure', async () => {
      const insertMock = vi.fn().mockResolvedValue({ error: new Error('Database error') });
      mockSupabase.from.mockReturnValue({ insert: insertMock });

      const result = await WebSocketService.sendTradeNotification('user-id', {
        type: 'leader_trade',
        symbol: 'AAPL',
        side: 'buy',
        quantity: 100,
        message: 'Test notification',
      });

      expect(result).toBe(false);
    });

    it('should mark notification as read', async () => {
      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });
      mockSupabase.from.mockReturnValue({
        update: updateMock,
      });

      const result = await WebSocketService.markNotificationAsRead('notification-id');

      expect(result).toBe(true);
      expect(updateMock).toHaveBeenCalledWith({ read: true });
    });

    it('should get unread notification count', async () => {
      const selectMock = {
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ count: 5, error: null }),
        }),
      };
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue(selectMock),
      });

      const count = await WebSocketService.getUnreadNotificationCount('user-id');

      expect(count).toBe(5);
    });
  });

  describe('connection management', () => {
    it('should disconnect properly', async () => {
      await webSocketService.initialize();
      
      webSocketService.disconnect();
      
      expect(mockSupabase.removeChannel).toHaveBeenCalled();
      expect(webSocketService.getConnectionStatus()).toBe(false);
      expect(webSocketService['listeners'].size).toBe(0);
    });

    it('should return correct connection status', async () => {
      expect(webSocketService.getConnectionStatus()).toBe(false);
      
      await webSocketService.initialize();
      expect(webSocketService.getConnectionStatus()).toBe(true);
      
      webSocketService.disconnect();
      expect(webSocketService.getConnectionStatus()).toBe(false);
    });
  });
});