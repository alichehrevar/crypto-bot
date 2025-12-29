// components/users/UserHub.tsx
'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
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
    ChevronRight as ChevronRightIcon,
    Loader2
} from 'lucide-react'

// --- Custom Imports ---
import { Badge } from '@/components/common/Badge'
import { Card } from '@/components/common/Card'
import { useToast } from '@/components/providers/ToastProvider'
import { getData } from "@/actions/get"
import { User, UserListResponse } from "@/types/users";

// --- Types ---
// specific sort keys for the table columns
type SortKey = 'identity' | 'country' | 'role' | 'birthday' | 'createdAt' | 'status'

const SortIcon = ({ column, sortConfig }: {
    column: string,
    sortConfig: { key: SortKey | null; direction: "asc" | "desc" }
}) => {
    if (sortConfig.key !== column)
        return <ArrowUpDown size={12} className="ml-1 text-zinc-600 opacity-0 group-hover:opacity-50 transition-opacity" />
    return <ArrowUpDown size={12} className={`ml-1 ${sortConfig.direction === 'asc' ? 'text-white' : 'text-zinc-400'}`} />
}

export function UserHub() {
    const router = useRouter()
    const { addToast } = useToast()

    // --- State ---
    const [isLoading, setIsLoading] = useState(true)
    const [allUsers, setAllUsers] = useState<User[]>([])

    const [filtersOpen, setFiltersOpen] = useState(false)
    const [filters, setFilters] = useState({
        search: '',
        role: 'ALL', // Changed from 'plan' to 'role' to match type
        country: '',
        dateStart: '',
        birthday: '',
    })

    const [sortConfig, setSortConfig] = useState<{ key: SortKey | null; direction: 'asc' | 'desc' }>({
        key: null,
        direction: 'asc',
    })

    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 15

    // --- Fetch Data ---
    const fetchUsers = useCallback(async () => {
        setIsLoading(true)
        try {
            // The response matches UserListResponse interface
            const res: UserListResponse = await getData('/admin/users/list')

            if (res.success) {
                // No mapping needed, store raw data
                setAllUsers(res.data)
            } else {
                addToast({ title: "Error", message: res.message || "Failed to load users list", type: "error" })
            }
        } catch (error) {
            console.error(error)
            addToast({ title: "Network Error", message: "Could not connect to server", type: "error" })
        } finally {
            setIsLoading(false)
        }
    }, [addToast])

    useEffect(() => {
        fetchUsers()
    }, [fetchUsers])


    // --- Logic ---

    const handleSort = (key: SortKey) => {
        let direction: 'asc' | 'desc' = 'asc'
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc'
        }
        setSortConfig({ key, direction })
    }

    const filteredUsers = useMemo(() => {
        const data = allUsers.filter((u) => {
            // Safe Accessors
            const firstName = u.info?.firstName || '';
            const lastName = u.info?.lastName || '';
            const country = u.locationHistory?.[0]?.deviceInfo?.country || '';
            const bday = u.info?.birthday ? u.info.birthday.split('T')[0] : '';
            const joined = u.createdAt ? u.createdAt.split('T')[0] : '';

            // Filter Logic
            const searchMatch = (firstName + lastName + u._id + u.email)
                .toLowerCase()
                .includes(filters.search.toLowerCase())

            const roleMatch = filters.role === 'ALL' || u.role === filters.role.toLowerCase()
            const countryMatch = !filters.country || country.toLowerCase().includes(filters.country.toLowerCase())
            const dateMatch = !filters.dateStart || joined >= filters.dateStart
            const bdayMatch = !filters.birthday || bday === filters.birthday

            // Note: Bot logic removed from filter as 'botCount' is not in User type
            return searchMatch && roleMatch && countryMatch && dateMatch && bdayMatch
        })

        if (sortConfig.key) {
            data.sort((a, b) => {
                const key = sortConfig.key!
                let aVal: string | number = '';
                let bVal: string | number = '';

                // Handle Nested Sort Keys
                switch(key) {
                    case 'identity':
                        aVal = `${a.info?.lastName} ${a.info?.firstName}`.toLowerCase();
                        bVal = `${b.info?.lastName} ${b.info?.firstName}`.toLowerCase();
                        break;
                    case 'country':
                        aVal = a.locationHistory?.[0]?.deviceInfo?.country || '';
                        bVal = b.locationHistory?.[0]?.deviceInfo?.country || '';
                        break;
                    case 'role':
                        aVal = a.role;
                        bVal = b.role;
                        break;
                    case 'birthday':
                        aVal = a.info?.birthday || '';
                        bVal = b.info?.birthday || '';
                        break;
                    case 'createdAt':
                        aVal = a.createdAt;
                        bVal = b.createdAt;
                        break;
                    case 'status':
                        aVal = a.status;
                        bVal = b.status;
                        break;
                }

                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
                return 0
            })
        }

        return data
    }, [filters, sortConfig, allUsers])

    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage)
    const paginatedUsers = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage
        return filteredUsers.slice(start, start + itemsPerPage)
    }, [filteredUsers, currentPage])

    const handleFilterChange = (key: keyof typeof filters, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }))
        setCurrentPage(1)
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

    // --- Loading View ---
    if (isLoading) {
        return (
            <div className="h-[60vh] flex flex-col items-center justify-center animate-enter">
                <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
                <span className="text-zinc-500 font-mono text-sm uppercase tracking-widest">Loading User Database...</span>
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-enter">
            {/* ... Header and Filters ... */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h2 className="text-2xl md:text-3xl font-light uppercase tracking-[0.2em] text-white">Identity Hub</h2>
                    <p className="text-zinc-500 text-xs font-mono mt-2">GLOBAL USER DATABASE & ACCESS CONTROL</p>
                </div>

            </div>

            {/* Top Stat Cards - Calculated from Fetched Data */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-[10px] uppercase text-zinc-500 font-bold mb-1">Total Users</div>
                            <div className="text-xl font-mono text-white">{allUsers.length}</div>
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
                                {allUsers.filter(u => u.status === 'active').length}
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
                            <div className="text-[10px] uppercase text-zinc-500 font-bold mb-1">New This Month</div>
                            <div className="text-xl font-mono text-white">
                                {allUsers.filter(u => {
                                    const now = new Date();
                                    const joined = new Date(u.createdAt);
                                    return joined.getMonth() === now.getMonth() && joined.getFullYear() === now.getFullYear();
                                }).length}
                            </div>
                        </div>
                        <div className="p-2 bg-zinc-900 rounded-full">
                            <Calendar size={20} className="text-zinc-500" />
                        </div>
                    </div>
                </Card>
                <Card className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-[10px] uppercase text-zinc-500 font-bold mb-1">Admin Users</div>
                            <div className="text-xl font-mono text-amber-500">
                                {allUsers.filter(u => u.role === 'admin').length}
                            </div>
                        </div>
                        <div className="p-2 bg-zinc-900 rounded-full">
                            <Hash size={20} className="text-zinc-500" />
                        </div>
                    </div>
                </Card>
            </div>

            <div className="flex gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-3 top-2.5 text-zinc-600" size={14} />
                    <input
                        value={filters.search}
                        onChange={(e) => handleFilterChange('search', e.target.value)}
                        placeholder="Search Name, ID or Email..."
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

            {filtersOpen && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 bg-zinc-950 p-6 border border-zinc-800 animate-enter">
                    <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-zinc-600">Role / Plan</label>
                        <select
                            value={filters.role}
                            onChange={(e) => handleFilterChange('role', e.target.value)}
                            className="w-full bg-black border border-zinc-800 text-xs text-white p-2 outline-none"
                        >
                            <option value="ALL">All Roles</option>
                            <option value="ADMIN">Admin</option>
                            <option value="USER">User</option>
                            <option value="BROKER">Broker</option>
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
                    {/* Empty placeholder for grid alignment since we removed bots filter */}
                    <div className="hidden lg:block"></div>
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
                        <th className="w-[10%] p-4 text-left cursor-pointer group hover:text-white transition-colors" onClick={() => handleSort('role')}>
                            <div className="flex items-center">
                                Role <SortIcon sortConfig={sortConfig} column="role" />
                            </div>
                        </th>
                        <th className="w-[10%] p-4 text-center cursor-default text-zinc-700">
                            {/* Disabled Sort for Bots as data is missing */}
                            <div className="flex items-center justify-center">
                                Bots
                            </div>
                        </th>
                        <th className="w-[10%] p-4 text-right cursor-pointer group hover:text-white transition-colors" onClick={() => handleSort('birthday')}>
                            <div className="flex items-center justify-end">
                                Birthday <SortIcon sortConfig={sortConfig} column="birthday" />
                            </div>
                        </th>
                        <th className="w-[10%] p-4 text-right cursor-pointer group hover:text-white transition-colors" onClick={() => handleSort('createdAt')}>
                            <div className="flex items-center justify-end">
                                Joined <SortIcon sortConfig={sortConfig} column="createdAt" />
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
                    {paginatedUsers.length === 0 ? (
                        <tr>
                            <td colSpan={8} className="p-8 text-center text-zinc-500 font-mono text-xs uppercase">
                                No users found matching filters
                            </td>
                        </tr>
                    ) : (
                        paginatedUsers.map((user) => {
                            // Extract values for rendering
                            const country = user.locationHistory?.[0]?.deviceInfo?.country || 'Unknown';
                            const birthday = user.info?.birthday ? user.info.birthday.split('T')[0] : '-';
                            const joinedAt = user.createdAt.split('T')[0];
                            // Placeholder avatar
                            const avatarSrc = user.info.avatar ? (process.env.CDN_URL! + user.info.avatar) : '/images/default-avatar.png';

                            return (
                                <tr
                                    key={user._id}
                                    className="border-b border-zinc-900 hover:bg-zinc-900/50 cursor-pointer transition-colors group"
                                    onClick={() => router.push(`/users/${user._id}`)}
                                >
                                    <td className="p-4 pl-6 overflow-hidden">
                                        <div className="block">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 relative rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden grayscale group-hover:grayscale-0 transition-all shrink-0">
                                                    <Image fill src={avatarSrc} className="w-full h-full object-cover" alt="Avatar" />
                                                </div>
                                                <div className="overflow-hidden">
                                                    <div className="font-bold text-white group-hover:underline decoration-zinc-500 underline-offset-4 truncate">
                                                        {user.info?.lastName || 'User'}, {user.info?.firstName || 'Unknown'}
                                                    </div>
                                                    <div className="text-[10px] text-zinc-500 font-mono truncate">{user.email}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-xs text-zinc-400 text-left truncate">
                                        <div className="block">
                                            <div className="flex items-center gap-1">
                                                <MapPin size={10} />
                                                {country}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-left">
                                        <div className="block">
                                            <Badge variant={'basic'}>basic</Badge>
                                        </div>
                                    </td>
                                    <td className="p-4 text-center font-mono text-white">
                                        <div className="block">
                                            0
                                        </div>
                                    </td>
                                    <td className="p-4 text-xs text-zinc-500 font-mono text-right">
                                        <div className="block">
                                            <div className="flex items-center justify-end gap-1">
                                                {birthday}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-xs text-zinc-500 font-mono text-right">
                                        <div className="block">
                                            <div className="flex items-center justify-end gap-1">
                                                {joinedAt}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="block">
                                            <Badge variant={user.status.toUpperCase()}>{user.status}</Badge>
                                        </div>
                                    </td>
                                    <td className="p-4 pr-6 text-right">
                                        <div className="block">
                                            <ChevronRight size={16} className="text-zinc-700 group-hover:text-white" />
                                        </div>
                                    </td>
                                </tr>
                            )
                        })
                    )}
                    </tbody>
                </table>

                {/* Pagination Controls */}
                <div className="flex justify-between items-center p-4 border-t border-zinc-800 bg-zinc-950">
                    <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">
                        Showing <span className="text-white">{filteredUsers.length > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0}</span> -{' '}
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
                            disabled={currentPage === totalPages || totalPages === 0}
                            className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-900 rounded disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        >
                            <ChevronRightIcon size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
