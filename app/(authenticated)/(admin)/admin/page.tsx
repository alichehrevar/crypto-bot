'use client'

import React, {useEffect} from "react";
import {addToast} from "@heroui/react";

import {DashboardData, DashboardResponse} from "@/types/admin/Dashboard";
import {getData} from "@/actions/get";

export default function AdminHome() {

    const [dashboardData, setDashboardData] = React.useState<DashboardData>()

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
    }, [])

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="glass flex items-center justify-between p-4 font-semibold">
                <p className="capitalize">users count</p>
                <span>{dashboardData?.usersCount}</span>
            </div>
            <div className="glass flex items-center justify-between p-4 font-semibold">
                <p className="capitalize">bots count</p>
                <span>{dashboardData?.botsCount}</span>
            </div>
        </div>
    );
}
