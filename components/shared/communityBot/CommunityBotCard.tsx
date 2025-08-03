import React from 'react';
import {Line, LineChart, ResponsiveContainer} from "recharts";
import {Avatar, Button} from "@heroui/react";

export type CommunityBotCardProps = {
    name: string;
    active: boolean;
    changePct: number;
    sparklineData: number[];
    transactions: number;
    successRate: number;
    avatarUrl: string;
    creatorName: string;
    likes: number;
    followers: number;
    onDeploy: () => void;
    onChangeSettings: () => void;
};

const data = [
    { value: 100 },
    { value: 120 },
    { value: 110 },
    { value: 140 },
    { value: 130 },
    { value: 160 },
    { value: 150 },
];

export const CommunityBotCard: React.FC<CommunityBotCardProps> = ({
  name,
  active,
  changePct,
  transactions,
  successRate,
  avatarUrl,
  creatorName,
  likes,
  followers,
}) => {
    const statusText = active ? 'Active' : 'Inactive';
    const changeColor = changePct >= 0 ? 'text-green-400' : 'text-red-400';

    return (
        <div className="bg-dark-gray rounded-xl p-6 w-full max-w-sm">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h3 className="text-white text-lg font-semibold">{name}</h3>
                    <span className="text-gray-400 text-sm">{statusText}</span>
                </div>
                <div className={`font-bold ${changeColor} text-lg`}>{changePct > 0 ? '+' : ''}{changePct}%</div>
            </div>
            <div className="mb-4">
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
            <div className="flex gap-4 mb-4">
                <div className="text-gray-300 text-sm">
                    <div>Transactions done :</div>
                    <div className="font-medium text-white">{transactions}</div>
                </div>
                <div className="text-gray-300 text-sm">
                    <div>Success rate :</div>
                    <div className="font-medium text-white">{successRate}%</div>
                </div>
            </div>
            <div className="flex gap-3 mb-4">
                <Button variant="bordered">Deploy</Button>
                <Button variant="bordered">Change Settings</Button>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                <div className="flex items-center gap-2">
                    <Avatar alt={creatorName} size="sm" src={avatarUrl} />
                    <span className="text-gray-200 text-sm font-medium">{creatorName}</span>
                    <Button size="sm">Follow</Button>
                </div>
                <div className="flex items-center gap-4 text-gray-400 text-sm">
                    <div className="flex items-center gap-1">
                        ❤️<span>{likes}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        👥<span>{followers}</span>
                    </div>
                </div>
            </div>
        </div>
    )
};
