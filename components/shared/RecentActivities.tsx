
import { useState } from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableColumn,
  TableRow,
  TableCell
} from "@heroui/react";

const activities = [
  { symbol: 'BTC USDT', broker: 'Binance', execution: 'DCA bot', strategy: 'Default', leverage: 'x 50', tpsl: '50% / 50%', unrealizedPnl: '+6.93%', action: 'Close' },
  { symbol: 'ETH USDT', broker: 'OKX', execution: 'manual', strategy: 'Default', leverage: 'x 50', tpsl: '50% / 50%', unrealizedPnl: '+5.67%', action: 'Close' },
  { symbol: 'LTC USDT', broker: 'Bingx', execution: 'Technical bot', strategy: 'Dynamic', leverage: 'x 50', tpsl: '50% / 50%', unrealizedPnl: '-3.33%', action: 'Close' },
  { symbol: 'XMR USDT', broker: 'Bingx', execution: 'manual', strategy: 'Default', leverage: 'x 100', tpsl: '50% / 50%', unrealizedPnl: '-6.93%', action: 'Close' },
  { symbol: 'BNB USDT', broker: 'OKX', execution: 'DCA bot', strategy: 'Dynamic', leverage: 'x 20', tpsl: '50% / 50%', unrealizedPnl: '+0.01%', action: 'Close' },
  { symbol: 'BTC USDT', broker: 'Bingx', execution: 'Technical bot', strategy: 'Optimiton', leverage: 'x 50', tpsl: '50% / 50%', unrealizedPnl: 'MARKET', action: 'Close' },
  { symbol: 'LTC USDT', broker: 'OKX', execution: 'manual', strategy: 'Default', leverage: 'x 50', tpsl: '50% / 50%', unrealizedPnl: 'MARKET', action: 'Close' },
  { symbol: 'XMR USDT', broker: 'Binance', execution: 'DCA bot', strategy: 'Optimiton', leverage: 'x 50', tpsl: '50% / 50%', unrealizedPnl: 'MARKET', action: 'Close' },
];

const getCryptoIcon = (symbol: string) => {
  if (symbol.includes('BTC')) return '₿';
  if (symbol.includes('ETH')) return 'Ξ';
  if (symbol.includes('LTC')) return 'Ł';
  if (symbol.includes('XMR')) return 'ɱ';
  if (symbol.includes('BNB')) return '♢';

  return '●';
};

const getCryptoColor = (symbol: string) => {
  if (symbol.includes('BTC')) return 'text-orange-400';
  if (symbol.includes('ETH')) return 'text-green-400';
  if (symbol.includes('LTC')) return 'text-yellow-400';
  if (symbol.includes('XMR')) return 'text-orange-400';
  if (symbol.includes('BNB')) return 'text-green-400';

  return 'text-gray-400';
};

const getPnlColor = (pnl: string) => {
  if (pnl === 'MARKET') return 'text-red-400';
  if (pnl.startsWith('+')) return 'text-green-400';
  if (pnl.startsWith('-')) return 'text-red-400';

  return 'text-gray-400';
};

export const RecentActivities = () => {
  const [activeTab, setActiveTab] = useState('open');

  const handleClosePosition = (index: number) => {
    console.log(`Closing position for ${activities[index].symbol}`);
  };

  return (
    <div className="rounded-xl">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Recent Trading Activities</h3>

        <div className="flex bg-gray-900/80 rounded-lg p-1 backdrop-blur-sm border border-gray-700/30">
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
              activeTab === 'open'
                ? 'bg-white text-black shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
            }`}
            onClick={() => setActiveTab('open')}
          >
            Open
          </button>
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
              activeTab === 'close'
                ? 'bg-white text-black shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
            }`}
            onClick={() => setActiveTab('close')}
          >
            Close
          </button>
        </div>
      </div>

      <Table className="bg-none" classNames={{
        wrapper: 'bg-transparent shadow-none',
      }}>
        <TableHeader>
          <TableHeader className="border-gray-800/50">
            <TableColumn className="text-gray-400 font-medium">Symbol</TableColumn>
            <TableColumn className="text-gray-400 font-medium">Broker</TableColumn>
            <TableColumn className="text-gray-400 font-medium">Execution</TableColumn>
            <TableColumn className="text-gray-400 font-medium">strategy</TableColumn>
            <TableColumn className="text-gray-400 font-medium">Leverage</TableColumn>
            <TableColumn className="text-gray-400 font-medium">TP/SL</TableColumn>
            <TableColumn className="text-gray-400 font-medium">Unrealized Pnl</TableColumn>
            <TableColumn className="text-gray-400 font-medium"><span /></TableColumn>
          </TableHeader>
        </TableHeader>
        <TableBody>
          {activities.map((activity, index) => (
            <TableRow key={index} className={`border-gray-800/30 hover:bg-gray-900/40 ${index === 0 ? 'font-bold' : ''}`}>
              <TableCell className="text-white text-sm">
                <div className="flex items-center gap-2">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${getCryptoColor(activity.symbol)} bg-gray-800`}>
                    {getCryptoIcon(activity.symbol)}
                  </span>
                  {activity.symbol}
                </div>
              </TableCell>
              <TableCell className="text-gray-400 text-sm">{activity.broker}</TableCell>
              <TableCell className="text-white text-sm">{activity.execution}</TableCell>
              <TableCell className="text-gray-400 text-sm">{activity.strategy}</TableCell>
              <TableCell className="text-white text-sm">{activity.leverage}</TableCell>
              <TableCell className="text-sm">
                <span className="text-green-400">50%</span>
                <span className="text-gray-400"> / </span>
                <span className="text-red-400">50%</span>
              </TableCell>
              <TableCell className={`text-sm font-medium ${getPnlColor(activity.unrealizedPnl)}`}>
                {activity.unrealizedPnl}
              </TableCell>
              <TableCell>
                <button
                  className="bg-white text-black hover:bg-gray-200 px-3 py-1 rounded text-xs font-medium transition-colors"
                  onClick={() => handleClosePosition(index)}
                >
                  Close
                </button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
