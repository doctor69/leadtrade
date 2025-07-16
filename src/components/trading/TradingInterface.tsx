import { useState } from 'react';
import StockSearch from './StockSearch';
import TradeForm from './TradeForm';

interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
}

export default function TradingInterface() {
  const [selectedStock, setSelectedStock] = useState<StockData | null>(null);

  const handleStockSelect = (stock: StockData) => {
    setSelectedStock(stock);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div>
        <StockSearch onSelectStock={handleStockSelect} />
      </div>
      <div>
        <TradeForm selectedStock={selectedStock} />
      </div>
    </div>
  );
}