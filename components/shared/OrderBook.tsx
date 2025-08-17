import { useState, useEffect } from 'react';
import { Divider } from "@heroui/react";

interface OrderData {
  price: number;
  amount: number;
  total: number;
  id: string;
}

export const OrderBook = () => {
  const [activeTab, setActiveTab] = useState('Order Book');
  const [currentPrice, setCurrentPrice] = useState(18794.1);
  const [priceChange, setPriceChange] = useState(0);
  const [sellOrders, setSellOrders] = useState<OrderData[]>([]);
  const [buyOrders, setBuyOrders] = useState<OrderData[]>([]);
  const [recentTrades, setRecentTrades] = useState<Array<{
    price: number;
    amount: number;
    time: string;
    type: 'buy' | 'sell';
    id: string;
  }>>([]);

  // Generate realistic order data
  const generateOrderData = (basePrice: number, isSell: boolean): OrderData[] => {
    return Array.from({ length: 8 }, (_, i) => {
      const priceOffset = isSell ? (i + 1) * 0.5 : -(i + 1) * 0.5;
      const price = basePrice + priceOffset;
      const amount = Math.random() * 0.2 + 0.05;

      return {
        id: `${isSell ? 'sell' : 'buy'}-${i}`,
        price: parseFloat(price.toFixed(1)),
        amount: parseFloat(amount.toFixed(8)),
        total: parseFloat((price * amount).toFixed(8))
      };
    });
  };

  // Generate recent trades
  const generateRecentTrades = () => {
    const trades = [];

    for (let i = 0; i < 10; i++) {
      const now = new Date();

      now.setSeconds(now.getSeconds() - i * 3);
      trades.push({
        id: `trade-${i}`,
        price: currentPrice + (Math.random() - 0.5) * 2,
        amount: Math.random() * 0.1 + 0.01,
        time: now.toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }),
        type: Math.random() > 0.5 ? 'buy' : 'sell' as 'buy' | 'sell'
      });
    }

    return trades;
  };

  // Initialize data
  useEffect(() => {
    setSellOrders(generateOrderData(currentPrice, true));
    setBuyOrders(generateOrderData(currentPrice, false));
    setRecentTrades(generateRecentTrades());
  }, [currentPrice]);

  // Simulate real-time price updates
  useEffect(() => {
    const interval = setInterval(() => {
      const change = (Math.random() - 0.5) * 2;
      const newPrice = currentPrice + change;

      setPriceChange(change);
      setCurrentPrice(parseFloat(newPrice.toFixed(1)));

      // Update orders with new base price
      setSellOrders(generateOrderData(newPrice, true));
      setBuyOrders(generateOrderData(newPrice, false));

      // Add new trade
      setRecentTrades(prev => {
        const newTrade = {
          id: `trade-${Date.now()}`,
          price: newPrice,
          amount: Math.random() * 0.1 + 0.01,
          time: new Date().toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          }),
          type: Math.random() > 0.5 ? 'buy' : 'sell' as 'buy' | 'sell'
        };

        return [newTrade, ...prev.slice(0, 9)];
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [currentPrice]);

  const OrderRow = ({ order, type }: { order: OrderData, type: 'buy' | 'sell' }) => (
    <div className={`grid grid-cols-3 gap-2 text-xs hover:bg-gray-800/30 p-1 rounded transition-all duration-200 animate-fade-in ${
      type === 'sell' ? 'hover:bg-red-900/10' : 'hover:bg-green-900/10'
    }`}>
      <span className={`font-mono ${type === 'sell' ? 'text-red-400' : 'text-green-400'}`}>
        {order.price.toFixed(1)}
      </span>
      <span className="text-right text-white font-mono">{order.amount.toFixed(8)}</span>
      <span className="text-right text-gray-300 font-mono">{order.total.toFixed(8)}</span>
    </div>
  );

  const TradeRow = ({ trade }: { trade: typeof recentTrades[0] }) => (
    <div className="grid grid-cols-3 gap-2 text-xs hover:bg-gray-800/30 p-1 rounded transition-all duration-200 animate-fade-in">
      <span className={`font-mono ${trade.type === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
        {trade.price.toFixed(1)}
      </span>
      <span className="text-right text-white font-mono">{trade.amount.toFixed(6)}</span>
      <span className="text-right text-gray-400 text-xs">{trade.time}</span>
    </div>
  );

  return (
    <div className="bg-dark-gray backdrop-blur-sm rounded-xl border border-gray-800/50 h-full w-full">
      {/* Tabs */}
      <div className="flex border-b border-gray-800/50">
        <button
          className={`px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'Order Book'
              ? 'text-white border-b-2 border-white'
              : 'text-gray-400 hover:text-white'
          }`}
          onClick={() => setActiveTab('Order Book')}
        >
          Order Book
        </button>
        <button
          className={`px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'Recent Trade'
              ? 'text-white border-b-2 border-white'
              : 'text-gray-400 hover:text-white'
          }`}
          onClick={() => setActiveTab('Recent Trade')}
        >
          Recent Trade
        </button>
      </div>

      <div className="p-4">
        {activeTab === 'Order Book' ? (
          <>
            {/* Controls */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-2">
                <div className="w-4 h-4 bg-green-600 rounded-sm animate-pulse" />
                <div className="w-4 h-4 bg-red-600 rounded-sm animate-pulse" />
                <div className="w-4 h-4 bg-gray-600 rounded-sm" />
              </div>
              <div className="text-xs text-gray-400">
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse" />
                Live
              </div>
            </div>

            <div className="flex items-start justify-center flex-col lg:flex-row w-full gap-2.5">
              <div className="flex items-center justify-start flex-col gap-3 w-full">
                {/* Headers */}
                <div className="grid grid-cols-3 gap-2 text-xs text-gray-400 mb-2 font-medium w-full">
                  <span>Price(USDT)</span>
                  <span className="text-right">Amount(BTC)</span>
                  <span className="text-right">Total(BTC)</span>
                </div>
                {/* Sell Orders */}
                <div className="space-y-1 mb-3 w-full">
                  {sellOrders.slice(0, 5).reverse().map((order) => (
                    <OrderRow key={order.id} order={order} type="sell" />
                  ))}
                </div>
              </div>
              <Divider className="h-full" orientation="vertical" />
              <div className="flex items-center justify-start flex-col gap-3 w-full">
                {/* Headers */}
                <div className="grid grid-cols-3 gap-2 text-xs text-gray-400 mb-2 font-medium w-full">
                  <span>Price(USDT)</span>
                  <span className="text-right">Amount(BTC)</span>
                  <span className="text-right">Total(BTC)</span>
                </div>
                {/* Buy Orders */}
                <div className="space-y-1 mb-3 w-full">
                  {buyOrders.slice(0, 6).map((order) => (
                    <OrderRow key={order.id} order={order} type="buy" />
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Recent Trades Header */}
            <div className="grid grid-cols-3 gap-2 text-xs text-gray-400 mb-3 font-medium">
              <span>Price(USDT)</span>
              <span className="text-right">Amount(BTC)</span>
              <span className="text-right">Time</span>
            </div>

            {/* Recent Trades List */}
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {recentTrades.map((trade) => (
                <TradeRow key={trade.id} trade={trade} />
              ))}
            </div>
          </>
        )}
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes fade-in {
            from { opacity: 0; transform: translateY(-2px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in {
            animation: fade-in 0.3s ease-out;
          }
        `
      }} />
    </div>
  );
};
