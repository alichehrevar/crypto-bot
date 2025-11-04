// /components/pages/broker-settings/BrokerContent.tsx
'use client';

import React from 'react';
import Image from "next/image";
import { motion, AnimatePresence } from 'framer-motion';

import BrokerInstructions from './BrokerInstructions';

import TokenForm from "@/components/profile/account-tabs/broker/TokenForm";
import {Broker} from "@/types/profile/settings/BrokerTypes";

interface BrokerContentProps {
    selectedBroker: Broker;
}

const BrokerContent: React.FC<BrokerContentProps> = ({ selectedBroker }) => {
    return (
        <main className="flex-1 px-16 pt-12 pb-16">
            <AnimatePresence mode="wait">
                <motion.div
                    key={selectedBroker.id}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col justify-between h-full relative z-10"
                    exit={{ opacity: 0, y: -10 }}
                    initial={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.4 }}
                >
                    <div>
                        <header className="inline-flex items-center mb-10 backdrop-blur-[2px]">
                            <h1 className="text-2xl font-light mr-4">{selectedBroker.name}</h1>
                            <div className={`relative ${selectedBroker.name === 'bybit' ? 'h-6 aspect-[44/17]' : 'w-6 h-6'}`}>
                                <Image
                                    fill
                                    alt={`${selectedBroker.name} logo`}
                                    className="object-contain"
                                    src={selectedBroker.logo}
                                    onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                                        e.currentTarget.src = `https://placehold.co/64x64/171717/FFFFFF?text=${selectedBroker.name.charAt(0)}`;
                                    }}
                                />
                            </div>
                        </header>

                        <BrokerInstructions instructions={selectedBroker.instructions} />
                    </div>

                    <TokenForm type={selectedBroker.id} />
                </motion.div>
            </AnimatePresence>
        </main>
    );
};

export default BrokerContent;
