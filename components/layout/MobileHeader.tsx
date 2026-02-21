// components/layout/MobileHeader.tsx
'use client'

import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const mobileNavItems = [
    { id: 'dashboard', label: 'Command Center', href: '/' },
    { id: 'users', label: 'User Hub', href: '/users' },
    { id: 'bots', label: 'Bots', href: '/bots' },
    { id: 'risk', label: 'Risk Control', href: '/risk-control' },
    { id: 'strategy', label: 'Strategy Foundry', href: '/strategy-foundry' },
    { id: 'audit', label: 'Audit Vault', href: '/audit-vault' },
]

export function MobileHeader() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const pathname = usePathname()

    return (
        <>
            <div className="md:hidden h-16 border-b border-zinc-900 flex items-center justify-between px-6 bg-black z-50 sticky top-0">
                <div className="font-bold tracking-widest uppercase text-sm">
                    United Algos <span className="text-zinc-600">V7</span>
                </div>
                <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="text-zinc-400 hover:text-white"
                >
                    {mobileMenuOpen ? <X size={24}/> : <Menu size={24}/>}
                </button>
            </div>

            {mobileMenuOpen && (
                <div className="md:hidden fixed inset-0 z-40 bg-black pt-20">
                    <nav className="space-y-1 px-4">
                        {mobileNavItems.map((item) => {
                            const isActive = pathname === item.href ||
                                (item.href !== '/' && pathname?.startsWith(item.href))

                            return (
                                <Link
                                    key={item.id}
                                    href={item.href}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={`block px-4 py-3 text-sm font-bold uppercase tracking-widest rounded transition-all
                    ${isActive ? 'bg-white text-black' : 'text-zinc-500 hover:text-white hover:bg-zinc-900'}`}
                                >
                                    {item.label}
                                </Link>
                            )
                        })}
                    </nav>
                </div>
            )}
        </>
    )
}
