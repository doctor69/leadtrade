import type { APIRoute } from 'astro';
import { getAlpacaConfig } from '@/lib/trading-config';
import type { OptionChain, OptionContract } from '@/types/trading';

export const GET: APIRoute = async ({ request, url }) => {
  try {
    const symbol = url.searchParams.get('symbol');
    
    if (!symbol) {
      return new Response(JSON.stringify({ error: 'Symbol parameter is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // For demo purposes, we'll return mock option chain data
    // In a real implementation, this would fetch from Alpaca's options API
    const mockOptionChain = generateMockOptionChain(symbol);

    return new Response(JSON.stringify(mockOptionChain), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error fetching option chain:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch option chain',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

function generateMockOptionChain(symbol: string): OptionChain {
  const today = new Date();
  const expirationDates = [
    new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 week
    new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 weeks
    new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 month
    new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 months
  ];

  // Mock current stock price (in real implementation, fetch from market data)
  const currentPrice = 150 + Math.random() * 100; // Random price between 150-250
  
  const strikes: { [expiration: string]: { calls: OptionContract[]; puts: OptionContract[] } } = {};

  expirationDates.forEach(expiration => {
    const calls: OptionContract[] = [];
    const puts: OptionContract[] = [];

    // Generate strikes around current price
    for (let i = -5; i <= 5; i++) {
      const strike = Math.round((currentPrice + (i * 10)) / 5) * 5; // Round to nearest $5
      
      // Calculate days to expiration for pricing
      const daysToExpiry = Math.ceil((new Date(expiration).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const timeValue = Math.max(0.1, daysToExpiry / 365 * 0.2); // Simple time value calculation
      
      // Mock option pricing (simplified Black-Scholes approximation)
      const intrinsicValueCall = Math.max(0, currentPrice - strike);
      const intrinsicValuePut = Math.max(0, strike - currentPrice);
      
      const callPremium = intrinsicValueCall + timeValue + Math.random() * 2;
      const putPremium = intrinsicValuePut + timeValue + Math.random() * 2;
      
      const callBid = Math.max(0.01, callPremium - 0.05 - Math.random() * 0.1);
      const callAsk = callPremium + 0.05 + Math.random() * 0.1;
      const putBid = Math.max(0.01, putPremium - 0.05 - Math.random() * 0.1);
      const putAsk = putPremium + 0.05 + Math.random() * 0.1;

      calls.push({
        symbol: `${symbol}${expiration.replace(/-/g, '')}C${strike.toString().padStart(8, '0')}`,
        strike,
        expiration,
        option_type: 'call',
        bid: Math.round(callBid * 100) / 100,
        ask: Math.round(callAsk * 100) / 100,
        last: Math.round(callPremium * 100) / 100,
        volume: Math.floor(Math.random() * 1000),
        open_interest: Math.floor(Math.random() * 5000),
        implied_volatility: 0.15 + Math.random() * 0.3,
        delta: Math.max(0, Math.min(1, 0.5 + (currentPrice - strike) / 100)),
        gamma: Math.random() * 0.01,
        theta: -Math.random() * 0.05,
        vega: Math.random() * 0.1
      });

      puts.push({
        symbol: `${symbol}${expiration.replace(/-/g, '')}P${strike.toString().padStart(8, '0')}`,
        strike,
        expiration,
        option_type: 'put',
        bid: Math.round(putBid * 100) / 100,
        ask: Math.round(putAsk * 100) / 100,
        last: Math.round(putPremium * 100) / 100,
        volume: Math.floor(Math.random() * 1000),
        open_interest: Math.floor(Math.random() * 5000),
        implied_volatility: 0.15 + Math.random() * 0.3,
        delta: Math.max(-1, Math.min(0, -0.5 + (currentPrice - strike) / 100)),
        gamma: Math.random() * 0.01,
        theta: -Math.random() * 0.05,
        vega: Math.random() * 0.1
      });
    }

    // Sort by strike price
    calls.sort((a, b) => a.strike - b.strike);
    puts.sort((a, b) => a.strike - b.strike);

    strikes[expiration] = { calls, puts };
  });

  return {
    symbol,
    expiration_dates: expirationDates,
    strikes
  };
}