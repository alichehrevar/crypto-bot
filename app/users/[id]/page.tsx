// app/users/[id]/page.tsx
'use client'

import { useParams } from 'next/navigation'
import { UserProfile } from '@/components/users/UserProfile'
import { MOCK_USERS } from '@/lib/data'

export default function UserProfilePage() {
    const params = useParams()
    const userId = params.id as string
    const user = MOCK_USERS.find(u => u.id === userId)

    if (!user) {
        return (
            <div className="text-center py-12">
                <h2 className="text-2xl text-white">User not found</h2>
                <p className="text-zinc-500 mt-2">User with ID {userId} does not exist.</p>
            </div>
        )
    }

    return <UserProfile user={user} />
}
