import { useEffect, useState } from "react";
import { getAlpacaConfig, createAlpacaBrokerHeaders, type TradingMode } from './trading-config';

interface AlpacaConnectionProps {
  setTableData: Function;
  method: string;
  body: {};
  endpoint: string;
  tradingMode?: TradingMode;
  userId?: string;
}

export default function AlpacaConnection({ 
  setTableData, 
  method, 
  body, 
  endpoint, 
  tradingMode = 'paper',
  userId 
}: AlpacaConnectionProps) {
  const [fetchedData, setFetchedData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAlpacaData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get the appropriate configuration for the trading mode
        const config = getAlpacaConfig(tradingMode);
        const headers = createAlpacaBrokerHeaders(tradingMode);

        console.log(`Alpaca API call - ${method} ${endpoint} (${tradingMode} mode)`);

        const requestOptions: RequestInit = {
          method: method,
          headers: headers,
          body: body ? JSON.stringify(body) : null,
        };

        const response = await fetch(`${config.brokerBaseUrl}${endpoint}`, requestOptions);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.text();
        const fetchData = JSON.parse(result);
        
        setFetchedData(fetchData);
        setTableData(fetchData);
        
      } catch (err) {
        console.error('Alpaca API error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        setFetchedData([]);
        setTableData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAlpacaData();
  }, [method, endpoint, body, tradingMode, setTableData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-sm text-gray-600">Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border border-red-200 rounded-lg bg-red-50">
        <div className="text-red-800 text-sm">
          <strong>Error:</strong> {error}
        </div>
        <div className="text-xs text-red-600 mt-1">
          Trading Mode: {tradingMode} | Endpoint: {endpoint}
        </div>
      </div>
    );
  }

  return null; // Data is passed via setTableData callback
}