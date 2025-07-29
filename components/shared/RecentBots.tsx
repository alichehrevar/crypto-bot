import React from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCoverflow, Navigation, Pagination } from "swiper/modules";

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

const data = [
  { value: 100 },
  { value: 120 },
  { value: 110 },
  { value: 140 },
  { value: 130 },
  { value: 160 },
  { value: 150 },
];

const todayBots = [
  {
    name: "Technical Bot Bot",
    amount: "$103,000",
    change: "+10.14%",
    trend: "up",
    apy: "7-day APY",
    minInvestment: "$59,291"
  },
  {
    name: "Technical Bot Bot",
    amount: "$103,000",
    change: "+5.2%",
    trend: "up",
    apy: "7-day APY",
    minInvestment: "$52,291"
  },
  {
    name: "DCA Bot Pro",
    amount: "$87,500",
    change: "+3.8%",
    trend: "up",
    apy: "7-day APY",
    minInvestment: "$45,000"
  },
  {
    name: "Grid Trading Bot",
    amount: "$125,000",
    change: "+7.2%",
    trend: "up",
    apy: "7-day APY",
    minInvestment: "$68,500"
  },
  {
    name: "Technical Bot Bot",
    amount: "$103,000",
    change: "+10.14%",
    trend: "up",
    apy: "7-day APY",
    minInvestment: "$59,291"
  },
  {
    name: "Technical Bot Bot",
    amount: "$103,000",
    change: "+5.2%",
    trend: "up",
    apy: "7-day APY",
    minInvestment: "$52,291"
  },
  {
    name: "DCA Bot Pro",
    amount: "$87,500",
    change: "+3.8%",
    trend: "up",
    apy: "7-day APY",
    minInvestment: "$45,000"
  },
  {
    name: "Grid Trading Bot",
    amount: "$125,000",
    change: "+7.2%",
    trend: "up",
    apy: "7-day APY",
    minInvestment: "$68,500"
  }
];

export const RecentBots = () => {

  const pagination = {
    clickable: true,
    dynamicBullets: true,
    renderBullet: function (index: number, className: string) {
      return '<span class="' + className + '"></span>';
    },
  };

  return (
    <div className="bg-black rounded-xl py-6 shadow-xl backdrop-blur-sm">
      <h3 className="text-xl font-semibold text-white mb-6">Today Bots</h3>

      <Swiper
        centeredSlides={true}
        className="today-bots-swiper"
        coverflowEffect={{
          rotate: 50,
          stretch: 0,
          depth: 100,
          modifier: 1,
          slideShadows: true,
        }}
        effect={'coverflow'}
        grabCursor={true}
        loop={true}
        modules={[EffectCoverflow, Pagination, Navigation]}
        navigation={true}
        pagination={pagination}
        slidesPerView={'auto'}
      >
        {todayBots.map((bot, index) => (
          <SwiperSlide key={index}>
            <div className="flex items-center justify-between p-4 bg-dark-gray rounded-lg">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <h4 className="text-white font-medium text-sm">{bot.name}</h4>
                  <span className="text-green-400 text-xs">{bot.change}</span>
                </div>
                <p className="text-2xl font-bold text-white mb-1">{bot.amount}</p>
                <p className="text-gray-400 text-xs mb-1">{bot.apy}</p>
                <div className="text-xs text-gray-400">
                  <span className="block">Min investment</span>
                  <span className="text-white">{bot.minInvestment}</span>
                </div>
              </div>
              <div className="w-24 h-12">
                <ResponsiveContainer height="100%" width="100%">
                  <LineChart data={data}>
                    <Line
                      dataKey="value"
                      dot={false}
                      stroke="#10B981"
                      strokeWidth={2}
                      type="monotone"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};
