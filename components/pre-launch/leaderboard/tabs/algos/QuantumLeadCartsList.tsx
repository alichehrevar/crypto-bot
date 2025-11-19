import React, {useEffect, useState} from "react";
import {addToast} from "@heroui/react";

import { ApiResponse, ApiJob } from "@/types/preLaunch/TopROI";
import QuantumLeadCard from "@/components/pre-launch/leaderboard/tabs/algos/QuantumLeadCard";
import {getData} from "@/actions/get";
import QuantumLeadCardLoading from "@/components/loading/pre-launch/QuantumLeadCardLoading";

export default function QuantumLeadCardsList () {

    const [cardData, setCardData] = useState<ApiJob[]>([])
    const [isLoading, setIsLoading] = useState<boolean>(true)

    async function fetchData () {
        return getData('/leaderboard/top-roi')
    }

    useEffect(() => {
        fetchData()
            .then((response: ApiResponse) => {
                if (response.success) {
                    setCardData(response.data)
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
            .finally(() => setIsLoading(false))
    }, [])

    if (isLoading) {
        return (
            <>
                {[...Array(10)].map((_, index) => (
                    <QuantumLeadCardLoading key={index} />
                ))}
            </>
        )
    }


    return (
        <>
            {cardData.map((cardValues, index) => (
                <QuantumLeadCard key={index} data={cardValues} />
            ))}
        </>
    )
}
