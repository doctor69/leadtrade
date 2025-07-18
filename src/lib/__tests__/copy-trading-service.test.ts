import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CopyTradingService } from '../copy-trading-service';
import { supabase } from '../supabase';

// Mock Supabase
vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            single: vi.fn(),
            limit: vi.fn()
          })),
          single: vi.fn(),
          limit: vi.fn()
        })),
        order: vi.fn(() => ({
          single: vi.fn(),
          limit: vi.fn()
        })),
        single: vi.fn(),
        limit: vi.fn()
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn()
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn()
          }))
        }))
      })),
      delete: vi.fn(() => ({
        eq: vi.fn()
      }))
    })),
    rpc: vi.fn()
  }
}));

describe('CopyTradingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserSubscriptions', () => {
    it('should return subscription summary with correct calculations', async () => {
      const mockSubscriptions = [
        {
          id: '1',
          follower_id: 'user1',
          leader_id: 'leader1',
          allocation_percentage: 30,
          is_active: true,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
          leader: {
            id: 'leader1',
            username: 'trader1',
            share_trades: true,
            show_asset_amounts: true
          }
        },
        {
          id: '2',
          follower_id: 'user1',
          leader_id: 'leader2',
          allocation_percentage: 20,
          is_active: true,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
          leader: {
            id: 'leader2',
            username: 'trader2',
            share_trades: true,
            show_asset_amounts: false
          }
        },
        {
          id: '3',
          follower_id: 'user1',
          leader_id: 'leader3',
          allocation_percentage: 15,
          is_active: false,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
          leader: {
            id: 'leader3',
            username: 'trader3',
            share_trades: true,
            show_asset_amounts: true
          }
        }
      ];

      const mockSupabaseChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockSubscriptions, error: null })
      };

      vi.mocked(supabase.from).mockReturnValue(mockSupabaseChain as any);

      const result = await CopyTradingService.getUserSubscriptions('user1');

      expect(result.subscriptions).toHaveLength(3);
      expect(result.totalAllocation).toBe(50); // 30 + 20 (only active subscriptions)
      expect(result.remainingAllocation).toBe(50); // 100 - 50
      expect(result.activeSubscriptions).toBe(2);
    });

    it('should handle empty subscriptions', async () => {
      const mockSupabaseChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null })
      };

      vi.mocked(supabase.from).mockReturnValue(mockSupabaseChain as any);

      const result = await CopyTradingService.getUserSubscriptions('user1');

      expect(result.subscriptions).toHaveLength(0);
      expect(result.totalAllocation).toBe(0);
      expect(result.remainingAllocation).toBe(100);
      expect(result.activeSubscriptions).toBe(0);
    });
  });

  describe('createSubscription', () => {
    it('should create subscription successfully', async () => {
      const mockLeader = {
        id: 'leader1',
        share_trades: true
      };

      const mockNewSubscription = {
        id: 'sub1',
        follower_id: 'user1',
        leader_id: 'leader1',
        allocation_percentage: 25,
        is_active: true,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
        leader: {
          id: 'leader1',
          username: 'trader1',
          share_trades: true,
          show_asset_amounts: true
        }
      };

      // Mock leader check
      const mockLeaderChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockLeader, error: null })
      };

      // Mock existing subscription check
      const mockExistingChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
      };

      // Mock subscription creation
      const mockCreateChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockNewSubscription, error: null })
      };

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockLeaderChain as any) // Leader check
        .mockReturnValueOnce(mockExistingChain as any) // Existing subscription check
        .mockReturnValueOnce(mockCreateChain as any); // Create subscription

      // Mock getUserSubscriptions for allocation check
      vi.spyOn(CopyTradingService, 'getUserSubscriptions').mockResolvedValue({
        subscriptions: [],
        totalAllocation: 0,
        remainingAllocation: 100,
        activeSubscriptions: 0
      });

      const result = await CopyTradingService.createSubscription('user1', 'leader1', 25);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockNewSubscription);
    });

    it('should reject self-following', async () => {
      const result = await CopyTradingService.createSubscription('user1', 'user1', 25);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot follow yourself');
    });

    it('should reject invalid allocation percentage', async () => {
      const result = await CopyTradingService.createSubscription('user1', 'leader1', 0);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Allocation percentage must be between 0.1 and 100');
    });

    it('should reject allocation that exceeds 100%', async () => {
      const mockLeader = {
        id: 'leader1',
        share_trades: true
      };

      const mockLeaderChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockLeader, error: null })
      };

      const mockExistingChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
      };

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockLeaderChain as any)
        .mockReturnValueOnce(mockExistingChain as any);

      // Mock getUserSubscriptions to return high allocation
      vi.spyOn(CopyTradingService, 'getUserSubscriptions').mockResolvedValue({
        subscriptions: [],
        totalAllocation: 90,
        remainingAllocation: 10,
        activeSubscriptions: 1
      });

      const result = await CopyTradingService.createSubscription('user1', 'leader1', 25);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Total allocation would exceed 100%');
    });
  });

  describe('updateSubscription', () => {
    it('should update subscription successfully', async () => {
      const mockExistingSubscription = {
        id: 'sub1',
        follower_id: 'user1',
        leader_id: 'leader1',
        allocation_percentage: 25,
        is_active: true
      };

      const mockUpdatedSubscription = {
        ...mockExistingSubscription,
        allocation_percentage: 30,
        leader: {
          id: 'leader1',
          username: 'trader1',
          share_trades: true,
          show_asset_amounts: true
        }
      };

      const mockFetchChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockExistingSubscription, error: null })
      };

      const mockUpdateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockUpdatedSubscription, error: null })
      };

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockFetchChain as any)
        .mockReturnValueOnce(mockUpdateChain as any);

      // Mock getUserSubscriptions for allocation validation
      vi.spyOn(CopyTradingService, 'getUserSubscriptions').mockResolvedValue({
        subscriptions: [mockExistingSubscription as any],
        totalAllocation: 25,
        remainingAllocation: 75,
        activeSubscriptions: 1
      });

      const result = await CopyTradingService.updateSubscription('sub1', 'user1', { allocation_percentage: 30 });

      expect(result.success).toBe(true);
      expect(result.data?.allocation_percentage).toBe(30);
    });

    it('should reject update that would exceed 100% allocation', async () => {
      const mockExistingSubscription = {
        id: 'sub1',
        follower_id: 'user1',
        leader_id: 'leader1',
        allocation_percentage: 25,
        is_active: true
      };

      const mockFetchChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockExistingSubscription, error: null })
      };

      vi.mocked(supabase.from).mockReturnValue(mockFetchChain as any);

      // Mock getUserSubscriptions to return high allocation
      vi.spyOn(CopyTradingService, 'getUserSubscriptions').mockResolvedValue({
        subscriptions: [mockExistingSubscription as any],
        totalAllocation: 90,
        remainingAllocation: 10,
        activeSubscriptions: 1
      });

      const result = await CopyTradingService.updateSubscription('sub1', 'user1', { allocation_percentage: 80 });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Total allocation would exceed 100%');
    });
  });

  describe('canFollowTrader', () => {
    it('should allow following valid trader', async () => {
      const mockLeader = {
        id: 'leader1',
        share_trades: true
      };

      const mockLeaderChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockLeader, error: null })
      };

      const mockExistingChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
      };

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockLeaderChain as any)
        .mockReturnValueOnce(mockExistingChain as any);

      vi.spyOn(CopyTradingService, 'getUserSubscriptions').mockResolvedValue({
        subscriptions: [],
        totalAllocation: 30,
        remainingAllocation: 70,
        activeSubscriptions: 1
      });

      const result = await CopyTradingService.canFollowTrader('user1', 'leader1', 25);

      expect(result.canFollow).toBe(true);
      expect(result.availableAllocation).toBe(70);
    });

    it('should reject following trader who does not share trades', async () => {
      const mockLeader = {
        id: 'leader1',
        share_trades: false
      };

      const mockLeaderChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockLeader, error: null })
      };

      vi.mocked(supabase.from).mockReturnValue(mockLeaderChain as any);

      const result = await CopyTradingService.canFollowTrader('user1', 'leader1', 25);

      expect(result.canFollow).toBe(false);
      expect(result.reason).toBe('This trader is not sharing trades');
    });
  });
});