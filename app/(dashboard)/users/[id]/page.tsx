// app/users/[id]/page.tsx
'use client'

import { useParams } from 'next/navigation'
import { UserProfile } from '@/components/users/UserProfile'
import {useCallback, useEffect, useState} from "react";
import {getData} from "@/actions/get";
import {UserDetails, UserDetailsResponse} from "@/types/users";
import {useToast} from "@/components/providers/ToastProvider";

export default function UserProfilePage() {
    const params = useParams()
    const userId = params.id as string

    const { addToast } = useToast()

    const [user, setUser] = useState<UserDetails>()

    const fetchUserData = useCallback(async () => {
        return await getData(`/admin/users/${userId}`)
    }, [userId])

    useEffect(() => {
        fetchUserData()
            .then((response: UserDetailsResponse) => {
                if (response.success) {
                    setUser(response.data)
                } else {
                    addToast({ title: "Error", message: response.message || "Failed to load users details", type: "warning" })
                }
            })
            .catch(() => {
                addToast({ title: "Network Error", message: "Could not connect to server", type: "error" })
            })
    }, [addToast, fetchUserData]);

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
