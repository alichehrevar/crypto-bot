'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import clsx from 'clsx';

// --- TYPESCRIPT DEFINITIONS ---
type View = 'main' | 'faq' | 'contact' | 'tickets' | 'new-ticket' | 'ticket-detail';

interface Faq {
    category: string;
    question: string;
    answer: string;
}

interface TicketMessage {
    author: 'You' | 'Support';
    message: string;
    date: string;
}

interface Ticket {
    id: string;
    subject: string;
    status: 'Open' | 'Closed';
    updated: string;
    created: string;
    priority: 'High' | 'Medium' | 'Low';
    conversation: TicketMessage[];
}

// --- MOCK DATA ---
const faqData: Faq[] = [
    { category: "Getting Started", question: "What is United Algos?", answer: "United Algos is a state-of-the-art algorithmic trading platform specializing in cryptocurrency markets. We provide automated trading tools like grid bots, DCA bots, and custom AI strategies." },
    { category: "Getting Started", question: "How do I connect my exchange account?", answer: "Navigate to 'Settings' > 'API Management'. Generate an API key on your exchange (e.g., Binance, Coinbase Pro) and input the key and secret securely on our platform. Ensure 'Trade' permissions are enabled." },
    { category: "Security", question: "How are my API keys stored?", answer: "API keys are encrypted using AES-256 standards and stored securely. We strongly recommend enabling Two-Factor Authentication (2FA) for added account security." },
    { category: "Trading & Algorithms", question: "What is a Grid Bot?", answer: "A Grid Bot automates buying and selling at preset price intervals. It places a 'grid' of orders above and below the current price, executing trades as the price moves, which is ideal for ranging markets." },
    { category: "Billing & Subscriptions", question: "What payment methods are accepted?", answer: "We accept major credit cards (Visa, MasterCard, Amex) via Stripe, and various cryptocurrencies including BTC, ETH, and USDT (ERC-20)." },
];

const ticketData: Ticket[] = [
    { id: "TKT-1045", subject: "API Connection Timeout Issue with Binance Futures", status: "Open", updated: "2 hours ago", created: "Oct 10, 2025", priority: "High", conversation: [{ author: "You", message: "I'm experiencing intermittent timeout issues when trying to connect to the Binance Futures API.", date: "Oct 10, 2025, 3:45 PM" }, { author: "Support", message: "Thank you for reaching out. We're aware of some network latency and are investigating.", date: "Oct 10, 2025, 4:12 PM" }] },
    { id: "TKT-1043", subject: "Feature Request: Add Trailing Stop Loss Feature", status: "Open", updated: "2 days ago", created: "Oct 8, 2025", priority: "Medium", conversation: [{ author: "You", message: "It would be great if you could add a trailing stop loss feature to the grid bots.", date: "Oct 8, 2025, 9:22 AM" }] },
    { id: "TKT-1042", subject: "Billing inquiry regarding subscription renewal", status: "Closed", updated: "5 days ago", created: "Oct 5, 2025", priority: "Low", conversation: [{ author: "You", message: "Hi, I just wanted to confirm that my subscription was successfully renewed.", date: "Oct 5, 2025, 1:15 PM" }, { author: "Support", message: "Hi there, I've checked your account and can confirm your Pro subscription is active.", date: "Oct 5, 2025, 1:30 PM" }] },
];

// --- SVG ICONS (as React Components) ---
const FaqIcon = () => <svg className="h-12 w-12 sm:h-16 sm:w-16 text-[var(--color-primary-action)]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const ContactIcon = () => <svg className="h-12 w-12 sm:h-16 sm:w-16 text-[var(--color-primary-action)]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const TicketIcon = () => <svg className="h-12 w-12 sm:h-16 sm:w-16 text-[var(--color-primary-action)]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const BackArrowIcon = () => <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M10 19l-7-7m0 0l7-7m-7 7h18" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const SearchIcon = () => <svg className="h-6 w-6 text-[var(--color-text-tertiary)]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const ChevronDownIcon = ({ isOpen }: { isOpen: boolean }) => <svg className={clsx("h-5 w-5 transition-transform duration-300 transform flex-shrink-0", isOpen && "rotate-180")} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>;
const TwitterIcon = () => <svg fill="currentColor" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>;
const DiscordIcon = () => <svg fill="currentColor" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M20.317 4.369a1.875 1.875 0 00-1.488-.862H5.17a1.875 1.875 0 00-1.488.862 21.282 21.282 0 00-2.348 9.3c0 .385.023.766.065 1.144a1.875 1.875 0 001.01 1.618 19.062 19.062 0 004.975 2.247.75.75 0 00.672-.119 14.546 14.546 0 002.83-2.133.75.75 0 00-.097-.999 9.375 9.375 0 01-1.332-2.145.75.75 0 01.298-.942A12.35 12.35 0 0012 12a12.35 12.35 0 003.53-2.214.75.75 0 01.298.942 9.375 9.375 0 01-1.332 2.145.75.75 0 00-.097.999 14.546 14.546 0 002.83 2.133.75.75 0 00.672.119 19.062 19.062 0 004.975-2.247 1.875 1.875 0 001.01-1.618c.042-.378.065-.76.065-1.144a21.282 21.282 0 00-2.348-9.3zM8.25 13.5a1.875 1.875 0 110-3.75 1.875 1.875 0 010 3.75zm7.5 0a1.875 1.875 0 110-3.75 1.875 1.875 0 010 3.75z" /></svg>;
const TelegramIcon = () => <svg fill="currentColor" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M22 2L11 13l-9 3 7-8-11-4 22-2zm-3.233 17.065l-2.001-7.001-4.766 4.766 6.767 2.235z" /></svg>;

