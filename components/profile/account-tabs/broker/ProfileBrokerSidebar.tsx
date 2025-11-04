'use client';

import React, {Suspense, useEffect, useState} from 'react';
import {ChevronRight} from "lucide-react";

import {BROKERS} from "@/utils/profile/Brokers";
import {BrokerConnection, BrokerConnectionStatus} from "@/types/profile/settings/BrokerTypes";
import {getData} from "@/actions/get";

interface BrokerSidebarProps {
    selectedBrokerId: string;
    onBrokerSelect: (id: string) => void;
}

const ProfileBrokerSidebar: React.FC<BrokerSidebarProps> = ({ selectedBrokerId, onBrokerSelect }) => {

    const [brokerConnections, setBrokerConnections] = useState<BrokerConnection>()

    async function getBrokerConnections() {
        return await getData('/accounts/connection')
    }

    useEffect(() => {
        getBrokerConnections()
            .then((response: BrokerConnectionStatus) => {
                if (response.status) {
                    setBrokerConnections(response.data)
                }
            })
    }, [])

    return (
        <aside className="w-64 pt-12 pl-12 flex-shrink-0">
            <nav>
                {BROKERS.map((broker) => (
                    <button
                        key={broker.id}
                        className={`flex items-center justify-between w-full py-3 mb-2 transition-colors duration-300 group text-left ${
                            selectedBrokerId === broker.id
                                ? 'text-white font-medium'
                                : 'text-gray-600 hover:text-gray-300'
                        }`}
                        onClick={() => onBrokerSelect(broker.id)}
                    >
                        <span className="text-base">{broker.name}</span>
                        <div className="flex items-center gap-2">
                            <Suspense fallback={null}>
                                {brokerConnections && brokerConnections[broker.name.toLowerCase()] &&
                                    <small className="text-greenSecondary-800 text-xs">Connected</small>
                                }
                            </Suspense>
                            <ChevronRight className={`w-5 h-5 transition-opacity ${selectedBrokerId === broker.id ? 'opacity-100 text-gray-400' : 'opacity-50 group-hover:opacity-100'}`} />
                        </div>
                    </button>
                ))}
            </nav>
        </aside>
    );
};

export default ProfileBrokerSidebar;
