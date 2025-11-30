import { describe, it, expect } from 'vitest';
import { calculateInstantFundingInterest } from '../alpaca-instant-funding';

describe('Alpaca Instant Funding', () => {
  describe('calculateInstantFundingInterest', () => {
    it('should calculate interest correctly for overdue funding', () => {
      const principal = 1000;
      const daysOverdue = 5;
      const annualRate = 0.08; // 8% APR

      const interest = calculateInstantFundingInterest(principal, daysOverdue, annualRate);

      // Expected: 1000 * (0.08 / 365) * 5 = 1.0958... rounded to 1.10
      expect(interest).toBe(1.10);
    });

    it('should return 0 interest for 0 days overdue', () => {
      const interest = calculateInstantFundingInterest(1000, 0, 0.08);
      expect(interest).toBe(0);
    });

    it('should return 0 interest for negative days overdue', () => {
      const interest = calculateInstantFundingInterest(1000, -5, 0.08);
      expect(interest).toBe(0);
    });

    it('should use default 8% APR when rate not provided', () => {
      const interest = calculateInstantFundingInterest(1000, 5);
      expect(interest).toBe(1.10);
    });

    it('should calculate interest for 30 days overdue', () => {
      const principal = 5000;
      const daysOverdue = 30;
      const annualRate = 0.08;

      const interest = calculateInstantFundingInterest(principal, daysOverdue, annualRate);

      // Expected: 5000 * (0.08 / 365) * 30 = 32.876... rounded to 32.88
      expect(interest).toBe(32.88);
    });

    it('should calculate interest for different annual rates', () => {
      const principal = 1000;
      const daysOverdue = 10;
      const annualRate = 0.10; // 10% APR

      const interest = calculateInstantFundingInterest(principal, daysOverdue, annualRate);

      // Expected: 1000 * (0.10 / 365) * 10 = 2.739... rounded to 2.74
      expect(interest).toBe(2.74);
    });

    it('should round to 2 decimal places', () => {
      const principal = 1234.56;
      const daysOverdue = 7;
      const annualRate = 0.08;

      const interest = calculateInstantFundingInterest(principal, daysOverdue, annualRate);

      // Should be rounded to 2 decimal places
      expect(interest.toString()).toMatch(/^\d+\.\d{2}$/);
    });

    it('should handle large principal amounts', () => {
      const principal = 100000;
      const daysOverdue = 15;
      const annualRate = 0.08;

      const interest = calculateInstantFundingInterest(principal, daysOverdue, annualRate);

      // Expected: 100000 * (0.08 / 365) * 15 = 328.767... rounded to 328.77
      expect(interest).toBe(328.77);
    });

    it('should handle small principal amounts', () => {
      const principal = 10;
      const daysOverdue = 1;
      const annualRate = 0.08;

      const interest = calculateInstantFundingInterest(principal, daysOverdue, annualRate);

      // Expected: 10 * (0.08 / 365) * 1 = 0.00219... rounded to 0.00
      expect(interest).toBe(0.00);
    });
  });
});
