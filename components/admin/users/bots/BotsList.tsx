'use client'

import React, {useEffect, useState} from "react";
import {addToast, Spinner} from "@heroui/react";

import {getData} from "@/actions/get";
import {BotApiResponse, Bots} from "@/types/admin/Bots";
import IndicatorBotsList from "@/components/admin/users/bots/IndicatorBotsList";
import GridBotsList from "@/components/admin/users/bots/GridBotsList";

export default function UserBotsList ({ userId }: {userId: string}){

    const [botsList, setBotsList] = useState<Bots>({indicator: [], grid: []})
    const [isLoading, setIsLoading] = useState<boolean>(true)

    async function fetchBotsList (){
        return await getData(`/admin/bots/${userId}`)
    }

    useEffect(() => {
        fetchBotsList()
            .then((response: BotApiResponse) => {
                if (response.success) {
                    setBotsList(response.bots)
                }
            })
            .catch(() => {
                addToast({
                    title: "Failed to load bots list",
                    color: "danger"
                })
            })
            .finally(() => {
                setIsLoading(false)
            })
    }, [])

    return (
        <>
            {isLoading &&
                <div className="flex items-center justify-center flex-row-reverse gap-3 h-24 glass rounded-lg w-full">
                    <Spinner className="mr-2" color="primary" size="sm" variant="wave" />
                    Loading Data…
                </div>
            }
            {!isLoading && botsList.hasOwnProperty('indicator') &&
                <IndicatorBotsList bots={botsList.indicator} />
            }
            {!isLoading && botsList.hasOwnProperty('grid') &&
                <GridBotsList bots={botsList.grid} />
            }
        </>
    )
}
