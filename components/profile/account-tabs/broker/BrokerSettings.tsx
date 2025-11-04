'use client';

import React, { useState, useMemo } from 'react';

import AnimatedLogo from './AnimatedLogo';
import BrokerContent from './BrokerContent';

import {BROKERS} from "@/utils/profile/Brokers";
import ProfileBrokerSidebar from "@/components/profile/account-tabs/broker/ProfileBrokerSidebar";

const BrokerSettingsPage: React.FC = () => {
    const [selectedBrokerId, setSelectedBrokerId] = useState<string>(BROKERS[0].id);
    const [rotation, setRotation] = useState<number>(0);

    const selectedBroker = useMemo(() =>
            BROKERS.find(broker => broker.id === selectedBrokerId)!,
        [selectedBrokerId]
    );

    const handleBrokerSelect = (id: string) => {
        if (id !== selectedBrokerId) {
            setSelectedBrokerId(id);
            setRotation(prev => prev + 90);
        }
    };

    const pageStyle = {
        '--accent-color': selectedBroker.accentColor
    } as React.CSSProperties;

    return (
        <div className="min-h-[80svh] w-full max-w-5xl ua-card text-white flex overflow-hidden">
            <div className='flex flex-1 relative w-fit mx-auto' style={pageStyle}>

                <div className='absolute top-7 right-7 transform translate-x-1/2 -translate-y-1/2 pointer-events-none z-0 opacity-90'>
                    <AnimatedLogo
                        accentColor={selectedBroker.accentColor}
                        rotation={rotation}
                    />
                </div>

                <ProfileBrokerSidebar
                    selectedBrokerId={selectedBrokerId}
                    onBrokerSelect={handleBrokerSelect}
                />

                <BrokerContent selectedBroker={selectedBroker} />

            </div>
        </div>
    );
};

export default BrokerSettingsPage;
