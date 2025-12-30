'use client'

import React, { useState, useMemo } from 'react'
import { RefreshCw, CreditCard, Search, XCircle, CheckCircle, FileText as InvoiceIcon } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { Pagination } from '@/components/common/Pagination'
import { PremiumCheckbox } from '@/components/common/PremiumCheckbox'
import { MOCK_INVOICES } from '@/lib/data'

// Mock Data local to this tab
const MOCK_SUB_HISTORY = [
    { date: '2024-10-01 10:00', event: 'REJOIN', plan: 'PRO', details: 'Reactivated via Email Campaign', icon: RefreshCw, color: 'text-emerald-400', border: 'border-emerald-500' },
    { date: '2024-09-15 14:30', event: 'CANCEL', plan: 'BASIC', details: 'User requested pause', icon: XCircle, color: 'text-rose-400', border: 'border-rose-500' },
    { date: '2024-01-20 11:00', event: 'JOINED', plan: 'BASIC', details: 'Initial Sign-up', icon: CheckCircle, color: 'text-zinc-500', border: 'border-zinc-500' },
]

export const BillingTab = () => {
    const [invoiceSearch, setInvoiceSearch] = useState('')
    const [invoicePage, setInvoicePage] = useState(1)
    const [invoiceStatusFilters, setInvoiceStatusFilters] = useState({ PAID: true, FAILED: true })

    // Filtering Logic
    const filteredInvoices = useMemo(() => {
        return MOCK_INVOICES.filter(inv => {
            const matchesSearch = inv.id.toLowerCase().includes(invoiceSearch.toLowerCase()) || inv.amount.toLowerCase().includes(invoiceSearch.toLowerCase())
            const statusKey = inv.status === 'PAID' ? 'PAID' : 'FAILED'
            return matchesSearch && invoiceStatusFilters[statusKey]
        })
    }, [invoiceSearch, invoiceStatusFilters])

    const INVOICE_PAGE_SIZE = 5;
    const paginatedInvoices = useMemo(() => {
        const start = (invoicePage - 1) * INVOICE_PAGE_SIZE
        return filteredInvoices.slice(start, start + INVOICE_PAGE_SIZE)
    }, [filteredInvoices, invoicePage])
    const totalInvoicePages = Math.ceil(filteredInvoices.length / INVOICE_PAGE_SIZE)

    const toggleInvoiceStatus = (key: keyof typeof invoiceStatusFilters) => {
        setInvoiceStatusFilters(prev => ({ ...prev, [key]: !prev[key] }));
        setInvoicePage(1);
    }

    return (
        <div className="space-y-8 animate-enter">
            <div className="border border-zinc-800 bg-zinc-950 p-8">
                <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-8 flex items-center gap-2">
                    <RefreshCw size={14} /> Subscription Lifecycle
                </h3>
                <div className="relative flex flex-col gap-8 pl-4 border-l border-zinc-800">
                    {MOCK_SUB_HISTORY.map((item, i) => {
                        const Icon = item.icon
                        return (
                            <div key={i} className="relative group">
                                <div className={`absolute -left-6.75 top-1 w-6 h-6 rounded-full bg-black border ${item.border} flex items-center justify-center z-10 shadow-[0_0_10px_rgba(0,0,0,0.5)]`}>
                                    <Icon size={12} className={item.color} />
                                </div>
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pl-4">
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-bold text-white uppercase tracking-wider">{item.event}</span>
                                            <span className="text-[10px] font-mono text-zinc-600">{item.date}</span>
                                        </div>
                                        <div className="text-xs text-zinc-500 mt-1">{item.details}</div>
                                    </div>
                                    <div><Badge variant={item.plan}>{item.plan}</Badge></div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            <div className="border border-zinc-800 bg-zinc-950 p-0 flex flex-col">
                <div className="p-8 pb-4 border-b border-zinc-900">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                            <CreditCard size={14} /> Payment History
                        </h3>
                        <div className="flex flex-col md:flex-row gap-4 w-full lg:w-auto">
                            <div className="relative flex-1 lg:w-64">
                                <Search className="absolute left-3 top-2.5 text-zinc-600" size={14} />
                                <input
                                    placeholder="Search Invoices..."
                                    className="w-full bg-black border border-zinc-800 py-2 pl-9 text-xs text-white focus:border-white outline-none placeholder-zinc-700"
                                    value={invoiceSearch}
                                    onChange={(e) => { setInvoiceSearch(e.target.value); setInvoicePage(1); }}
                                />
                            </div>
                            <div className="flex gap-4 items-center">
                                <PremiumCheckbox label="Paid" checked={invoiceStatusFilters.PAID} onChange={() => toggleInvoiceStatus('PAID')} />
                                <PremiumCheckbox label="Failed" checked={invoiceStatusFilters.FAILED} onChange={() => toggleInvoiceStatus('FAILED')} />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="overflow-x-auto p-8 pt-4 pb-0 flex-1">
                    <table className="w-full text-left text-sm">
                        <thead className="text-[10px] text-zinc-600 uppercase border-b border-zinc-900">
                        <tr>
                            <th className="pb-3 pl-4 font-normal text-left">Invoice ID</th>
                            <th className="pb-3 font-normal text-left">Date</th>
                            <th className="pb-3 font-normal text-left">Amount</th>
                            <th className="pb-3 font-normal text-center">Status</th>
                            <th className="pb-3 pr-4 font-normal text-right">Action</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-900">
                        {paginatedInvoices.map((inv) => (
                            <tr key={inv.id} className="group hover:bg-zinc-900/30 transition-colors">
                                <td className="py-4 pl-4 font-mono text-zinc-400">{inv.id}</td>
                                <td className="py-4 text-zinc-300">{inv.date}</td>
                                <td className="py-4 font-bold text-white">{inv.amount}</td>
                                <td className="py-4 text-center">
                                    {inv.status === 'PAID' ? <span className="text-emerald-400 font-medium text-xs">Successful</span> : <span className="text-rose-400 font-medium text-xs">Unsuccessful</span>}
                                </td>
                                <td className="py-4 pr-4 text-right">
                                    <button className="text-xs flex items-center gap-1 ml-auto text-zinc-500 hover:text-white transition-colors">
                                        <InvoiceIcon size={12} /> Invoice
                                    </button>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
                <Pagination page={invoicePage} setPage={setInvoicePage} total={totalInvoicePages} label="History" />
            </div>
        </div>
    )
}
