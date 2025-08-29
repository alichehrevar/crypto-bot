import React from "react";
import {motion} from "framer-motion";

const Tabs: React.FC<{ tabs: string[];activeTab: string; setActiveTab: (tab: string) => void }> = ({
    tabs,
    activeTab,
    setActiveTab
}) => (
    <div className="relative flex space-x-2 bg-dark-semi-black p-1 rounded-md">
        {tabs.map(tab => (
            <button
                key={tab}
                className={`${activeTab === tab ? 'text-black' : 'text-gray-400 hover:text-gray-200'} relative z-10 flex-1 py-1.5 text-sm font-medium rounded-md transition-colors duration-300 focus:outline-none`}
                onClick={() => setActiveTab(tab)}
            >
                {activeTab === tab && (
                    <motion.div
                        className="absolute inset-0 bg-white rounded-md"
                        layoutId="activeTabBackground"
                        transition={{type: 'spring', stiffness: 300, damping: 30}}
                    />
                )}
                <span className="relative">{tab}</span>
            </button>
        ))}
    </div>
);

export default Tabs;
