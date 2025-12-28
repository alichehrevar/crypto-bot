// app/login/page.tsx
'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Mail, ArrowRight, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react'
import { Card } from '@/components/common/Card'

export default function LoginPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')

    // Form State
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError('')

        // Simulate Network Request
        setTimeout(() => {
            // MOCK AUTHENTICATION LOGIC
            // In a real app, this would be an API call
            if (formData.email === 'admin@unitedalgos.com' && formData.password === 'admin') {
                router.push('/') // Redirect to dashboard
            } else {
                setError('Invalid credentials. Access denied.')
                setIsLoading(false)
            }
        }, 1500)
    }

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Background Grid Effect */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#18181b_1px,transparent_1px),linear-gradient(to_bottom,#18181b_1px,transparent_1px)] bg-size-[4rem_4rem] mask-[radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none opacity-20" />

            <div className="w-full max-w-md z-10 animate-enter">
                <div className="mb-8 text-center">
                    <h1 className="text-xl font-bold tracking-[0.3em] uppercase text-white mb-2">
                        United Algos <span className="text-zinc-600">Admin</span>
                    </h1>
                    <div className="flex items-center justify-center gap-2 text-xs font-mono text-zinc-500">
                        <ShieldCheck size={12} className="text-emerald-500" />
                        SECURE SYSTEM ACCESS
                    </div>
                </div>

                <Card className="border border-zinc-800 bg-zinc-950/50 backdrop-blur-xl p-8 shadow-2xl">
                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* Error Message */}
                        {error && (
                            <div className="bg-rose-950/30 border border-rose-900/50 p-3 flex items-center gap-3 rounded-sm animate-in fade-in slide-in-from-top-2">
                                <AlertCircle size={16} className="text-rose-500 shrink-0" />
                                <span className="text-xs text-rose-200 font-medium">{error}</span>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                                    Authorized ID
                                </label>
                                <div className="relative group">
                                    <Mail className="absolute left-3 top-2.5 text-zinc-600 group-focus-within:text-white transition-colors" size={16} />
                                    <input
                                        type="email"
                                        required
                                        placeholder="admin@unitedalgos.com"
                                        className="w-full bg-black/50 border border-zinc-800 text-sm text-white py-2 pl-10 pr-4 focus:outline-none focus:border-white focus:ring-1 focus:ring-white/20 transition-all placeholder:text-zinc-700"
                                        value={formData.email}
                                        onChange={e => setFormData({...formData, email: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                                        Passcode
                                    </label>
                                </div>
                                <div className="relative group">
                                    <Lock className="absolute left-3 top-2.5 text-zinc-600 group-focus-within:text-white transition-colors" size={16} />
                                    <input
                                        type="password"
                                        required
                                        placeholder="••••••••"
                                        className="w-full bg-black/50 border border-zinc-800 text-sm text-white py-2 pl-10 pr-4 focus:outline-none focus:border-white focus:ring-1 focus:ring-white/20 transition-all placeholder:text-zinc-700 font-mono"
                                        value={formData.password}
                                        onChange={e => setFormData({...formData, password: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-white text-black font-bold uppercase text-xs tracking-widest py-3 hover:bg-zinc-200 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 size={14} className="animate-spin" /> Verifying...
                                </>
                            ) : (
                                <>
                                    Authenticate <ArrowRight size={14} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 pt-6 border-t border-zinc-900 text-center">
                        <p className="text-[10px] text-zinc-600 font-mono">
                            Restricted Access Level 4. <br />
                            Reset functions are disabled for this terminal.
                        </p>
                        <div className="mt-2 text-[10px] text-zinc-700">
                            Contact <span className="text-zinc-500 underline decoration-dotted cursor-help">Super Admin</span> for lost credentials.
                        </div>
                    </div>
                </Card>

                <div className="mt-8 flex justify-center gap-6 text-[10px] text-zinc-700 font-mono uppercase">
                    <span>V 2.4.0 (Stable)</span>
                    <span>•</span>
                    <span>256-Bit Encrypted</span>
                    <span>•</span>
                    <span>Berlin, DE</span>
                </div>
            </div>
        </div>
    )
}
