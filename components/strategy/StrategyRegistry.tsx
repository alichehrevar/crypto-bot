// components/strategy/StrategyRegistry.tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card } from '@/components/common/Card'
import {
    Cpu,
    Layers,
    Link2,
    Zap,
    Sliders,
    Save,
    Archive,
    CheckSquare,
    RefreshCcw,
    Play,
    Loader2,
} from 'lucide-react'
import { useToast } from "@/components/providers/ToastProvider"
import { updateRequest } from "@/actions/put"
import { getData } from "@/actions/get"
import {IndicatorSettings, indicatorSettingsResponse} from "@/types/indicatorSettingsData"

interface MarketSwitchProps {
    label: string
}

const MarketSwitch = ({ label }: MarketSwitchProps) => (
    <div className="flex items-center justify-between bg-zinc-900 p-2 rounded-sm border border-zinc-800">
        <span className="text-[10px] font-bold text-zinc-400 uppercase">{label}</span>
        <div className="flex gap-1">
            <div className="w-8 h-4 bg-emerald-500 rounded-full relative cursor-pointer">
                <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full shadow-sm" />
            </div>
        </div>
    </div>
)

interface ParamInputProps {
    label: string
    val: string | number
    onChange?: (val: string) => void // Made optional so GRID/DCA tabs don't break
}

const ParamInput = ({ label, val, onChange }: ParamInputProps) => (
    <div className="flex justify-between items-center border-b border-zinc-900 pb-2 mb-2 hover:border-zinc-700 transition-colors">
        <span className="text-xs text-zinc-400">{label}</span>
        <input
            className="bg-transparent text-right text-xs font-mono text-white w-24 focus:outline-none placeholder-zinc-700"
            value={val ?? ''}
            onChange={(e) => onChange && onChange(e.target.value)}
        />
    </div>
)

