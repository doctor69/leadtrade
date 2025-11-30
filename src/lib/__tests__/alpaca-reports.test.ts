// Tests for Alpaca Reporting API
// Requirements: 17.1, 17.2, 17.3, 17.4, 17.5

import { describe, it, expect } from 'vitest';
import { formatReportDate, calculatePortfolioMetrics } from '../alpaca-reports';
import type { AggregatePosition } from '../alpaca-reports';

describe('Alpaca Reports API', () => {
  describe('formatReportDate', () => {
    it('should format Date object to YYYY-MM-DD', () => {
      const date = new Date('2025-01-15T10:30:00Z');
      const formatted = formatReportDate(date);
      expect(formatted).toBe('2025-01-15');
    });

    it('should return string date as-is', () => {
      const dateString = '2025-01-15';
      const formatted = formatReportDate(dateString);
      expect(formatted).toBe('2025-01-15');
    });

    it('should pad single-digit months and days', () => {
      const date = new Date('2025-03-05T10:30:00Z');
      const formatted = formatReportDate(date);
      expect(formatted).toBe('2025-03-05');
    });
  });

  describe('calculatePortfolioMetrics', () => {
    it('should calculate total metrics from aggregate positions', () => {
      const positions: AggregatePosition[] = [
        {
          symbol: 'AAPL',
          asset_id: 'asset1',
          asset_class: 'us_equity',
          total_qty: '100',
          total_market_value: '15000.00',
          total_cost_basis: '14000.00',
          total_unrealized_pl: '1000.00',
          total_unrealized_plpc: '7.14',
          account_count: 2,
          accounts: [],
        },
        {
          symbol: 'GOOGL',
          asset_id: 'asset2',
          asset_class: 'us_equity',
          total_qty: '50',
          total_market_value: '7500.00',
          total_cost_basis: '7000.00',
          total_unrealized_pl: '500.00',
          total_unrealized_plpc: '7.14',
          account_count: 1,
          accounts: [],
        },
      ];

      const metrics = calculatePortfolioMetrics(positions);

      expect(metrics.totalMarketValue).toBe('22500.00');
      expect(metrics.totalCostBasis).toBe('21000.00');
      expect(metrics.totalUnrealizedPL).toBe('1500.00');
      expect(metrics.totalUnrealizedPLPC).toBe('7.14');
      expect(metrics.positionCount).toBe(2);
    });

    it('should handle empty positions array', () => {
      const positions: AggregatePosition[] = [];
      const metrics = calculatePortfolioMetrics(positions);

      expect(metrics.totalMarketValue).toBe('0.00');
      expect(metrics.totalCostBasis).toBe('0.00');
      expect(metrics.totalUnrealizedPL).toBe('0.00');
      expect(metrics.totalUnrealizedPLPC).toBe('0.00');
      expect(metrics.positionCount).toBe(0);
    });

    it('should handle positions with zero cost basis', () => {
      const positions: AggregatePosition[] = [
        {
          symbol: 'FREE',
          asset_id: 'asset3',
          asset_class: 'us_equity',
          total_qty: '10',
          total_market_value: '100.00',
          total_cost_basis: '0.00',
          total_unrealized_pl: '100.00',
          total_unrealized_plpc: '0.00',
          account_count: 1,
          accounts: [],
        },
      ];

      const metrics = calculatePortfolioMetrics(positions);

      expect(metrics.totalMarketValue).toBe('100.00');
      expect(metrics.totalCostBasis).toBe('0.00');
      expect(metrics.totalUnrealizedPL).toBe('100.00');
      expect(metrics.totalUnrealizedPLPC).toBe('0.00');
      expect(metrics.positionCount).toBe(1);
    });

    it('should handle negative unrealized P&L', () => {
      const positions: AggregatePosition[] = [
        {
          symbol: 'LOSS',
          asset_id: 'asset4',
          asset_class: 'us_equity',
          total_qty: '100',
          total_market_value: '9000.00',
          total_cost_basis: '10000.00',
          total_unrealized_pl: '-1000.00',
          total_unrealized_plpc: '-10.00',
          account_count: 1,
          accounts: [],
        },
      ];

      const metrics = calculatePortfolioMetrics(positions);

      expect(metrics.totalMarketValue).toBe('9000.00');
      expect(metrics.totalCostBasis).toBe('10000.00');
      expect(metrics.totalUnrealizedPL).toBe('-1000.00');
      expect(metrics.totalUnrealizedPLPC).toBe('-10.00');
      expect(metrics.positionCount).toBe(1);
    });
  });
});
