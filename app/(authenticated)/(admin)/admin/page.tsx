'use client'

import React, {useEffect, useState} from "react";
import {addToast, Spinner} from "@heroui/react";

import {DashboardData, DashboardResponse} from "@/types/admin/Dashboard";
import {getData} from "@/actions/get";

export default function AdminHome() {

    const [dashboardData, setDashboardData] = React.useState<DashboardData>({usersCount: 0, botsCount: 0})
    const [loading, setLoading] = useState(true)

    async function getDashboardData () {
        return await getData('/admin/dashboard')
    }

    useEffect(() => {
        getDashboardData()
            .then((response: DashboardResponse) => {
                if (response.success) {
                    setDashboardData(response.data)
                } else {
                    addToast({
                        title: response.error,
                        color: "warning"
                    })
                }
            })
            .catch(() => {
                addToast({
                    title: "Failed to load dashboard data",
                    color: "danger"
                })
            })
            .finally(() => {
                setLoading(false)
            })
    }, [])

    return (
        <div className="glass-card grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="glass flex items-center justify-between p-4 font-semibold">
                <p className="capitalize">users count</p>
                {!loading
                    ? <span>{dashboardData?.usersCount}</span>
                    : <Spinner className="-top-1" color="default" size="sm" variant="wave" />
                }
            </div>
            <div className="glass flex items-center justify-between p-4 font-semibold">
                <p className="capitalize">bots count</p>
                {!loading
                    ? <span>{dashboardData?.botsCount}</span>
                    : <Spinner className="-top-1" color="default" size="sm" variant="wave" />
                }
            </div>
        </div>
    );
}
