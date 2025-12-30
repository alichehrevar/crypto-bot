// app/login/page.tsx
'use client'

import {useState, useEffect, useActionState} from 'react'
import { useFormStatus } from 'react-dom'
import { Lock, Mail, ArrowRight, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react'
import { Card } from '@/components/common/Card'
import { authenticate } from '@/actions/login'

// Separate component for the submit button to handle pending state
function SubmitButton() {
    const { pending } = useFormStatus()

    return (
        <button
            type="submit"
            disabled={pending}
            className="w-full bg-white text-black font-bold uppercase text-xs tracking-widest py-3 hover:bg-zinc-200 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
            {pending ? (
                <>
                    <Loader2 size={14} className="animate-spin" /> Verifying...
                </>
            ) : (
                <>
                    Authenticate <ArrowRight size={14} />
                </>
            )}
        </button>
    )
}

export default function LoginPage() {
    // We use useFormState to handle the server action response (error messages)
    const [errorMessage, dispatch] = useActionState(authenticate, undefined)

    // State for location data to inject into hidden fields
    const [location, setLocation] = useState({
        lat: '',
        lng: '',
        city: 'Unknown',
        country: 'Unknown'
    })

    useEffect(() => {
        // Silent location lookup on mount
        const getSilentLocation = async () => {
            try {
                const response = await fetch('https://ipapi.co/json/');
                const data = await response.json();
                setLocation({
                    lat: data.latitude?.toString() || '',
                    lng: data.longitude?.toString() || '',
                    city: data.city || 'Unknown',
                    country: data.country_name || 'Unknown'
                });
            } catch {
                console.warn("IP Lookup failed, proceeding without location");
            }
        };
        getSilentLocation();
    }, []);

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden">
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
                    {/* The form action now points to our Server Action dispatcher */}
                    <form action={dispatch} className="space-y-6">

                        {/* Hidden inputs to pass location data via FormData */}
                        <input type="hidden" name="lat" value={location.lat} />
                        <input type="hidden" name="lng" value={location.lng} />
                        <input type="hidden" name="device_city" value={location.city} />
                        <input type="hidden" name="device_country" value={location.country} />

                        {errorMessage && (
                            <div className="bg-rose-950/30 border border-rose-900/50 p-3 flex items-center gap-3 rounded-sm animate-in fade-in slide-in-from-top-2">
                                <AlertCircle size={16} className="text-rose-500 shrink-0" />
                                <span className="text-xs text-rose-200 font-medium">{errorMessage}</span>
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
                                        name="email"
                                        type="email"
                                        required
                                        placeholder="example@email.com"
                                        className="w-full bg-black/50 border border-zinc-800 text-sm text-white py-2 pl-10 pr-4 focus:outline-none focus:border-white focus:ring-1 focus:ring-white/20 transition-all placeholder:text-zinc-700"
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
                                        name="password"
                                        type="password"
                                        required
                                        placeholder="••••••••"
                                        className="w-full bg-black/50 border border-zinc-800 text-sm text-white py-2 pl-10 pr-4 focus:outline-none focus:border-white focus:ring-1 focus:ring-white/20 transition-all placeholder:text-zinc-700 font-mono"
                                    />
                                </div>
                            </div>
                        </div>

                        <SubmitButton />
                    </form>

                    <div className="mt-6 pt-6 border-t border-zinc-900 text-center">
                        <p className="text-[10px] text-zinc-600 font-mono">
                            Restricted Access Level 4. <br />
                            Reset functions are disabled for this terminal.
                        </p>
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
