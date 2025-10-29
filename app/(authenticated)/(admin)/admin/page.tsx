'use client'

import { Card, CardBody } from '@heroui/react';

export default function AdminHome() {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="glass col-span-1 lg:col-span-2">
                <CardBody>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-white/60">Total Balance</p>
                            <h2 className="text-4xl font-semibold tracking-tight mt-1">$18.47</h2>
                        </div>
                        <div className="h-24 w-56 rounded-xl bg-white/5" />
                    </div>
                    <div className="h-0.5 w-full mt-6 card-line" />
                    <p className="mt-6 text-white/60 text-sm">Welcome back! This is a minimal dashboard stub.</p>
                </CardBody>
            </Card>

            <Card className="glass">
                <CardBody>
                    <p className="text-sm text-white/60">Quick Action</p>
                    <h3 className="text-xl font-medium mt-2">Launch Trading Engine</h3>
                    <button className="mt-4 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 transition">Launch</button>
                </CardBody>
            </Card>

            <Card className="glass lg:col-span-3">
                <CardBody>
                    <h3 className="text-lg font-medium">Recent Bots</h3>
                    <div className="mt-4 grid gap-4 md:grid-cols-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="rounded-xl border border-white/5 p-4 bg-white/5">
                                <div className="text-sm text-white/70">BTC/USDT</div>
                                <div className="text-xs text-white/40">Active</div>
                            </div>
                        ))}
                    </div>
                </CardBody>
            </Card>
        </div>
    );
}
