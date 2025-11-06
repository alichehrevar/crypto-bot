'use client'

import React, {useEffect, useState} from "react";
import {addToast} from "@heroui/react";

import DataTable from "@/components/admin/DataTable";
import {User, UsersListApiResponse} from "@/types/admin/Users";
import {getData} from "@/actions/get";

export default function UsersListPage() {

    const [isLoading, setIsLoading] = useState<boolean>(true)
    const [usersList, setUsersList] = useState<User[]>([])

    async function getUsersList () {
        return await getData('/admin/users/list')
    }

    useEffect(() => {
        getUsersList()
            .then((response: UsersListApiResponse) => {
                if (response.success) {
                    setUsersList(response.data)
                } else {
                    addToast({
                        title: response.message,
                        color: 'warning'
                    })
                }
            })
            .catch(() => {
                addToast({
                    title: 'Something went wrong',
                    color: 'danger'
                })
            })
            .finally(() => {
                setIsLoading(false)
            })
    }, [])

    return (
        <section className="glass-card">
            <DataTable isLoading={isLoading} rows={usersList} />
        </section>
    );
}