// --- UI COMPONENTS ---
const ThemeToggle = ({ onToggle }: { onToggle: () => void }) => <button className="fixed bottom-4 right-4 z-50 bg-gray-800 text-white dark:bg-white dark:text-black px-4 py-2 rounded-full shadow-lg" onClick={onToggle}>Toggle Theme</button>;
const Notification = ({ message }: { message: string | null }) => <div className={clsx('fixed top-5 right-5 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg transition-all duration-500 z-50', message ? 'translate-y-0 opacity-100' : 'opacity-0 translate-y-[-200%]')}>{message && <p>{message}</p>}</div>;
const BackButton = ({ onClick, text = 'Back' }: { onClick: () => void; text?: string }) => <button className="flex items-center space-x-2 text-[var(--color-text-primary)] hover:text-[var(--color-text-tertiary)] transition-colors absolute left-0" onClick={onClick}><BackArrowIcon /><span className="font-semibold hidden sm:inline">{text}</span></button>;
const FaqItem = ({ faq, isOpen, onToggle }: { faq: Faq; isOpen: boolean; onToggle: () => void; }) => { const contentRef = useRef<HTMLDivElement>(null);

 return <div className={clsx('border rounded-xl overflow-hidden mb-4 transition-all duration-300', isOpen ? 'border-[var(--color-border-primary)] border-2' : 'border-[var(--color-border-secondary)]')}><button className="w-full text-left p-5 font-semibold flex justify-between items-center text-sm text-[var(--color-text-primary)]" onClick={onToggle}><span>{faq.question}</span><ChevronDownIcon isOpen={isOpen} /></button><div ref={contentRef} className="overflow-hidden transition-all duration-500 ease-in-out" style={{ maxHeight: isOpen ? contentRef.current?.scrollHeight + 'px' : '0px' }}><div className="p-5 border-t border-[var(--color-border-secondary)] text-sm text-[var(--color-text-secondary)] bg-[var(--color-card-hover-bg)]"><p>{faq.answer}</p></div></div></div>; };

