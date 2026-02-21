// components/layout/Sidebar.tsx
'use client'

import { LayoutDashboard, Users, Bot, ShieldAlert, Cpu, FileText, Zap, LogOut } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/actions/login'
import type { User } from 'next-auth'

const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Command Center', href: '/' },
    { id: 'users', icon: Users, label: 'User Hub', href: '/users' },
    { id: 'bots', icon: Bot, label: 'Bots', href: '/bots' },
    { id: 'risk', icon: ShieldAlert, label: 'Risk Control', href: '/risk-control' },
    { id: 'strategy', icon: Cpu, label: 'Strategy Foundry', href: '/strategy-foundry' },
    { id: 'audit', icon: FileText, label: 'Audit Vault', href: '/audit-vault' },
]

interface SidebarProps {
    user?: User
}

export function Sidebar({ user }: SidebarProps) {
    const pathname = usePathname()

    return (
        <aside className="hidden md:flex fixed inset-y-0 left-0 z-40 w-64 bg-black border-r border-zinc-900 flex-col">
            {/* Header */}
            <div className="h-20 flex items-center px-6 border-b border-zinc-900 shrink-0">
                <h1 className="text-sm font-bold tracking-widest uppercase">
                    United Algos <span className="text-zinc-600">Admin</span>
                </h1>
            </div>

            {/* Navigation */}
            <nav className="mt-6 flex-1 space-y-1">
                {navItems.map((item) => {
                    const Icon = item.icon
                    const isActive = item.href === '/'
                        ? pathname === '/'
                        : pathname?.startsWith(item.href)

                    return (
                        <Link
                            key={item.id}
                            href={item.href}
                            className={`w-full flex items-center gap-3 px-6 py-4 text-xs font-bold uppercase tracking-widest transition-all 
                                ${isActive
                                ? 'bg-white text-black'
                                : 'text-zinc-500 hover:text-white hover:bg-zinc-900'
                            }`}
                        >
                            <Icon size={16} /> {item.label}
                        </Link>
                    )
                })}
            </nav>

            {/* Footer Area: User Info + System Load */}
            <div className="p-6 mt-auto border-t border-zinc-900/50 space-y-4">

                {/* User Profile */}
                <div className="flex items-center justify-between gap-3 px-1">
                    <div className="overflow-hidden">
                        <p className="text-xs font-bold text-white truncate">
                            {user?.name || 'Admin User'}
                        </p>
                        <p className="text-[10px] text-zinc-500 truncate font-mono">
                            {user?.email || 'unknown@system.com'}
                        </p>
                    </div>

                    {/* Logout Trigger */}
                    <button
                        onClick={() => logout()}
                        className="text-zinc-600 hover:text-red-500 transition-colors"
                        title="Sign Out"
                    >
                        <LogOut size={16} />
                    </button>
                </div>

                {/* System Load */}
                <div className="p-4 border border-zinc-800 bg-zinc-950">
                    <div className="text-[10px] uppercase text-zinc-500 mb-1">System Load</div>
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                        <Zap size={12}/> Optimal
                    </div>
                </div>
            </div>
        </aside>
    )
}
