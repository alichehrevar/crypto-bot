'use client'; // This directive is necessary as the component uses hooks (useState, useMemo) and event handlers.

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

// ============================================================================
// 1. TYPE DEFINITIONS (TypeScript)
// ============================================================================

// Defines the shape for rich text parts, which can be either plain text or a hyperlink.
type RichTextPart =
    | { type: 'text'; content: string }
    | { type: 'link'; content: string; url: string };

// Defines an individual instruction step, including optional hints.
type InstructionStep = {
    content: string | RichTextPart[];
    hint?: string;
};

// Defines the complete structure for a broker object.
type Broker = {
    id: string;
    name: string;
    logo: string;
    accentColor: string;
    instructions: InstructionStep[];
};

// ============================================================================
// 2. DATA DEFINITION
// ============================================================================

// This typed array holds all the static data for the brokers.
const BROKERS: Broker[] = [
    {
        id: 'binance',
        name: 'Binance',
        logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1839.png',
        accentColor: '#F0B90B',
        instructions: [
            { content: [
                    { type: 'text', content: 'Login to your Binance ' },
                    { type: 'link', content: 'account', url: 'https://accounts.binance.com/en/login' }
                ] },
            { content: [{ type: 'text', content: "Go to " }, { type: 'link', content: "API Management", url: 'https://www.binance.com/en/my/settings/api-management' }] },
            { content: "Click 'Create API' (System generated)" },
            { content: "Enable 'Spot & Margin Trading'", hint: "Important: Disable 'Withdrawals'" },
            { content: "Copy the API Key and Secret Key" }
        ]
    },
    {
        id: 'okx',
        name: 'OKX',
        logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/825.png',
        accentColor: '#FFFFFF',
        instructions: [
            { content: [
                    { type: 'text', content: 'Login to your OKX ' },
                    { type: 'link', content: 'account', url: 'https://www.okx.com/login' }
                ] },
            { content: [{ type: 'text', content: "Go to " }, { type: 'link', content: "API", url: 'https://www.okx.com/account/my-api' }, { type: 'text', content: ", then 'Create V5 API key'" }] },
            { content: "Set a strong passphrase" },
            { content: "Set permissions to 'Read' & 'Trade'", hint: "Important: Do not enable withdrawals" },
            { content: "Copy Key, Secret, & Passphrase" }
        ]
    },
    {
        id: 'bingx',
        name: 'BingX',
        logo: 'https://bingx.com/en-us/global-navigation/bingx-logo.svg',
        accentColor: '#4A90E2', // Corrected hex color
        instructions: [
            { content: [
                    { type: 'text', content: 'Login to your BingX ' },
                    { type: 'link', content: 'account', url: 'https://bingx.com/en-us/login/' }
                ] },
            { content: [{ type: 'text', content: "Go to " }, { type: 'link', content: "API Management", url: 'https://bingx.com/en-us/account/api/' }] },
            { content: "Click 'Create API' & set permissions" },
            { content: "Complete 2FA verification" },
            { content: "Copy the API Key and Secret Key" }
        ]
    },
    {
        id: 'bybit',
        name: 'Bybit',
        logo: 'https://s2.coinmarketcap.com/static/img/coins/64x64/11414.png',
        accentColor: '#F7A600',
        instructions: [
            { content: [
                    { type: 'text', content: 'Login to your Bybit ' },
                    { type: 'link', content: 'account', url: 'https://www.bybit.com/en/login' },
                ] },
            { content: [
                    { type: 'text', content: 'Then go to ' },
                    { type: 'link', content: 'API', url: 'https://www.bybit.com/app/user/api-management' }
                ]},
            { content: "Click 'Create New Key'  'System-Generated'" },
            { content: "Set permissions to 'Read-Write'", hint: "Important: Ensure 'Withdrawals' are disabled" },
            { content: "Copy the API Key and Secret" }
        ]
    },
    {
        id: 'coinbase',
        name: 'Coinbase',
        logo: 'https://cryptologos.cc/logos/coinbase-coin-logo.svg?v=023',
        accentColor: '#0052FF',
        instructions: [
            { content: [
                    { type: 'text', content: 'Login to your Coinbase ' },
                    { type: 'link', content: 'account', url: 'https://login.coinbase.com/' }
                ] },
            { content: [{ type: 'text', content: "Go to Settings  " }, { type: 'link', content: "API", url: 'https://www.coinbase.com/settings/api' }] },
            { content: "Click 'New API Key'" },
            { content: "Enable trading permissions", hint: "e.g., 'wallet:trades:create'" },
            { content: "Copy the API Key and Secret", hint: "Important: Ensure withdrawals are disabled" }
        ]
    },
    {
        id: 'kraken',
        name: 'Kraken',
        logo: 'https://cryptologos.cc/logos/kraken-krl-logo.svg?v=023',
        accentColor: '#5841D8',
        instructions: [
            { content: [
                    { type: 'text', content: 'Login to your Kraken ' },
                    { type: 'link', content: 'account', url: 'https://www.kraken.com/sign-in' }
                ] },
            { content: [{ type: 'text', content: "Go to Security  " }, { type: 'link', content: "API", url: 'https://www.kraken.com/u/security/api' }] },
            { content: "Click 'Add key'" },
            { content: "Enable 'Query Funds' permission" },
            { content: "Enable 'Create & Modify Orders'", hint: "Important: Do not enable 'Withdraw Funds'" },
            { content: "Copy the API & Private Key" }
        ]
    },
];

