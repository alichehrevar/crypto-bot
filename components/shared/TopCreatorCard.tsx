// components/shared/TopCreatorCard.tsx
import React, {FC} from 'react'
import Image from 'next/image'

export interface TopCreatorCardProps {
    id: string
    name: string
    avatarUrl: string
    isFollowing?: boolean
    onToggleFollow?: (id: string) => void
}

const TopCreatorCard: FC<TopCreatorCardProps> = ({
     id,
     name,
     avatarUrl,
     isFollowing = false,
     onToggleFollow,
}) => {
    return (
        <div className="flex items-center gap-3 w-[200px] h-[60px]">
            {/* Avatar with double ring */}
            <div className="relative w-12 h-12">
                <div className="absolute inset-0 rounded-full ring-4 ring-gray-800"/>
                <div className="absolute inset-1 rounded-full ring-2 ring-gray-600"/>
                <Image
                    fill
                    alt={name}
                    className="rounded-full object-cover"
                    src={avatarUrl}
                />
            </div>

            <div className="flex flex-col gap-1">
                {/* Name */}
                <span className="text-white text-sm font-medium">{name}</span>

                {/* Follow button */}
                <button
                    className={
                        `px-2 py-0.5 rounded-full text-xs font-medium transition-colors duration-200 ` +
                        (isFollowing
                            ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            : 'bg-gray-600 text-white hover:bg-gray-500')
                    }
                    onClick={() => onToggleFollow?.(id)}
                >
                    {isFollowing ? 'Following' : 'Follow'}
                </button>
            </div>
        </div>
    )
}

export default TopCreatorCard
