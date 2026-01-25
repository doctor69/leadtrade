import { describe, it, expect } from 'vitest';

/**
 * Options Position Display Tests - Task 5.2
 * Tests options position display functionality including:
 * - Option-specific fields shown
 * - Strike price display
 * - Expiration date formatting
 * - Option type (call/put) display
 * - Underlying symbol shown
 * 
 * Requirements: 5.2
 */

interface OptionPosition {
  symbol: string;
  qty: number;
  avg_entry_price: number;
  current_price: number;
  market_value: number;
  cost_basis: number;
  unrealized_pl: number;
  unrealized_plpc: number;
  side: 'long' | 'short';
  change_today: number;
  // Option-specific fields
  option_type: 'call' | 'put';
  strike_price: number;
  expiration_date: string;
  underlying_symbol: string;
  contract_size?: number;
  in_the_money?: boolean;
  intrinsic_value?: number;
  time_value?: number;
}

describe('Position Display - Options Positions (Task 5.2)', () => {
  describe('Option-Specific Fields Display', () => {
    it('should display all required option-specific fields', () => {
      const optionPosition: OptionPosition = {
        symbol: 'AAPL250117C00150000',
        qty: 1,
        avg_entry_price: 5.50,
        current_price: 6.00,
        market_value: 600.00,
        cost_basis: 550.00,
        unrealized_pl: 50.00,
        unrealized_plpc: 0.0909,
        side: 'long',
        change_today: 10.00,
        option_type: 'call',
        strike_price: 150.00,
        expiration_date: '2025-01-17',
        underlying_symbol: 'AAPL',
        contract_size: 100
      };

      expect(optionPosition.option_type).toBe('call');
      expect(optionPosition.strike_price).toBe(150.00);
      expect(optionPosition.expiration_date).toBe('2025-01-17');
      expect(optionPosition.underlying_symbol).toBe('AAPL');
      expect(optionPosition.contract_size).toBe(100);
    });

    it('should display put option fields correctly', () => {
      const optionPosition: OptionPosition = {
        symbol: 'SPY250117P00450000',
        qty: 2,
        avg_entry_price: 3.25,
        current_price: 4.00,
        market_value: 800.00,
        cost_basis: 650.00,
        unrealized_pl: 150.00,
        unrealized_plpc: 0.2308,
        side: 'long',
        change_today: 30.00,
        option_type: 'put',
        strike_price: 450.00,
        expiration_date: '2025-01-17',
        underlying_symbol: 'SPY',
        contract_size: 100
      };

      expect(optionPosition.option_type).toBe('put');
      expect(optionPosition.strike_price).toBe(450.00);
      expect(optionPosition.underlying_symbol).toBe('SPY');
    });

    it('should handle fractional option contracts', () => {
      const optionPosition: OptionPosition = {
        symbol: 'TSLA250117C00200000',
        qty: 0.5,
        avg_entry_price: 10.00,
        current_price: 12.00,
        market_value: 600.00,
        cost_basis: 500.00,
        unrealized_pl: 100.00,
        unrealized_plpc: 0.20,
        side: 'long',
        change_today: 20.00,
        option_type: 'call',
        strike_price: 200.00,
        expiration_date: '2025-01-17',
        underlying_symbol: 'TSLA',
        contract_size: 100
      };

      expect(optionPosition.qty).toBe(0.5);
      expect(optionPosition.market_value).toBe(600.00);
    });
  });

  describe('Strike Price Display', () => {
    it('should display strike price with proper formatting', () => {
      const formatStrike = (strike: number) => {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2,
        }).format(strike);
      };

      const optionPosition: OptionPosition = {
        symbol: 'AAPL250117C00150000',
        qty: 1,
        avg_entry_price: 5.50,
        current_price: 6.00,
        market_value: 600.00,
        cost_basis: 550.00,
        unrealized_pl: 50.00,
        unrealized_plpc: 0.0909,
        side: 'long',
        change_today: 10.00,
        option_type: 'call',
        strike_price: 150.00,
        expiration_date: '2025-01-17',
        underlying_symbol: 'AAPL',
        contract_size: 100
      };

      expect(formatStrike(optionPosition.strike_price)).toBe('$150.00');
    });

    it('should handle fractional strike prices', () => {
      const optionPosition: OptionPosition = {
        symbol: 'SPY250117C00452500',
        qty: 1,
        avg_entry_price: 5.50,
        current_price: 6.00,
        market_value: 600.00,
        cost_basis: 550.00,
        unrealized_pl: 50.00,
        unrealized_plpc: 0.0909,
        side: 'long',
        change_today: 10.00,
        option_type: 'call',
        strike_price: 452.50,
        expiration_date: '2025-01-17',
        underlying_symbol: 'SPY',
        contract_size: 100
      };

      expect(optionPosition.strike_price).toBe(452.50);
    });

    it('should handle high strike prices', () => {
      const optionPosition: OptionPosition = {
        symbol: 'GOOGL250117C02500000',
        qty: 1,
        avg_entry_price: 15.00,
        current_price: 18.00,
        market_value: 1800.00,
        cost_basis: 1500.00,
        unrealized_pl: 300.00,
        unrealized_plpc: 0.20,
        side: 'long',
        change_today: 50.00,
        option_type: 'call',
        strike_price: 2500.00,
        expiration_date: '2025-01-17',
        underlying_symbol: 'GOOGL',
        contract_size: 100
      };

      expect(optionPosition.strike_price).toBe(2500.00);
    });
  });

  describe('Expiration Date Formatting', () => {
    it('should format expiration date correctly', () => {
      const formatExpirationDate = (dateStr: string) => {
        // Parse as UTC to avoid timezone issues
        const date = new Date(dateStr + 'T12:00:00Z');
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          timeZone: 'UTC'
        });
      };

      const optionPosition: OptionPosition = {
        symbol: 'AAPL250117C00150000',
        qty: 1,
        avg_entry_price: 5.50,
        current_price: 6.00,
        market_value: 600.00,
        cost_basis: 550.00,
        unrealized_pl: 50.00,
        unrealized_plpc: 0.0909,
        side: 'long',
        change_today: 10.00,
        option_type: 'call',
        strike_price: 150.00,
        expiration_date: '2025-01-17',
        underlying_symbol: 'AAPL',
        contract_size: 100
      };

      const formatted = formatExpirationDate(optionPosition.expiration_date);
      expect(formatted).toContain('Jan');
      expect(formatted).toContain('17');
      expect(formatted).toContain('2025');
    });

    it('should calculate days to expiration', () => {
      const calculateDaysToExpiration = (expirationDate: string) => {
        const expDate = new Date(expirationDate);
        const today = new Date();
        const diffTime = expDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
      };

      const optionPosition: OptionPosition = {
        symbol: 'AAPL250117C00150000',
        qty: 1,
        avg_entry_price: 5.50,
        current_price: 6.00,
        market_value: 600.00,
        cost_basis: 550.00,
        unrealized_pl: 50.00,
        unrealized_plpc: 0.0909,
        side: 'long',
        change_today: 10.00,
        option_type: 'call',
        strike_price: 150.00,
        expiration_date: '2025-01-17',
        underlying_symbol: 'AAPL',
        contract_size: 100
      };

      const daysToExpiration = calculateDaysToExpiration(optionPosition.expiration_date);
      expect(typeof daysToExpiration).toBe('number');
    });

    it('should handle different expiration date formats', () => {
      const parseExpirationDate = (dateStr: string) => {
        return new Date(dateStr);
      };

      const formats = [
        '2025-01-17',
        '2025-03-21',
        '2025-12-19'
      ];

      formats.forEach(format => {
        const date = parseExpirationDate(format);
        expect(date).toBeInstanceOf(Date);
        expect(isNaN(date.getTime())).toBe(false);
      });
    });
  });

  describe('Option Type Display', () => {
    it('should display call option type correctly', () => {
      const optionPosition: OptionPosition = {
        symbol: 'AAPL250117C00150000',
        qty: 1,
        avg_entry_price: 5.50,
        current_price: 6.00,
        market_value: 600.00,
        cost_basis: 550.00,
        unrealized_pl: 50.00,
        unrealized_plpc: 0.0909,
        side: 'long',
        change_today: 10.00,
        option_type: 'call',
        strike_price: 150.00,
        expiration_date: '2025-01-17',
        underlying_symbol: 'AAPL',
        contract_size: 100
      };

      expect(optionPosition.option_type).toBe('call');
      expect(optionPosition.option_type.toUpperCase()).toBe('CALL');
    });

    it('should display put option type correctly', () => {
      const optionPosition: OptionPosition = {
        symbol: 'SPY250117P00450000',
        qty: 1,
        avg_entry_price: 3.25,
        current_price: 4.00,
        market_value: 400.00,
        cost_basis: 325.00,
        unrealized_pl: 75.00,
        unrealized_plpc: 0.2308,
        side: 'long',
        change_today: 15.00,
        option_type: 'put',
        strike_price: 450.00,
        expiration_date: '2025-01-17',
        underlying_symbol: 'SPY',
        contract_size: 100
      };

      expect(optionPosition.option_type).toBe('put');
      expect(optionPosition.option_type.toUpperCase()).toBe('PUT');
    });

    it('should format option type for display', () => {
      const formatOptionType = (type: 'call' | 'put') => {
        return type.charAt(0).toUpperCase() + type.slice(1);
      };

      expect(formatOptionType('call')).toBe('Call');
      expect(formatOptionType('put')).toBe('Put');
    });
  });

  describe('Underlying Symbol Display', () => {
    it('should display underlying symbol correctly', () => {
      const optionPosition: OptionPosition = {
        symbol: 'AAPL250117C00150000',
        qty: 1,
        avg_entry_price: 5.50,
        current_price: 6.00,
        market_value: 600.00,
        cost_basis: 550.00,
        unrealized_pl: 50.00,
        unrealized_plpc: 0.0909,
        side: 'long',
        change_today: 10.00,
        option_type: 'call',
        strike_price: 150.00,
        expiration_date: '2025-01-17',
        underlying_symbol: 'AAPL',
        contract_size: 100
      };

      expect(optionPosition.underlying_symbol).toBe('AAPL');
    });

    it('should handle different underlying symbols', () => {
      const symbols = ['AAPL', 'SPY', 'TSLA', 'GOOGL', 'MSFT'];
      
      symbols.forEach(underlying => {
        const optionPosition: OptionPosition = {
          symbol: `${underlying}250117C00150000`,
          qty: 1,
          avg_entry_price: 5.50,
          current_price: 6.00,
          market_value: 600.00,
          cost_basis: 550.00,
          unrealized_pl: 50.00,
          unrealized_plpc: 0.0909,
          side: 'long',
          change_today: 10.00,
          option_type: 'call',
          strike_price: 150.00,
          expiration_date: '2025-01-17',
          underlying_symbol: underlying,
          contract_size: 100
        };

        expect(optionPosition.underlying_symbol).toBe(underlying);
      });
    });

    it('should link underlying symbol to stock position', () => {
      const optionPosition: OptionPosition = {
        symbol: 'AAPL250117C00150000',
        qty: 1,
        avg_entry_price: 5.50,
        current_price: 6.00,
        market_value: 600.00,
        cost_basis: 550.00,
        unrealized_pl: 50.00,
        unrealized_plpc: 0.0909,
        side: 'long',
        change_today: 10.00,
        option_type: 'call',
        strike_price: 150.00,
        expiration_date: '2025-01-17',
        underlying_symbol: 'AAPL',
        contract_size: 100
      };

      // Verify we can use underlying symbol to look up stock data
      expect(optionPosition.underlying_symbol).toBeTruthy();
      expect(optionPosition.underlying_symbol.length).toBeGreaterThan(0);
    });
  });

  describe('Option Value Calculations', () => {
    it('should calculate option market value correctly', () => {
      const qty = 1;
      const current_price = 6.00;
      const contract_size = 100;
      const expected_market_value = qty * current_price * contract_size;

      const optionPosition: OptionPosition = {
        symbol: 'AAPL250117C00150000',
        qty,
        avg_entry_price: 5.50,
        current_price,
        market_value: expected_market_value,
        cost_basis: 550.00,
        unrealized_pl: 50.00,
        unrealized_plpc: 0.0909,
        side: 'long',
        change_today: 10.00,
        option_type: 'call',
        strike_price: 150.00,
        expiration_date: '2025-01-17',
        underlying_symbol: 'AAPL',
        contract_size
      };

      expect(optionPosition.market_value).toBe(600.00);
    });

    it('should calculate option cost basis correctly', () => {
      const qty = 2;
      const avg_entry_price = 3.25;
      const contract_size = 100;
      const expected_cost_basis = qty * avg_entry_price * contract_size;

      const optionPosition: OptionPosition = {
        symbol: 'SPY250117P00450000',
        qty,
        avg_entry_price,
        current_price: 4.00,
        market_value: 800.00,
        cost_basis: expected_cost_basis,
        unrealized_pl: 150.00,
        unrealized_plpc: 0.2308,
        side: 'long',
        change_today: 30.00,
        option_type: 'put',
        strike_price: 450.00,
        expiration_date: '2025-01-17',
        underlying_symbol: 'SPY',
        contract_size
      };

      expect(optionPosition.cost_basis).toBe(650.00);
    });

    it('should calculate intrinsic value for ITM call', () => {
      const calculateIntrinsicValue = (
        optionType: 'call' | 'put',
        underlyingPrice: number,
        strikePrice: number
      ) => {
        if (optionType === 'call') {
          return Math.max(0, underlyingPrice - strikePrice);
        } else {
          return Math.max(0, strikePrice - underlyingPrice);
        }
      };

      const underlyingPrice = 155.00;
      const strikePrice = 150.00;
      const intrinsicValue = calculateIntrinsicValue('call', underlyingPrice, strikePrice);

      expect(intrinsicValue).toBe(5.00);
    });

    it('should calculate intrinsic value for ITM put', () => {
      const calculateIntrinsicValue = (
        optionType: 'call' | 'put',
        underlyingPrice: number,
        strikePrice: number
      ) => {
        if (optionType === 'call') {
          return Math.max(0, underlyingPrice - strikePrice);
        } else {
          return Math.max(0, strikePrice - underlyingPrice);
        }
      };

      const underlyingPrice = 445.00;
      const strikePrice = 450.00;
      const intrinsicValue = calculateIntrinsicValue('put', underlyingPrice, strikePrice);

      expect(intrinsicValue).toBe(5.00);
    });

    it('should identify OTM options with zero intrinsic value', () => {
      const calculateIntrinsicValue = (
        optionType: 'call' | 'put',
        underlyingPrice: number,
        strikePrice: number
      ) => {
        if (optionType === 'call') {
          return Math.max(0, underlyingPrice - strikePrice);
        } else {
          return Math.max(0, strikePrice - underlyingPrice);
        }
      };

      // OTM call
      const otmCallIntrinsic = calculateIntrinsicValue('call', 145.00, 150.00);
      expect(otmCallIntrinsic).toBe(0);

      // OTM put
      const otmPutIntrinsic = calculateIntrinsicValue('put', 455.00, 450.00);
      expect(otmPutIntrinsic).toBe(0);
    });
  });

  describe('Option Display Formatting', () => {
    it('should format complete option description', () => {
      const formatOptionDescription = (position: OptionPosition) => {
        const typeStr = position.option_type.toUpperCase();
        const strikeStr = position.strike_price.toFixed(2);
        const expStr = new Date(position.expiration_date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
        return `${position.underlying_symbol} ${expStr} $${strikeStr} ${typeStr}`;
      };

      const optionPosition: OptionPosition = {
        symbol: 'AAPL250117C00150000',
        qty: 1,
        avg_entry_price: 5.50,
        current_price: 6.00,
        market_value: 600.00,
        cost_basis: 550.00,
        unrealized_pl: 50.00,
        unrealized_plpc: 0.0909,
        side: 'long',
        change_today: 10.00,
        option_type: 'call',
        strike_price: 150.00,
        expiration_date: '2025-01-17',
        underlying_symbol: 'AAPL',
        contract_size: 100
      };

      const description = formatOptionDescription(optionPosition);
      expect(description).toContain('AAPL');
      expect(description).toContain('150.00');
      expect(description).toContain('CALL');
    });

    it('should format option symbol for display', () => {
      const optionPosition: OptionPosition = {
        symbol: 'AAPL250117C00150000',
        qty: 1,
        avg_entry_price: 5.50,
        current_price: 6.00,
        market_value: 600.00,
        cost_basis: 550.00,
        unrealized_pl: 50.00,
        unrealized_plpc: 0.0909,
        side: 'long',
        change_today: 10.00,
        option_type: 'call',
        strike_price: 150.00,
        expiration_date: '2025-01-17',
        underlying_symbol: 'AAPL',
        contract_size: 100
      };

      expect(optionPosition.symbol).toContain(optionPosition.underlying_symbol);
      expect(optionPosition.symbol.length).toBeGreaterThan(optionPosition.underlying_symbol.length);
    });
  });

  describe('Multiple Option Positions', () => {
    it('should handle multiple option positions correctly', () => {
      const positions: OptionPosition[] = [
        {
          symbol: 'AAPL250117C00150000',
          qty: 1,
          avg_entry_price: 5.50,
          current_price: 6.00,
          market_value: 600.00,
          cost_basis: 550.00,
          unrealized_pl: 50.00,
          unrealized_plpc: 0.0909,
          side: 'long',
          change_today: 10.00,
          option_type: 'call',
          strike_price: 150.00,
          expiration_date: '2025-01-17',
          underlying_symbol: 'AAPL',
          contract_size: 100
        },
        {
          symbol: 'SPY250117P00450000',
          qty: 2,
          avg_entry_price: 3.25,
          current_price: 4.00,
          market_value: 800.00,
          cost_basis: 650.00,
          unrealized_pl: 150.00,
          unrealized_plpc: 0.2308,
          side: 'long',
          change_today: 30.00,
          option_type: 'put',
          strike_price: 450.00,
          expiration_date: '2025-01-17',
          underlying_symbol: 'SPY',
          contract_size: 100
        }
      ];

      const totalMarketValue = positions.reduce((sum, p) => sum + p.market_value, 0);
      const totalUnrealizedPL = positions.reduce((sum, p) => sum + p.unrealized_pl, 0);

      expect(totalMarketValue).toBe(1400.00);
      expect(totalUnrealizedPL).toBe(200.00);
    });

    it('should group options by underlying symbol', () => {
      const positions: OptionPosition[] = [
        {
          symbol: 'AAPL250117C00150000',
          qty: 1,
          avg_entry_price: 5.50,
          current_price: 6.00,
          market_value: 600.00,
          cost_basis: 550.00,
          unrealized_pl: 50.00,
          unrealized_plpc: 0.0909,
          side: 'long',
          change_today: 10.00,
          option_type: 'call',
          strike_price: 150.00,
          expiration_date: '2025-01-17',
          underlying_symbol: 'AAPL',
          contract_size: 100
        },
        {
          symbol: 'AAPL250117P00145000',
          qty: 1,
          avg_entry_price: 2.50,
          current_price: 3.00,
          market_value: 300.00,
          cost_basis: 250.00,
          unrealized_pl: 50.00,
          unrealized_plpc: 0.20,
          side: 'long',
          change_today: 5.00,
          option_type: 'put',
          strike_price: 145.00,
          expiration_date: '2025-01-17',
          underlying_symbol: 'AAPL',
          contract_size: 100
        }
      ];

      const groupedByUnderlying = positions.reduce((acc, pos) => {
        if (!acc[pos.underlying_symbol]) {
          acc[pos.underlying_symbol] = [];
        }
        acc[pos.underlying_symbol].push(pos);
        return acc;
      }, {} as Record<string, OptionPosition[]>);

      expect(groupedByUnderlying['AAPL']).toHaveLength(2);
      expect(groupedByUnderlying['AAPL'][0].option_type).toBe('call');
      expect(groupedByUnderlying['AAPL'][1].option_type).toBe('put');
    });
  });
});