export function StrategyRegistry() {
    const { addToast } = useToast()
    const [activeTab, setActiveTab] = useState('TECHNICAL')
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)

    // Form State for Indicator Settings
    const [settings, setSettings] = useState<IndicatorSettings>({
        RSI: { period: 14, overbought: 70, oversold: 30 },
        MACD: { shortPeriod: 12, longPeriod: 26, signalPeriod: 9 },
        Bollinger_Bands: { period: 20, stdDevMultiplier: 2 },
        Donchian: { period: 20, offset: 0 },
        SmoothedHeikinAshi: { emaPeriod1: 55, emaPeriod2: 100 },
        SMA: { period: 14 },
        ATR: { period: 14 },
        Stochastic_RSI: { period: 14, kPeriod: 3, dPeriod: 3 },
        MA_Crossover: { shortPeriod: 5, longPeriod: 20 }
    })

    const [n8nUrl, setN8nUrl] = useState('https://n8n.unitedalgos.internal/webhook/ai-v4')
    const [n8nStatus, setN8nStatus] = useState<'CONNECTED' | 'DISCONNECTED'>('CONNECTED')
    const [smartTimeframes, setSmartTimeframes] = useState({
        '1m': true,
        '5m': true,
        '15m': true,
        '1h': true,
        '4h': false,
        '1d': false,
    })

    const TABS = [
        { id: 'TECHNICAL', label: 'TECHNICAL' },
        { id: 'CUSTOM AI', label: 'CUSTOM AI' },
        { id: 'SMART', label: 'SMART' },
        { id: 'GRID', label: 'GRID' },
        { id: 'DCA', label: 'DCA' },
    ]

    // Fetch initial settings from DB
    const fetchSettings = useCallback(async () => {
        setIsLoading(true)
        try {
            const res = await getData('/admin/indicator-settings')
            if (res.success && res.settings) {
                setSettings(res.settings)
            }
        } catch {
            addToast({ title: "Error", message: "Failed to load config", type: "error" })
        } finally {
            setIsLoading(false)
        }
    }, [addToast])

    useEffect(() => {
        fetchSettings()
    }, [fetchSettings])

    // Strict Generic Type Handler for param changes
    const handleParamChange = <T extends keyof IndicatorSettings, K extends keyof IndicatorSettings[T]>(
        indicator: T,
        param: K,
        value: number
    ) => {
        setSettings((prev) => ({
            ...prev,
            [indicator]: {
                ...prev[indicator],
                [param]: value
            }
        }))
    }

    // Save changes to DB
    const handleSaveConfig = async () => {
        setIsSaving(true)
        try {
            const res = await updateRequest(settings, '/admin/indicator-settings') as indicatorSettingsResponse;

            if (res.success) {
                addToast({ title: "Success", message: "Global defaults updated", type: "success" })
            } else {
                addToast({ title: "Error", message: res.message, type: "warning" })
            }
        } catch {
            addToast({ title: "Error", message: "Failed to save config", type: "error" })
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="space-y-6 animate-enter">
            <div className="flex justify-between items-end border-b border-zinc-800 pb-6">
                <div>
                    <h2 className="text-3xl font-light uppercase tracking-[0.2em] text-white flex items-center gap-3">
                        <Cpu size={32} className="text-zinc-400" /> Strategy Foundry
                    </h2>
                    <p className="text-zinc-500 text-xs font-mono mt-2">ALGORITHM CONFIGURATION & LOGIC CONTROL</p>
                </div>
                <div className="flex bg-zinc-950 border border-zinc-800 p-1 rounded-sm">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2 text-[10px] font-bold uppercase transition-colors ${
                                activeTab === tab.id ? 'bg-white text-black shadow-sm' : 'text-zinc-500 hover:text-white'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* DYNAMIC CONTENT AREA */}
                <div className="lg:col-span-2 space-y-6">
                    {activeTab === 'TECHNICAL' && (
                        <Card>
                            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-6 flex items-center gap-2">
                                <Layers size={14} /> Technical Indicator Defaults
                            </h3>

                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
                                    <Loader2 className="animate-spin mb-4" />
                                    <span className="text-xs font-mono">Loading parameters...</span>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <MarketSwitch label="Spot Market" />
                                        <MarketSwitch label="Futures Market" />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

                                        <div className="bg-zinc-950 p-4 border border-zinc-900 rounded-sm">
                                            <h4 className="text-zinc-300 text-xs font-bold mb-3 border-b border-zinc-800 pb-2">RSI</h4>
                                            <ParamInput label="Length" val={settings.RSI.period} onChange={(v) => handleParamChange('RSI', 'period', parseFloat(v) || 0)} />
                                            <ParamInput label="Overbought" val={settings.RSI.overbought} onChange={(v) => handleParamChange('RSI', 'overbought', parseFloat(v) || 0)} />
                                            <ParamInput label="Oversold" val={settings.RSI.oversold} onChange={(v) => handleParamChange('RSI', 'oversold', parseFloat(v) || 0)} />
                                        </div>

                                        <div className="bg-zinc-950 p-4 border border-zinc-900 rounded-sm">
                                            <h4 className="text-zinc-300 text-xs font-bold mb-3 border-b border-zinc-800 pb-2">MACD</h4>
                                            <ParamInput label="Fast Length" val={settings.MACD.shortPeriod} onChange={(v) => handleParamChange('MACD', 'shortPeriod', parseFloat(v) || 0)} />
                                            <ParamInput label="Slow Length" val={settings.MACD.longPeriod} onChange={(v) => handleParamChange('MACD', 'longPeriod', parseFloat(v) || 0)} />
                                            <ParamInput label="Signal Smooth" val={settings.MACD.signalPeriod} onChange={(v) => handleParamChange('MACD', 'signalPeriod', parseFloat(v) || 0)} />
                                        </div>

                                        <div className="bg-zinc-950 p-4 border border-zinc-900 rounded-sm">
                                            <h4 className="text-zinc-300 text-xs font-bold mb-3 border-b border-zinc-800 pb-2">Bollinger Bands</h4>
                                            <ParamInput label="Length" val={settings.Bollinger_Bands.period} onChange={(v) => handleParamChange('Bollinger_Bands', 'period', parseFloat(v) || 0)} />
                                            <ParamInput label="Multiplier" val={settings.Bollinger_Bands.stdDevMultiplier} onChange={(v) => handleParamChange('Bollinger_Bands', 'stdDevMultiplier', parseFloat(v) || 0)} />
                                        </div>

                                        <div className="bg-zinc-950 p-4 border border-zinc-900 rounded-sm">
                                            <h4 className="text-zinc-300 text-xs font-bold mb-3 border-b border-zinc-800 pb-2">Stochastic RSI</h4>
                                            <ParamInput label="Period" val={settings.Stochastic_RSI.period} onChange={(v) => handleParamChange('Stochastic_RSI', 'period', parseFloat(v) || 0)} />
                                            <ParamInput label="K %" val={settings.Stochastic_RSI.kPeriod} onChange={(v) => handleParamChange('Stochastic_RSI', 'kPeriod', parseFloat(v) || 0)} />
                                            <ParamInput label="D %" val={settings.Stochastic_RSI.dPeriod} onChange={(v) => handleParamChange('Stochastic_RSI', 'dPeriod', parseFloat(v) || 0)} />
                                        </div>

                                        <div className="bg-zinc-950 p-4 border border-zinc-900 rounded-sm">
                                            <h4 className="text-zinc-300 text-xs font-bold mb-3 border-b border-zinc-800 pb-2">MA Crossover</h4>
                                            <ParamInput label="Short Length" val={settings.MA_Crossover.shortPeriod} onChange={(v) => handleParamChange('MA_Crossover', 'shortPeriod', parseFloat(v) || 0)} />
                                            <ParamInput label="Long Length" val={settings.MA_Crossover.longPeriod} onChange={(v) => handleParamChange('MA_Crossover', 'longPeriod', parseFloat(v) || 0)} />
                                        </div>

                                        <div className="bg-zinc-950 p-4 border border-zinc-900 rounded-sm">
                                            <h4 className="text-zinc-300 text-xs font-bold mb-3 border-b border-zinc-800 pb-2">Simple MAs</h4>
                                            <ParamInput label="SMA Length" val={settings.SMA.period} onChange={(v) => handleParamChange('SMA', 'period', parseFloat(v) || 0)} />
                                            <ParamInput label="ATR Length" val={settings.ATR.period} onChange={(v) => handleParamChange('ATR', 'period', parseFloat(v) || 0)} />
                                        </div>

                                        <div className="bg-zinc-950 p-4 border border-zinc-900 rounded-sm md:col-span-2 lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <h4 className="text-zinc-300 text-xs font-bold mb-3 border-b border-zinc-800 pb-2">Smoothed Heikin Ashi</h4>
                                                <ParamInput label="EMA Length 1" val={settings.SmoothedHeikinAshi.emaPeriod1} onChange={(v) => handleParamChange('SmoothedHeikinAshi', 'emaPeriod1', parseFloat(v) || 0)} />
                                                <ParamInput label="EMA Length 2" val={settings.SmoothedHeikinAshi.emaPeriod2} onChange={(v) => handleParamChange('SmoothedHeikinAshi', 'emaPeriod2', parseFloat(v) || 0)} />
                                            </div>
                                            <div>
                                                <h4 className="text-zinc-300 text-xs font-bold mb-3 border-b border-zinc-800 pb-2">Donchian Channels</h4>
                                                <ParamInput label="Length" val={settings.Donchian.period} onChange={(v) => handleParamChange('Donchian', 'period', parseFloat(v) || 0)} />
                                                <ParamInput label="Offset" val={settings.Donchian.offset} onChange={(v) => handleParamChange('Donchian', 'offset', parseFloat(v) || 0)} />
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            )}
                        </Card>
                    )}

                    {activeTab === 'CUSTOM AI' && (
                        <Card>
                            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-6 flex items-center gap-2">
                                <Link2 size={14} /> N8N Logic Stream
                            </h3>
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase">N8N Webhook Connection URL</label>
                                    <div className="flex gap-2">
                                        <input
                                            value={n8nUrl}
                                            onChange={(e) => setN8nUrl(e.target.value)}
                                            className="flex-1 bg-black border border-zinc-800 p-3 text-xs text-white font-mono outline-none focus:border-white transition-colors"
                                        />
                                        <button
                                            onClick={() => setN8nStatus(n8nStatus === 'CONNECTED' ? 'DISCONNECTED' : 'CONNECTED')}
                                            className="px-4 bg-zinc-900 border border-zinc-800 text-white hover:bg-zinc-800 transition-colors"
                                        >
                                            <RefreshCcw size={14} className={n8nStatus === 'CONNECTED' ? 'animate-spin' : ''} />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 p-4 border border-zinc-800 bg-zinc-900/50 rounded-sm">
                                    <div
                                        className={`w-3 h-3 rounded-full ${
                                            n8nStatus === 'CONNECTED' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-rose-500'
                                        }`}
                                    />
                                    <div>
                                        <div className="text-xs font-bold text-white">Status: {n8nStatus}</div>
                                        <div className="text-[10px] text-zinc-500 font-mono mt-1">Last Heartbeat: 24ms ago</div>
                                    </div>
                                </div>

                                <div className="p-4 bg-black border border-zinc-900 font-mono text-[10px] text-zinc-500 space-y-1 h-32 overflow-y-auto custom-scrollbar">
                                    <div>{'>'} Initializing handshake... OK</div>
                                    <div>{'>'} Verifying API Key... OK</div>
                                    <div>{'>'} Syncing model parameters... OK</div>
                                    <div>{'>'} Neural weights loaded: 24MB</div>
                                    <div className="text-emerald-500">{'>'} Ready for inference.</div>
                                </div>
                            </div>
                        </Card>
                    )}

                    {activeTab === 'SMART' && (
                        <Card>
                            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-6 flex items-center gap-2">
                                <Zap size={14} /> Smart Bot Orchestration
                            </h3>
                            <div className="space-y-8">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-zinc-950 border border-zinc-900 p-4">
                                        <h4 className="text-[10px] uppercase font-bold text-zinc-500 mb-3">Workflow Starting Period</h4>
                                        <input
                                            className="w-full bg-black border border-zinc-800 p-2 text-white font-mono text-sm outline-none"
                                            defaultValue="2024-01-01"
                                            type="date"
                                        />
                                    </div>
                                    <div className="bg-zinc-950 border border-zinc-900 p-4 flex items-center justify-between">
                                        <span className="text-[10px] uppercase font-bold text-zinc-500">Optimized Strategies</span>
                                        <div className="w-10 h-5 bg-emerald-500 rounded-full relative cursor-pointer">
                                            <div className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm" />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-[10px] uppercase font-bold text-zinc-500 mb-3">Active Timeframes</h4>
                                    <div className="grid grid-cols-3 gap-2">
                                        {Object.entries(smartTimeframes).map(([tf, active]) => (
                                            <button
                                                key={tf}
                                                onClick={() => setSmartTimeframes((p) => ({ ...p, [tf]: !p[tf as keyof typeof p] }))}
                                                className={`py-2 border text-xs font-bold transition-colors flex justify-center items-center gap-2 ${
                                                    active ? 'bg-white text-black border-white' : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                                                }`}
                                            >
                                                {active && <CheckSquare size={10} />} {tf}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="border-t border-zinc-900 pt-6 flex justify-end">
                                    <button className="px-8 py-3 bg-white text-black text-xs font-bold uppercase hover:bg-zinc-200 flex items-center gap-2 transition-colors">
                                        <Play size={14} fill="currentColor" /> Manual Deploy
                                    </button>
                                </div>
                            </div>
                        </Card>
                    )}

                    {(activeTab === 'GRID' || activeTab === 'DCA') && (
                        <Card>
                            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-6 flex items-center gap-2">
                                {activeTab === 'GRID' ? <Layers size={14} /> : <Sliders size={14} />}
                                {activeTab === 'GRID' ? ' Grid Strategy Engine' : ' Dollar Cost Averaging Engine'}
                            </h3>
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <MarketSwitch label="Spot Market" />
                                    <MarketSwitch label="Futures Market" />
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <ParamInput label="Max Active Orders" val={activeTab === 'GRID' ? '50' : '10'} />
                                    <ParamInput label="Min Investment ($)" val="100" />
                                    <ParamInput label="Allowed Pairs" val="BTC, ETH, SOL, BNB" />
                                    <ParamInput label="Leverage Limit" val="20x" />
                                    {activeTab === 'GRID' && <ParamInput label="Grid Spacing (%)" val="0.5" />}
                                    {activeTab === 'DCA' && <ParamInput label="Step Scale" val="1.5" />}
                                    {activeTab === 'DCA' && <ParamInput label="Volume Scale" val="1.2" />}
                                </div>
                            </div>
                        </Card>
                    )}
                </div>

                {/* RIGHT SIDEBAR: GLOBAL CONFIG */}
                <div className="xl:col-span-1 space-y-6">
                    <Card>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">Deployment Status</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-zinc-400">Global Version</span>
                                <span className="font-mono text-white">V4.2.1-stable</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-zinc-400">Last Sync</span>
                                <span className="font-mono text-white">14:02:21 UTC</span>
                            </div>
                            <div className="w-full h-px bg-zinc-900" />
                            <button className="w-full py-2 border border-zinc-700 text-xs font-bold text-zinc-300 uppercase hover:text-white hover:border-white transition-colors">
                                View Changelog
                            </button>
                        </div>
                    </Card>
                    <Card>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">Quick Actions</h3>
                        <div className="space-y-2">
                            <button
                                onClick={handleSaveConfig}
                                disabled={isLoading || isSaving}
                                className="w-full py-3 bg-emerald-600/10 text-emerald-400 hover:bg-emerald-600/20 hover:text-emerald-300 text-xs font-bold flex items-center justify-center gap-2 border border-emerald-900/50 transition-colors disabled:opacity-50"
                            >
                                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                {isSaving ? 'Saving...' : 'Save Config'}
                            </button>
                            <button className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-bold flex items-center justify-center gap-2 border border-zinc-800 transition-colors">
                                <Archive size={14} /> Backup Settings
                            </button>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    )
}