// ============================================================================
// 3. UTILITY COMPONENTS
// ============================================================================

// Prop types for the AnimatedLogo component.
interface AnimatedLogoProps {
    rotation: number;
    accentColor: string;
}

/**
 * AnimatedLogo: A decorative background element using framer-motion.
 */
const AnimatedLogo: React.FC<AnimatedLogoProps> = ({ rotation, accentColor }) => {
    const sizeClasses = "w-[800px] h-[800px]";

    return (
        <motion.svg
            animate={{ rotate: rotation, color: accentColor }}
            className={sizeClasses}
            transition={{ duration: 1.5, ease: [0.76, 0, 0.24, 1] }}
            viewBox="0 0 100 100"
            xmlns="http://www.w3.org/2000/svg"
        >
            <g opacity="0.4" stroke="currentColor" strokeWidth="1.2">
                <line x1="50" x2="28" y1="50" y2="28" />
                <line x1="50" x2="72" y1="50" y2="28" />
                <line x1="50" x2="72" y1="50" y2="72" />
                <line x1="50" x2="32" y1="50" y2="68" />
            </g>
            <g fill="currentColor" opacity="1">
                <circle cx="50" cy="50" r="10" />
                <circle cx="28" cy="28" r="6" />
                <circle cx="72" cy="28" r="6" />
                <circle cx="72" cy="72" r="6" />
                <circle cx="32" cy="68" r="5" />
            </g>
        </motion.svg>
    );
}

// Prop types for the InputField component.
interface InputFieldProps {
    label: string;
    type?: string;
}

/**
 * InputField: A reusable styled input component for the API credentials form.
 */
const InputField: React.FC<InputFieldProps> = ({ label, type = "password" }) => (
    <div className='flex flex-col gap-2'>
        <label className="block text-gray-300 text-sm font-medium ml-1">
            {label}
        </label>
        <input
            className="bg-black border border-gray-700/80 rounded-md w-full py-2 px-6 text-gray-200 leading-tight focus:outline-none focus:ring-1 focus:border-gray-600 transition duration-300 ease-in-out"
            type={type}
            // The invalid `ringColor` style property has been removed to fix the TypeScript error.
            // The focus ring is still applied via the `focus:ring-1` Tailwind class.
        />
    </div>
);

// ============================================================================
// 4. MAIN PAGE COMPONENT
// ============================================================================

