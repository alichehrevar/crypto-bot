// components/common/Pagination.tsx
'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
    page: number
    setPage: (page: number) => void
    total: number
    label: string
}

export function Pagination({ page, setPage, total, label }: PaginationProps) {
    const getPageNumbers = () => {
        const pages: (number | string)[] = []
        const maxVisiblePages = 5

        if (total <= maxVisiblePages) {
            for (let i = 1; i <= total; i++) pages.push(i)
        } else {
            if (page <= 3) {
                pages.push(1, 2, 3, 4, '...', total)
            } else if (page >= total - 2) {
                pages.push(1, '...', total - 3, total - 2, total - 1, total)
            } else {
                pages.push(1, '...', page - 1, page, page + 1, '...', total)
            }
        }
        return pages
    }

    return (
        <div className="flex justify-between items-center p-4 border-t border-zinc-900 bg-zinc-950 select-none">
            <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">
                {label} <span className="text-zinc-600">|</span> Page{' '}
                <span className="text-white">{page}</span> of <span className="text-white">{total}</span>
            </div>
            <div className="flex items-center gap-1">
                <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-900 rounded-sm disabled:opacity-20 disabled:hover:bg-transparent transition-all border border-transparent hover:border-zinc-800"
                >
                    <ChevronLeft size={14} />
                </button>

                <div className="hidden sm:flex gap-1">
                    {getPageNumbers().map((p, i) => (
                        <button
                            key={i}
                            onClick={() => typeof p === 'number' && setPage(p)}
                            disabled={typeof p !== 'number'}
                            className={`w-8 h-8 flex items-center justify-center text-[10px] font-bold rounded-sm transition-all border
                ${
                                p === page
                                    ? 'bg-white text-black border-white shadow-sm'
                                    : typeof p === 'number'
                                        ? 'text-zinc-500 hover:text-white hover:bg-zinc-900 border-transparent hover:border-zinc-800'
                                        : 'text-zinc-700 border-transparent cursor-default'
                            }
              `}
                        >
                            {p}
                        </button>
                    ))}
                </div>

                <button
                    onClick={() => setPage(Math.min(total, page + 1))}
                    disabled={page === total}
                    className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-900 rounded-sm disabled:opacity-20 disabled:hover:bg-transparent transition-all border border-transparent hover:border-zinc-800"
                >
                    <ChevronRight size={14} />
                </button>
            </div>
        </div>
    )
}