// --- VIEW COMPONENTS ---
const HelpMainView = ({ isVisible, onNavigate }: { isVisible: boolean; onNavigate: (view: View) => void; }) => <div className={clsx('view-container view-main', isVisible ? 'view-visible' : 'view-hidden')}><header className="text-center mt-8"><h1 className="text-3xl sm:text-4xl font-extrabold mb-4 text-[var(--color-text-primary)]">United Algos Help Center</h1><p className="text-md sm:text-lg text-[var(--color-text-secondary)]">How can we assist you today?</p></header><main className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 px-4 sm:px-8 flex-grow items-start my-8"><button className="bg-[var(--color-card-bg)] border-2 border-[var(--color-border-secondary)] selectable-card rounded-3xl p-6 sm:p-8 text-center cursor-pointer transition-all duration-300 ease-in-out transform hover:-translate-y-1 hover:shadow-xl hover:border-[var(--color-border-primary)] h-full flex flex-col" tabIndex={0} onClick={() => onNavigate('faq')}><div className="mb-6 flex justify-center"><FaqIcon /></div><h2 className="text-base sm:text-lg font-bold mb-4 text-[var(--color-text-primary)]">Knowledge Base & FAQ</h2><p className="text-xs text-[var(--color-text-secondary)]">Find answers to common questions and learn how to use our platform effectively.</p></button><div className="bg-[var(--color-card-bg)] border-2 border-[var(--color-border-secondary)] selectable-card rounded-3xl p-6 sm:p-8 text-center cursor-pointer transition-all duration-300 ease-in-out transform hover:-translate-y-1 hover:shadow-xl hover:border-[var(--color-border-primary)] h-full flex flex-col" tabIndex={0} onClick={() => onNavigate('contact')}><div className="mb-6 flex justify-center"><ContactIcon /></div><h2 className="text-base sm:text-lg font-bold mb-4 text-[var(--color-text-primary)]">Send Us a Message</h2><p className="text-xs text-[var(--color-text-secondary)]">Have a general inquiry or feedback? Send us an email, and our team will respond promptly.</p></div><div className="bg-[var(--color-card-bg)] border-2 border-[var(--color-border-secondary)] selectable-card rounded-3xl p-6 sm:p-8 text-center cursor-pointer transition-all duration-300 ease-in-out transform hover:-translate-y-1 hover:shadow-xl hover:border-[var(--color-border-primary)] h-full flex flex-col" tabIndex={0} onClick={() => onNavigate('tickets')}><div className="mb-6 flex justify-center"><TicketIcon /></div><h2 className="text-base sm:text-lg font-bold mb-4 text-[var(--color-text-primary)]">Ticket System</h2><p className="text-xs text-[var(--color-text-secondary)]">Open a new support ticket for technical issues or track the status of your existing requests.</p></div></main><section className="px-4 sm:px-8 mt-4"><h2 className="text-xl font-bold mb-4 text-center text-[var(--color-text-primary)]">Featured Articles</h2><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"><a className="block bg-[var(--color-card-bg)] border-2 border-[var(--color-border-secondary)] selectable-card rounded-2xl p-6 transition-all duration-300 ease-in-out transform hover:-translate-y-1" href="#" tabIndex={0}><h3 className="font-bold text-sm mb-2 text-[var(--color-text-primary)]">Getting Started with Grid Bots</h3><p className="text-xs text-[var(--color-text-secondary)]">Learn the fundamentals of setting up your first automated grid trading strategy.</p></a><a className="block bg-[var(--color-card-bg)] border-2 border-[var(--color-border-secondary)] selectable-card rounded-2xl p-6 transition-all duration-300 ease-in-out transform hover:-translate-y-1" href="#" tabIndex={0}><h3 className="font-bold text-sm mb-2 text-[var(--color-text-primary)]">Understanding DCA Strategy</h3><p className="text-xs text-[var(--color-text-secondary)]">A deep dive into Dollar-Cost Averaging and how to apply it effectively in volatile markets.</p></a><a className="block bg-[var(--color-card-bg)] border-2 border-[var(--color-border-secondary)] selectable-card rounded-2xl p-6 transition-all duration-300 ease-in-out transform hover:-translate-y-1" href="#" tabIndex={0}><h3 className="font-bold text-sm mb-2 text-[var(--color-text-primary)]">Securing Your Account</h3><p className="text-xs text-[var(--color-text-secondary)]">Best practices for keeping your API keys and personal information safe.</p></a></div></section><footer className="text-center mt-auto mb-4 text-sm text-[var(--color-text-tertiary)]"><div className="flex justify-center items-center space-x-6 my-4"><a className="hover:text-[var(--color-text-primary)] transition-colors" href="#">Terms of Service</a><a className="hover:text-[var(--color-text-primary)] transition-colors" href="#">Privacy Policy</a></div><div className="flex justify-center items-center space-x-6 text-2xl"><a className="hover:text-[var(--color-text-primary)] transition-colors" href="#" title="Twitter"><TwitterIcon /></a><a className="hover:text-[var(--color-text-primary)] transition-colors" href="#" title="Discord"><DiscordIcon /></a><a className="hover:text-[var(--color-text-primary)] transition-colors" href="#" title="Telegram"><TelegramIcon /></a></div><p className="mt-4 text-xs">© 2025 United Algos. All Rights Reserved.</p></footer></div>;
const FaqView = ({ isVisible, onBack }: { isVisible: boolean; onBack: () => void; }) => { const [searchTerm, setSearchTerm] = useState(''); const [openFaq, setOpenFaq] = useState<string | null>(null); const filteredData = useMemo(() => { const term = searchTerm.toLowerCase();

 if (!term) return faqData;

 return faqData.filter(faq => faq.question.toLowerCase().includes(term) || faq.answer.toLowerCase().includes(term) || faq.category.toLowerCase().includes(term)); }, [searchTerm]); const groupedFAQs = useMemo(() => filteredData.reduce((acc, faq) => { if (!acc[faq.category]) acc[faq.category] = []; acc[faq.category].push(faq);

 return acc; }, {} as Record<string, Faq[]>), [filteredData]);

 return <div className={clsx('view-container view-subpage', isVisible && 'view-visible')}><header className="flex-shrink-0 flex justify-center items-center relative py-4 mt-5 mb-2.5"><BackButton onClick={onBack} /><h1 className="text-2xl sm:text-3xl font-bold text-center text-[var(--color-text-primary)]">FAQ</h1></header><div className="mb-8 flex-shrink-0 relative w-[70%] mx-auto"><div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none"><SearchIcon /></div><input className="w-full py-2 pl-16 pr-6 border-2 rounded-full text-base transition-all duration-300" placeholder="search" type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div><main className="overflow-y-auto no-scrollbar flex-grow pr-2">{Object.keys(groupedFAQs).sort().map(category => <div key={category}><h2 className="text-2xl font-semibold mb-4 pt-6 text-[var(--color-text-primary)]">{category}</h2>{groupedFAQs[category].map(faq => <FaqItem key={faq.question} faq={faq} isOpen={openFaq === faq.question} onToggle={() => setOpenFaq(openFaq === faq.question ? null : faq.question)} />)}</div>)}{filteredData.length === 0 && <div className="text-center py-10 text-[var(--color-text-tertiary)]">No results found for your search query.</div>}</main></div>; };
const ContactView = ({ isVisible, onBack, onSubmit }: { isVisible: boolean; onBack: () => void; onSubmit: (e: React.FormEvent<HTMLFormElement>) => void; }) => <div className={clsx('view-container view-subpage', isVisible && 'view-visible')}><header className="flex-shrink-0 flex justify-center items-center relative py-4 mt-5 mb-2.5"><BackButton onClick={onBack} /><h1 className="text-2xl sm:text-3xl font-bold text-center text-[var(--color-text-primary)]">Send Us a Message</h1></header><main className="overflow-y-auto no-scrollbar flex-grow p-1 sm:p-4"><p className="mb-8 text-base text-center text-[var(--color-text-secondary)]">Please fill out the form below. Expect a response within 1-2 business days.</p><form className="space-y-6 max-w-2xl mx-auto" onSubmit={onSubmit}><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div><label className="block text-xs font-medium mb-2 text-[var(--color-text-primary)]" htmlFor="contact-name">Full Name</label><input required className="w-full p-3 border-2 rounded-xl transition-all duration-300 text-sm" id="contact-name" name="name" placeholder="Your Name" type="text" /></div><div><label className="block text-xs font-medium mb-2 text-[var(--color-text-primary)]" htmlFor="contact-email">Email Address</label><input required className="w-full p-3 border-2 rounded-xl transition-all duration-300 text-sm" id="contact-email" name="email" placeholder="you@example.com" type="email" /></div></div><div><label className="block text-xs font-medium mb-2 text-[var(--color-text-primary)]" htmlFor="contact-subject">Subject</label><input required className="w-full p-3 border-2 rounded-xl transition-all duration-300 text-sm" id="contact-subject" name="subject" placeholder="e.g., Partnership Inquiry" type="text" /></div><div><label className="block text-xs font-medium mb-2 text-[var(--color-text-primary)]" htmlFor="contact-message">Message</label><textarea required className="w-full p-3 border-2 rounded-xl transition-all duration-300 text-sm" id="contact-message" name="message" placeholder="Describe your inquiry or question in detail..." rows={6} /></div><div className="flex justify-end pt-4"><button className="bg-[var(--color-primary-action)] text-black hover:bg-[var(--color-primary-action-hover)] px-8 py-3 font-semibold rounded-full shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-150" type="submit">Send Message</button></div></form></main></div>;

// --- MAIN PAGE COMPONENT ---
export default function HelpCenterPage() {
    const [theme, setTheme] = useState('light');
    const [history, setHistory] = useState<View[]>(['main']);
    const [notification, setNotification] = useState<string | null>(null);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const currentView = history[history.length - 1];

    useEffect(() => {
        const fontLink = document.createElement('link');

        fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap';
        fontLink.rel = 'stylesheet';
        const tailwindScript = document.createElement('script');

        tailwindScript.src = "https://cdn.tailwindcss.com";
        document.head.appendChild(fontLink);
        document.head.appendChild(tailwindScript);

        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        setTheme(prefersDark ? 'dark' : 'light');

        return () => {
            document.head.removeChild(fontLink);
            document.head.removeChild(tailwindScript);
        };
    }, []);

    useEffect(() => {
        document.body.className = ''; // Clear existing classes
        document.body.classList.add(theme);
        document.body.style.backgroundColor = `var(--color-bg)`;
        document.body.style.color = `var(--color-text-primary)`;
    }, [theme]);

    const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');
    const showNotification = (message: string) => { setNotification(message); setTimeout(() => setNotification(null), 3000); };
    const navigate = (view: View) => { if (history.includes(view)) { setHistory(prev => { const newHistory = [...prev];

 while (newHistory[newHistory.length - 1] !== view) newHistory.pop();

 return newHistory; }); } else { setHistory(prev => [...prev, view]); } };
    const goBack = () => { if (history.length <= 1) return; setHistory(prev => prev.slice(0, -1)); };
    const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>, message: string, nextView?: View) => { e.preventDefault(); showNotification(message); (e.target as HTMLFormElement).reset(); if (nextView) { navigate(nextView); } else { goBack(); } };

    return (
        <>
            <style>
                {`
                :root { --color-bg: #FFFFFF; --color-text-primary: #000000; --color-text-secondary: #374151; --color-text-tertiary: #6B7280; --color-border-primary: #000000; --color-border-secondary: rgba(0, 0, 0, 0.1); --color-border-tertiary: #E5E7EB; --color-container-bg: rgba(255, 255, 255, 0.8); --color-card-bg: #FFFFFF; --color-card-hover-bg: #F3F4F6; --color-input-bg: #FFFFFF; --color-input-focus-bg: #FFFFFF; --color-primary-action: #9ef01a; --color-primary-action-hover: #8cd916; --color-selection-border: #3B82F6; }
                .dark { --color-bg: #000000; --color-text-primary: #FFFFFF; --color-text-secondary: #D1D5DB; --color-text-tertiary: #9CA3AF; --color-border-primary: #FFFFFF; --color-border-secondary: rgba(255, 255, 255, 0.1); --color-border-tertiary: #374151; --color-container-bg: rgba(0, 0, 0, 0.8); --color-card-bg: #000000; --color-card-hover-bg: #1f2937; --color-input-bg: #000000; --color-input-focus-bg: #000000; --color-selection-border: #60A5FA; }
                body { font-family: 'Inter', sans-serif; transition: background-color 0.3s, color 0.3s; }
                .view-container { position: absolute; inset: 0; padding: 1rem; transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1); display: flex; flex-direction: column; opacity: 0; pointer-events: none; }
                @media (min-width: 640px) { .view-container { padding: 1.5rem; } }
                .view-main.view-visible { transform: scale(1); opacity: 1; pointer-events: auto; } .view-main.view-hidden { transform: scale(0.95); opacity: 0; }
                .view-subpage { transform: translateX(100%); } .view-subpage.view-visible { transform: translateX(0); opacity: 1; pointer-events: auto; }
                .selectable-card:active, .selectable-card:focus-visible { border-width: 1px; border-color: var(--color-selection-border); box-shadow: 0 0 0 1px var(--color-selection-border); outline: none; }
                input, select, textarea { border-color: var(--color-border-tertiary); background-color: var(--color-input-bg); color: var(--color-text-primary); }
                input:focus, select:focus, textarea:focus { border-width: 1px; border-color: var(--color-selection-border); background-color: var(--color-input-focus-bg); outline: none; box-shadow: 0 0 0 1px var(--color-selection-border); }
                input:focus::placeholder, textarea:focus::placeholder { color: transparent; transition: color 0.2s ease-in-out; }
                `}
            </style>
            <main className="flex items-center justify-center min-h-screen p-4 sm:p-6 lg:p-8" style={{fontFamily: "'Inter', sans-serif"}}>
                <ThemeToggle onToggle={toggleTheme} />
                <Notification message={notification} />
                <div className="backdrop-blur-sm bg-[var(--color-container-bg)] border-2 border-[var(--color-border-primary)] dark:border rounded-[2.5rem] shadow-2xl w-full max-w-5xl h-[95vh] md:h-[90vh] relative overflow-hidden">
                    <HelpMainView isVisible={currentView === 'main'} onNavigate={navigate} />
                    <FaqView isVisible={currentView === 'faq'} onBack={goBack} />
                    <ContactView isVisible={currentView === 'contact'} onBack={goBack} onSubmit={(e) => handleFormSubmit(e, 'Thank you! Your message has been sent.')} />
                </div>
            </main>
        </>
    );
}

