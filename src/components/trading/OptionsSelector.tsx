import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, TrendingDown, Calendar, DollarSign } from 'lucide-react';
import { apiService } from '@/lib/apiService';
import type { OptionChain, OptionContract, OptionDetails } from '@/types/trading';

interface OptionsSelectorProps {
  symbol: string;
  onOptionSelect: (optionDetails: OptionDetails) => void;
  selectedOption?: OptionDetails;
}

export default function OptionsSelector({ symbol, onOptionSelect, selectedOption }: OptionsSelectorProps) {
  const [optionChain, setOptionChain] = useState<OptionChain | null>(null);
  const [selectedExpiration, setSelectedExpiration] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (symbol) {
      fetchOptionChain();
    }
  }, [symbol]);

  const fetchOptionChain = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Fetch options contracts for the symbol
      // Get contracts expiring in the next 60 days
      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(today.getDate() + 60);
      
      const result = await apiService.getOptionsContracts({
        underlying_symbols: symbol,
        status: 'active',
        expiration_date_gte: today.toISOString().split('T')[0],
        expiration_date_lte: futureDate.toISOString().split('T')[0],
        limit: 1000
      });
      
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch option chain');
      }
      
      // Transform the response into our OptionChain format
      const contracts = result.data.option_contracts || result.data.contracts || result.data;
      
      if (!Array.isArray(contracts) || contracts.length === 0) {
        setError('No options available for this symbol');
        setLoading(false);
        return;
      }
      
      // Group contracts by expiration date and strike
      const expirationDates = new Set<string>();
      const strikesByExpiration: Record<string, { calls: OptionContract[], puts: OptionContract[] }> = {};
      
      contracts.forEach((contract: any) => {
        const expiration = contract.expiration_date;
        expirationDates.add(expiration);
        
        if (!strikesByExpiration[expiration]) {
          strikesByExpiration[expiration] = { calls: [], puts: [] };
        }
        
        const optionContract: OptionContract = {
          symbol: contract.symbol,
          underlying_symbol: contract.underlying_symbol,
          strike: parseFloat(contract.strike_price),
          expiration: contract.expiration_date,
          option_type: contract.type,
          bid: parseFloat(contract.close_price || 0),
          ask: parseFloat(contract.close_price || 0),
          last: parseFloat(contract.close_price || 0),
          volume: parseInt(contract.volume || 0),
          open_interest: parseInt(contract.open_interest || 0),
          implied_volatility: parseFloat(contract.implied_volatility || 0),
          delta: parseFloat(contract.greeks?.delta || 0),
          gamma: parseFloat(contract.greeks?.gamma || 0),
          theta: parseFloat(contract.greeks?.theta || 0),
          vega: parseFloat(contract.greeks?.vega || 0)
        };
        
        if (contract.type === 'call') {
          strikesByExpiration[expiration].calls.push(optionContract);
        } else {
          strikesByExpiration[expiration].puts.push(optionContract);
        }
      });
      
      // Sort expiration dates
      const sortedExpirations = Array.from(expirationDates).sort();
      
      // Sort strikes within each expiration
      Object.keys(strikesByExpiration).forEach(expiration => {
        strikesByExpiration[expiration].calls.sort((a, b) => a.strike - b.strike);
        strikesByExpiration[expiration].puts.sort((a, b) => a.strike - b.strike);
      });
      
      const chainData: OptionChain = {
        symbol,
        expiration_dates: sortedExpirations,
        strikes: strikesByExpiration
      };
      
      setOptionChain(chainData);
      
      // Auto-select first expiration date
      if (sortedExpirations.length > 0) {
        setSelectedExpiration(sortedExpirations[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load options data');
      console.error('Error fetching option chain:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOptionSelect = (contract: OptionContract) => {
    const optionDetails: OptionDetails = {
      strike: contract.strike,
      expiration: contract.expiration,
      option_type: contract.option_type,
      contract_size: 100, // Standard contract size
      premium: contract.last || (contract.bid + contract.ask) / 2,
      implied_volatility: contract.implied_volatility,
      delta: contract.delta,
      gamma: contract.gamma,
      theta: contract.theta,
      vega: contract.vega
    };
    
    onOptionSelect(optionDetails);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getDaysToExpiration = (expirationDate: string) => {
    const expiry = new Date(expirationDate);
    const today = new Date();
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getMoneyness = (strike: number, currentPrice: number, optionType: 'call' | 'put') => {
    if (optionType === 'call') {
      if (currentPrice > strike) return 'ITM'; // In the money
      if (currentPrice === strike) return 'ATM'; // At the money
      return 'OTM'; // Out of the money
    } else {
      if (currentPrice < strike) return 'ITM';
      if (currentPrice === strike) return 'ATM';
      return 'OTM';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Options Chain</CardTitle>
          <CardDescription>Loading options for {symbol}...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Options Chain</CardTitle>
          <CardDescription>Error loading options for {symbol}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center p-8">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={fetchOptionChain} variant="outline">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!optionChain || !optionChain.expiration_dates.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Options Chain</CardTitle>
          <CardDescription>No options available for {symbol}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center p-8">
            Options trading may not be available for this symbol.
          </p>
        </CardContent>
      </Card>
    );
  }

  const currentStrikes = selectedExpiration && optionChain.strikes[selectedExpiration];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Options Chain - {symbol}
        </CardTitle>
        <CardDescription>
          Select an option contract to trade
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Expiration Date Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Expiration Date</label>
          <Select value={selectedExpiration} onValueChange={setSelectedExpiration}>
            <SelectTrigger>
              <SelectValue placeholder="Select expiration date" />
            </SelectTrigger>
            <SelectContent>
              {optionChain.expiration_dates.map((date) => (
                <SelectItem key={date} value={date}>
                  {formatDate(date)} ({getDaysToExpiration(date)} days)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Selected Option Display */}
        {selectedOption && (
          <Card className="bg-muted/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Selected Option</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Type:</span>
                  <Badge variant={selectedOption.option_type === 'call' ? 'default' : 'destructive'} className="ml-2">
                    {selectedOption.option_type.toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Strike:</span>
                  <span className="ml-2 font-medium">${selectedOption.strike}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Expiration:</span>
                  <span className="ml-2">{formatDate(selectedOption.expiration)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Premium:</span>
                  <span className="ml-2 font-medium">${selectedOption.premium?.toFixed(2) || 'N/A'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Options Chain Table */}
        {currentStrikes && (
          <Tabs defaultValue="calls" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="calls" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Calls
              </TabsTrigger>
              <TabsTrigger value="puts" className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4" />
                Puts
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="calls" className="space-y-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Strike</TableHead>
                      <TableHead>Bid</TableHead>
                      <TableHead>Ask</TableHead>
                      <TableHead>Last</TableHead>
                      <TableHead>Volume</TableHead>
                      <TableHead>OI</TableHead>
                      <TableHead>IV</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentStrikes.calls.map((contract) => (
                      <TableRow 
                        key={`${contract.symbol}-${contract.strike}`}
                        className="cursor-pointer hover:bg-muted/50 dark:hover:bg-primary/25"
                        onClick={() => handleOptionSelect(contract)}
                      >
                        <TableCell className="font-medium">${contract.strike}</TableCell>
                        <TableCell>${contract.bid.toFixed(2)}</TableCell>
                        <TableCell>${contract.ask.toFixed(2)}</TableCell>
                        <TableCell>${contract.last.toFixed(2)}</TableCell>
                        <TableCell>{contract.volume.toLocaleString()}</TableCell>
                        <TableCell>{contract.open_interest.toLocaleString()}</TableCell>
                        <TableCell>{contract.implied_volatility ? `${(contract.implied_volatility * 100).toFixed(1)}%` : 'N/A'}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline">
                            Select
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
            
            <TabsContent value="puts" className="space-y-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Strike</TableHead>
                      <TableHead>Bid</TableHead>
                      <TableHead>Ask</TableHead>
                      <TableHead>Last</TableHead>
                      <TableHead>Volume</TableHead>
                      <TableHead>OI</TableHead>
                      <TableHead>IV</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentStrikes.puts.map((contract) => (
                      <TableRow 
                        key={`${contract.symbol}-${contract.strike}`}
                        className="cursor-pointer hover:bg-muted/50 dark:hover:bg-primary/25"
                        onClick={() => handleOptionSelect(contract)}
                      >
                        <TableCell className="font-medium">${contract.strike}</TableCell>
                        <TableCell>${contract.bid.toFixed(2)}</TableCell>
                        <TableCell>${contract.ask.toFixed(2)}</TableCell>
                        <TableCell>${contract.last.toFixed(2)}</TableCell>
                        <TableCell>{contract.volume.toLocaleString()}</TableCell>
                        <TableCell>{contract.open_interest.toLocaleString()}</TableCell>
                        <TableCell>{contract.implied_volatility ? `${(contract.implied_volatility * 100).toFixed(1)}%` : 'N/A'}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline">
                            Select
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}