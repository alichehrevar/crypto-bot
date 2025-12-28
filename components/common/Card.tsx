// components/common/Card.tsx
import { ReactNode } from 'react'

interface CardProps {
    children: ReactNode
    className?: string
}

export function Card({ children, className = '' }: CardProps) {
    return (
        <div className={`bg-zinc-950 border border-zinc-800 p-6 ${className}`}>
            {children}
        </div>
    )
}
