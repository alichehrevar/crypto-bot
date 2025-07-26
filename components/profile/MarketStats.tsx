'use client'

import { useState } from 'react';

export default function MarketStats() {
  const [selectedPair, setSelectedPair] = useState('BTC/USDT');

  return (
    <div className="bg-dark-gray backdrop-blur-sm rounded-xl p-4 border border-gray-800/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-sm font-bold text-black">₿</div>
            <div>
              <h1 className="text-xl font-bold text-white">{selectedPair}</h1>
              <p className="text-sm text-gray-400">24h +0.96%</p>
            </div>
          </div>

          {/* Desktop view - show all stats */}
          <div className="hidden lg:flex items-center gap-8">
            <div>
              <p className="text-2xl font-bold text-green-400">406.32</p>
              <p className="text-sm text-gray-400">Last Price</p>
            </div>
            <div>
              <p className="text-lg text-white">24h Change</p>
              <p className="text-sm text-green-400">+3.85 (+0.96%)</p>
            </div>
            <div>
              <p className="text-lg text-white">24h High</p>
              <p className="text-sm text-gray-300">410.50</p>
            </div>
            <div>
              <p className="text-lg text-white">24h Low</p>
              <p className="text-sm text-gray-300">398.20</p>
            </div>
            <div>
              <p className="text-lg text-white">24h Volume</p>
              <p className="text-sm text-gray-300">2,847 BTC</p>
            </div>
          </div>

          {/* Mobile/Tablet view - show only price */}
          <div className="lg:hidden">
            <p className="text-2xl font-bold text-green-400">406.32</p>
            <p className="text-sm text-gray-400">Last Price</p>
          </div>
        </div>
      </div>
    </div>
  );
};
