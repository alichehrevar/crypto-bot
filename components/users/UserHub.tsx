// components/users/UserHub.tsx
'use client'

import { useState, useMemo } from 'react'
import { Badge } from '@/components/common/Badge'
import { MOCK_USERS } from '@/lib/mock-service'
import { MockUser } from '@/lib/mock-service'
import { Card } from '@/components/common/Card'
import {
    Search,
    Filter,
    ChevronRight,
    ChevronLeft,
    ChevronDown,
    ArrowUpDown,
    MapPin,
    Users as UsersIcon,
    Hash,
    Calendar,
    Gift,
    ChevronRight as ChevronRightIcon,
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

// Define valid sort keys (Keys of User + custom 'identity' column)
type SortKey = keyof MockUser | 'identity'

const SortIcon = ({column, sortConfig}: {
    column: string,
    sortConfig: { key: SortKey | null; direction: "asc" | "desc" }
}) => {
    if (sortConfig.key !== column)
        return <ArrowUpDown size={12} className="ml-1 text-zinc-600 opacity-0 group-hover:opacity-50 transition-opacity" />
    return <ArrowUpDown size={12} className={`ml-1 ${sortConfig.direction === 'asc' ? 'text-white' : 'text-zinc-400'}`} />
}

export function UserHub() {
    const [filtersOpen, setFiltersOpen] = useState(false)
    const [filters, setFilters] = useState({
        search: '',
        plan: 'ALL',
        country: '',
        botRange: 'ALL',
        dateStart: '',
        birthday: '',
    })

    // Fixed: Strictly typed sort configuration
    const [sortConfig, setSortConfig] = useState<{ key: SortKey | null; direction: 'asc' | 'desc' }>({
        key: null,
        direction: 'asc',
    })

    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 15

    // Fixed: key argument is now typed as SortKey
    const handleSort = (key: SortKey) => {
        let direction: 'asc' | 'desc' = 'asc'
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc'
        }
        setSortConfig({ key, direction })
    }

    const filteredUsers = useMemo(() => {
        const data = MOCK_USERS.filter((u) => {
            const searchMatch = (u.firstName + u.lastName + u.id)
                .toLowerCase()
                .includes(filters.search.toLowerCase())
            const planMatch = filters.plan === 'ALL' || u.plan === filters.plan
            const countryMatch = !filters.country || u.country.toLowerCase().includes(filters.country.toLowerCase())
            const dateMatch = !filters.dateStart || u.joinedAt >= filters.dateStart
            const bdayMatch = !filters.birthday || u.birthday === filters.birthday

            let botMatch = true
            if (filters.botRange === '1-100') botMatch = u.botCount >= 1 && u.botCount <= 100
            if (filters.botRange === '100-300') botMatch = u.botCount > 100 && u.botCount <= 300
            if (filters.botRange === '300+') botMatch = u.botCount > 300

            return searchMatch && planMatch && countryMatch && botMatch && dateMatch && bdayMatch
        })

        if (sortConfig.key) {
            // Fixed: Removed 'any'. 'a' and 'b' are inferred as MockUser
            data.sort((a, b) => {
                const key = sortConfig.key! // We know key exists inside this if block

                let aVal: string | number;
                let bVal: string | number;

                // Handle 'identity' virtual column
                if (key === 'identity') {
                    aVal = `${a.lastName} ${a.firstName}`.toLowerCase()
                    bVal = `${b.lastName} ${b.firstName}`.toLowerCase()
                } else {
                    // Handle standard keys safely using 'as keyof MockUser'
                    // We cast the value to string | number to make them comparable
                    aVal = a[key as keyof MockUser] as string | number
                    bVal = b[key as keyof MockUser] as string | number
                }

                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
                return 0
            })
        }

        return data
    }, [filters, sortConfig])

    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage)
    const paginatedUsers = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage
        return filteredUsers.slice(start, start + itemsPerPage)
    }, [filteredUsers, currentPage])

    const handleFilterChange = (key: keyof typeof filters, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }))
        setCurrentPage(1) // <--- Reset page here directly
    }

    const getPageNumbers = () => {
        const pages: (number | string)[] = []
        const maxVisiblePages = 5
        if (totalPages <= maxVisiblePages) {
            for (let i = 1; i <= totalPages; i++) pages.push(i)
        } else {
            if (currentPage <= 3) {
                pages.push(1, 2, 3, 4, '...', totalPages)
            } else if (currentPage >= totalPages - 2) {
                pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
            } else {
                pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages)
            }
        }
        return pages
    }

    return (
        <div className="space-y-6 animate-enter">
            {/* ... Header and Filters (Unchanged) ... */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h2 className="text-2xl md:text-3xl font-light uppercase tracking-[0.2em] text-white">Identity Hub</h2>
                    <p className="text-zinc-500 text-xs font-mono mt-2">GLOBAL USER DATABASE & ACCESS CONTROL</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-2.5 text-zinc-600" size={14} />
                        <input
                            value={filters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                            placeholder="Search Name or ID..."
                            className="w-full bg-black border border-zinc-800 pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-white transition-colors placeholder-zinc-700"
                        />
                    </div>
                    <button
                        onClick={() => setFiltersOpen(!filtersOpen)}
                        className={`px-4 py-2 border text-xs uppercase font-bold flex items-center gap-2 transition-colors ${
                            filtersOpen ? 'bg-white text-black border-white' : 'bg-black text-white border-zinc-800'
                        }`}
                    >
                        <Filter size={14} /> Filters <ChevronDown size={12} />
                    </button>
                </div>
            </div>

            {filtersOpen && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 bg-zinc-950 p-6 border border-zinc-800 animate-enter">
                    <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-zinc-600">Subscription</label>
                        <select
                            value={filters.plan}
                            onChange={(e) => handleFilterChange('plan', e.target.value)}
                            className="w-full bg-black border border-zinc-800 text-xs text-white p-2 outline-none"
                        >
                            <option value="ALL">All Plans</option>
                            <option value="PRO">Pro</option>
                            <option value="ESSENTIAL">Essential</option>
                            <option value="BASIC">Basic</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-zinc-600">Bot Range</label>
                        <select
                            value={filters.botRange}
                            onChange={(e) => handleFilterChange('plan', e.target.value)}
                            className="w-full bg-black border border-zinc-800 text-xs text-white p-2 outline-none"
                        >
                            <option value="ALL">Any Quantity</option>
                            <option value="1-100">1 - 100 Bots</option>
                            <option value="100-300">100 - 300 Bots</option>
                            <option value="300+">300+ Bots</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-zinc-600">Country</label>
                        <input
                            placeholder="e.g. Germany"
                            value={filters.country}
                            onChange={(e) => handleFilterChange('country', e.target.value)}
                            className="w-full bg-black border border-zinc-800 text-xs text-white p-2 outline-none"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-zinc-600">Joined After</label>
                        <input
                            type="date"
                            value={filters.dateStart}
                            onChange={(e) => handleFilterChange('dateStart', e.target.value)}
                            className="w-full bg-black border border-zinc-800 text-xs text-zinc-400 p-2 outline-none uppercase"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-zinc-600">Birthday</label>
                        <input
                            type="date"
                            value={filters.birthday}
                            onChange={(e) => handleFilterChange('birthday', e.target.value)}
                            className="w-full bg-black border border-zinc-800 text-xs text-zinc-400 p-2 outline-none uppercase"
                        />
                    </div>
                </div>
            )}

            <div className="overflow-x-auto border border-zinc-800 bg-black rounded-sm">
                <table className="w-full text-left border-collapse table-fixed">
                    <thead>
                    <tr className="bg-zinc-950 text-[10px] uppercase text-zinc-500 font-bold border-b border-zinc-800 whitespace-nowrap">
                        <th className="w-[30%] p-4 pl-6 text-left cursor-pointer group hover:text-white transition-colors" onClick={() => handleSort('identity')}>
                            <div className="flex items-center">
                                Identity <SortIcon sortConfig={sortConfig} column="identity" />
                            </div>
                        </th>
                        <th className="w-[15%] p-4 text-left cursor-pointer group hover:text-white transition-colors" onClick={() => handleSort('country')}>
                            <div className="flex items-center">
                                Location <SortIcon sortConfig={sortConfig} column="country" />
                            </div>
                        </th>
                        <th className="w-[10%] p-4 text-left cursor-pointer group hover:text-white transition-colors" onClick={() => handleSort('plan')}>
                            <div className="flex items-center">
                                Plan <SortIcon sortConfig={sortConfig} column="plan" />
                            </div>
                        </th>
                        <th className="w-[10%] p-4 text-center cursor-pointer group hover:text-white transition-colors" onClick={() => handleSort('botCount')}>
                            <div className="flex items-center justify-center">
                                Bots <SortIcon sortConfig={sortConfig} column="botCount" />
                            </div>
                        </th>
                        <th className="w-[10%] p-4 text-right cursor-pointer group hover:text-white transition-colors" onClick={() => handleSort('birthday')}>
                            <div className="flex items-center justify-end">
                                Birthday <SortIcon sortConfig={sortConfig} column="birthday" />
                            </div>
                        </th>
                        <th className="w-[10%] p-4 text-right cursor-pointer group hover:text-white transition-colors" onClick={() => handleSort('joinedAt')}>
                            <div className="flex items-center justify-end">
                                Joined <SortIcon sortConfig={sortConfig} column="joinedAt" />
                            </div>
                        </th>
                        <th className="w-[10%] p-4 text-center cursor-pointer group hover:text-white transition-colors" onClick={() => handleSort('status')}>
                            <div className="flex items-center justify-center">
                                Status <SortIcon sortConfig={sortConfig} column="status" />
                            </div>
                        </th>
                        <th className="w-[5%] p-4 pr-6"></th>
                    </tr>
                    </thead>
                    <tbody className="text-sm">
                    {paginatedUsers.map((user) => (
                        <tr
                            key={user.id}
                            className="border-b border-zinc-900 hover:bg-zinc-900/50 cursor-pointer transition-colors group"
                        >
                            <td className="p-4 pl-6 overflow-hidden">
                                <Link href={`/app/(dashboard)/users/${user.id}`} className="block">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 relative rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden grayscale group-hover:grayscale-0 transition-all shrink-0">
                                            <Image fill src={user.avatar} className="w-full h-full object-cover" alt={`${user.firstName} ${user.lastName}`} />
                                        </div>
                                        <div className="overflow-hidden">
                                            <div className="font-bold text-white group-hover:underline decoration-zinc-500 underline-offset-4 truncate">
                                                {user.lastName}, {user.firstName}
                                            </div>
                                            <div className="text-[10px] text-zinc-500 font-mono truncate">{user.id}</div>
                                        </div>
                                    </div>
                                </Link>
                            </td>
                            <td className="p-4 text-xs text-zinc-400 text-left truncate">
                                <Link href={`/app/(dashboard)/users/${user.id}`} className="block">
                                    <div className="flex items-center gap-1">
                                        <MapPin size={10} />
                                        {user.country}
                                    </div>
                                </Link>
                            </td>
                            <td className="p-4 text-left">
                                <Link href={`/app/(dashboard)/users/${user.id}`} className="block">
                                    <Badge variant={user.plan}>{user.plan}</Badge>
                                </Link>
                            </td>
                            <td className="p-4 text-center font-mono text-zinc-300">
                                <Link href={`/app/(dashboard)/users/${user.id}`} className="block">
                                    {user.botCount}
                                </Link>
                            </td>
                            <td className="p-4 text-xs text-zinc-500 font-mono text-right">
                                <Link href={`/app/(dashboard)/users/${user.id}`} className="block">
                                    <div className="flex items-center justify-end gap-1">
                                        <Gift size={10} />
                                        {user.birthday}
                                    </div>
                                </Link>
                            </td>
                            <td className="p-4 text-xs text-zinc-500 font-mono text-right">
                                <Link href={`/app/(dashboard)/users/${user.id}`} className="block">
                                    <div className="flex items-center justify-end gap-1">
                                        <Calendar size={10} />
                                        {user.joinedAt}
                                    </div>
                                </Link>
                            </td>
                            <td className="p-4 text-center">
                                <Link href={`/app/(dashboard)/users/${user.id}`} className="block">
                                    <Badge variant={user.status}>{user.status}</Badge>
                                </Link>
                            </td>
                            <td className="p-4 pr-6 text-right">
                                <Link href={`/app/(dashboard)/users/${user.id}`} className="block">
                                    <ChevronRight size={16} className="text-zinc-700 group-hover:text-white" />
                                </Link>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>

                {/* Pagination Controls */}
                <div className="flex justify-between items-center p-4 border-t border-zinc-800 bg-zinc-950">
                    <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">
                        Showing <span className="text-white">{((currentPage - 1) * itemsPerPage) + 1}</span> -{' '}
                        <span className="text-white">{Math.min(currentPage * itemsPerPage, filteredUsers.length)}</span> of{' '}
                        <span className="text-white">{filteredUsers.length}</span> Results
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-900 rounded disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        >
                            <ChevronLeft size={14} />
                        </button>

                        {getPageNumbers().map((page, i) => (
                            <button
                                key={i}
                                onClick={() => typeof page === 'number' && setCurrentPage(page)}
                                disabled={typeof page !== 'number'}
                                className={`w-8 h-8 flex items-center justify-center text-xs font-bold rounded transition-colors
                  ${
                                    page === currentPage
                                        ? 'bg-white text-black'
                                        : typeof page === 'number'
                                            ? 'text-zinc-500 hover:text-white hover:bg-zinc-900'
                                            : 'text-zinc-700 cursor-default'
                                }
                `}
                            >
                                {page}
                            </button>
                        ))}

                        <button
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-900 rounded disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        >
                            <ChevronRightIcon size={14} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Bottom Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-[10px] uppercase text-zinc-500 font-bold mb-1">Total Users</div>
                            <div className="text-xl font-mono text-white">{MOCK_USERS.length}</div>
                        </div>
                        <div className="p-2 bg-zinc-900 rounded-full">
                            <UsersIcon size={20} className="text-zinc-500" />
                        </div>
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-[10px] uppercase text-zinc-500 font-bold mb-1">Active Users</div>
                            <div className="text-xl font-mono text-emerald-400">
                                {MOCK_USERS.filter(u => u.status === 'ACTIVE').length}
                            </div>
                        </div>
                        <div className="p-2 bg-emerald-900/20 rounded-full">
                            <UsersIcon size={20} className="text-emerald-500" />
                        </div>
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-[10px] uppercase text-zinc-500 font-bold mb-1">Average Bots/User</div>
                            <div className="text-xl font-mono text-white">
                                {Math.round(MOCK_USERS.reduce((acc, u) => acc + u.botCount, 0) / MOCK_USERS.length)}
                            </div>
                        </div>
                        <div className="p-2 bg-zinc-900 rounded-full">
                            <Hash size={20} className="text-zinc-500" />
                        </div>
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-[10px] uppercase text-zinc-500 font-bold mb-1">New This Month</div>
                            <div className="text-xl font-mono text-white">
                                {MOCK_USERS.filter(u => u.joinedAt.startsWith('2024-10')).length}
                            </div>
                        </div>
                        <div className="p-2 bg-zinc-900 rounded-full">
                            <Calendar size={20} className="text-zinc-500" />
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    )
}
