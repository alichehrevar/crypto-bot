import React, {FormEvent, useEffect, useState} from "react";
import {addToast} from "@heroui/react";

import Input from '@/components/shared/ui/Input'
import {TokenFormType} from "@/types/profile/settings/tokenFormType";
import {sendRequest} from "@/actions/post";
import {getData} from "@/actions/get";
import {AccountResponse} from "@/types/profile/AccountType";

export default function TokenForm(props: { type: string | 'binance' | 'okx' | 'bingx' | 'bybit' }) {

    const [form, setForm] = useState({
        apiKey: "",
        secretKey: "",
        passphrase: "",
        permissions: [] as string[],
    });
    const [formLoading, setFormLoading] = useState(false);

    useEffect(() => {
        getAccountData()
            .then((accountData: AccountResponse) => {
                if (accountData.account) {
                    setForm({
                        apiKey: accountData.account.apiKey || "",
                        secretKey: accountData.account.secretKey || "",
                        passphrase: (accountData.account as any).passphrase || "",
                        permissions: accountData.account.permissions || [],
                    });
                }
            })
            .catch(() => {
                addToast({
                    title: "Error getting account info",
                    color: "danger",
                });
            })
    }, [props.type]);

    async function getAccountData() {
        return await getData(`/accounts/${props.type}`)
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setFormLoading(true);
        const payload: Record<string, string | File> = {
            apiKey: form.apiKey,
            secretKey: form.secretKey,
            // if OKX:
            passphrase: form.passphrase,
            // flatten the array
            permissions: JSON.stringify(form.permissions),
        };
        const response: TokenFormType = await sendRequest(payload, `/accounts/${props.type}`)

        if (response.error) {
            addToast({
                title: response.error,
                color: "danger",
            });
        } else {
            addToast({
                title: 'Data saved successfully !',
                color: "success",
            });
        }
        setFormLoading(false);
    }

    return (
        <form className={`mt-16 w-full lg:w-3/4 ms-auto grid ${props.type === 'okx' ? 'grid-cols-3' : 'grid-cols-2'} gap-3`} onSubmit={handleSubmit}>
            <Input
                id="api-key"
                title="API Key"
                onChange={(val) => form.apiKey = val}
            />
            <Input
                id="api-secret"
                title="API Secret"
                type="password"
                onChange={(val) => form.secretKey = val}
            />
            {props.type === 'okx' &&
                <Input
                    id="passphrase"
                    title="Passphrase"
                    type="password"
                    onChange={(val) => form.passphrase = val}
                />
            }
            <div className={`flex w-full justify-end ${props.type === 'okx' ? 'col-span-3' : 'col-span-2'}`}>
                <button
                    className="bg-white text-black font-semibold py-2 px-8 rounded-md transition duration-300 ease-in-out hover:bg-gray-200"
                    disabled={formLoading}
                    type="submit"
                >
                    Connect
                </button>
            </div>
        </form>
    )
}