const BrokerSettingsPage: React.FC = () => {
    // State to track the currently selected broker's ID.
    const [selectedBrokerId, setSelectedBrokerId] = useState<string>(BROKERS[0].id);
    // State to manage the cumulative rotation of the AnimatedLogo.
    const [rotation, setRotation] = useState<number>(0);

    // useMemo efficiently finds the full broker object when the ID changes.
    const selectedBroker = useMemo(() =>
            BROKERS.find(broker => broker.id === selectedBrokerId),
        [selectedBrokerId]
    );

    // Handles broker selection, updating state and triggering the logo rotation.
    const handleBrokerSelect = (id: string) => {
        if (id !== selectedBrokerId) {
            setSelectedBrokerId(id);
            // Increment rotation by 90 degrees for a distinct transition.
            setRotation(prev => prev + 90);
        }
    };

    // The 'style' prop is cast to React.CSSProperties to allow for CSS custom properties.
    const pageStyle = {
        '--accent-color': selectedBroker?.accentColor || '#FFFFFF'
    } as React.CSSProperties;

    return (
        // Main container uses a strict black background and prevents overflow.
        <div className="bg-black min-h-screen text-white font-sans flex overflow-hidden">

            {/* Page layout container with a max-width and centered horizontally. */}
            <div className='flex flex-1 relative max-w-[1167px] mx-auto' style={pageStyle}>

                {/* The AnimatedLogo is positioned absolutely. */}
                <div className='absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2 pointer-events-none z-0 opacity-90'>
                    {selectedBroker && (
                        <AnimatedLogo
                            accentColor={selectedBroker.accentColor}
                            rotation={rotation}
                        />
                    )}
                </div>

                {/* Sidebar for Broker Selection */}
                <aside className="w-64 pt-12 pl-12 flex-shrink-0">
                    <nav>
                        {/* Map over the BROKERS array to dynamically generate the selection list. */}
                        {BROKERS.map((broker) => (
                            <button
                                key={broker.id}
                                className={`flex items-center justify-between w-full py-3 mb-2 transition-colors duration-300 group text-left ${
                                    selectedBrokerId === broker.id
                                        ? 'text-white font-medium' // Style for the active broker
                                        : 'text-gray-600 hover:text-gray-300' // Style for inactive brokers
                                }`}
                                onClick={() => handleBrokerSelect(broker.id)}
                            >
                                <span className='text-base'>{broker.name}</span>
                                <ChevronRight className={`w-5 h-5 transition-opacity ${selectedBrokerId === broker.id ? 'opacity-100 text-gray-400' : 'opacity-50 group-hover:opacity-100'}`} />
                            </button>
                        ))}
                    </nav>
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 px-16 pt-12 pb-16">
                    {/* AnimatePresence ensures smooth transitions when the selectedBroker changes. */}
                    <AnimatePresence mode="wait">
                        {selectedBroker && (
                            <motion.div
                                key={selectedBroker.id} // The key is crucial for AnimatePresence to detect changes.
                                animate={{ opacity: 1, y: 0 }}
                                className="flex flex-col h-full relative z-10"
                                exit={{ opacity: 0, y: -10 }}
                                initial={{ opacity: 0, y: 10 }}
                                transition={{ duration: 0.4 }}
                            >
                                {/* Header displaying the broker's name and logo. */}
                                <header className="flex items-center mb-10">
                                    <h1 className="text-2xl font-light mr-4">{selectedBroker.name}</h1>
                                    <img
                                        alt={`${selectedBroker.name} logo`}
                                        className="w-10 h-10 object-contain"
                                        src={selectedBroker.logo}
                                        // Handle image loading errors with a typed event.
                                        onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                                            e.currentTarget.src = `https://placehold.co/64x64/171717/FFFFFF?text=${selectedBroker.name.charAt(0)}`;
                                        }}
                                    />
                                </header>

                                {/* Instructions Section */}
                                <section className="w-full max-w-md">
                                    <h2 className='text-lg mb-4 font-semibold text-gray-300'>Connection Steps</h2>
                                    <div className="space-y-3">
                                        {selectedBroker.instructions.map((step, index) => (
                                            <div key={index}>
                                                <div className="flex items-start text-sm">
                                                    <span className="text-gray-400 font-medium mr-3">{index + 1}.</span>
                                                    <p className='text-gray-400 leading-relaxed'>
                                                        {/* This block handles rendering of rich text (links and plain text). */}
                                                        {Array.isArray(step.content) ? (
                                                            step.content.map((part, partIndex) =>
                                                                part.type === 'link' ? (
                                                                    <a key={partIndex} className="text-blue-400 hover:underline" href={part.url} rel="noopener noreferrer" target="_blank">
                                                                        {part.content}
                                                                    </a>
                                                                ) : (
                                                                    <span key={partIndex}>{part.content}</span>
                                                                )
                                                            )
                                                        ) : (
                                                            // Fallback for simple string instructions.
                                                            step.content
                                                        )}
                                                    </p>
                                                </div>
                                                {/* Conditionally render the hint if it exists. */}
                                                {step.hint && (
                                                    <div className="flex items-start text-sm ml-8 mt-1 pl-1">
                                                        <span className="text-gray-500 mr-2">•</span>
                                                        <p className="text-gray-500 font-medium">{step.hint}</p>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                {/* API Credentials Form Section */}
                                <section className="mt-auto w-full pt-20 flex flex-col items-end">
                                    <div className="grid grid-cols-2 gap-8 max-w-xl w-full">
                                        <InputField label="API Key" type="text" />
                                        {/* Conditionally render fields for OKX, which requires a passphrase. */}
                                        {selectedBroker.id === 'okx' ? (
                                            <div className="grid grid-cols-2 gap-4">
                                                <InputField label="API Secret" />
                                                <InputField label="Passphrase" />
                                            </div>
                                        ) : (
                                            <InputField label="API Secret" />
                                        )}
                                    </div>
                                    <div className='flex justify-end mt-12 max-w-xl w-full'>
                                        <button className="bg-white text-black font-semibold py-2 px-8 rounded-md transition duration-300 ease-in-out hover:bg-gray-200">
                                            Connect
                                        </button>
                                    </div>
                                </section>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </main>
            </div>
        </div>
    );
};

export default BrokerSettingsPage;

