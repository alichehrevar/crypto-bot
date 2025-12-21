'use client'

import React, {FormEvent, useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {Button, Form, addToast} from "@heroui/react";

import {sendRequest} from "@/actions/post";
import {AuthResponse} from "@/types/auth";
import Input from "@/components/shared/ui/Input";

export default function LoginForm() {

    const router = useRouter();

    const [FormLoading, setFormLoading] = useState(false);

    async function handleLoginFormSubmission(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setFormLoading(true);
        const formData = Object.fromEntries(new FormData(event.currentTarget));

        try {
            await sendRequest(formData, '/auth/login')
                .then((res: AuthResponse) => {
                    if (res.error) {
                        addToast({
                            title: res.error,
                            color: "danger",
                        });
                    } else {
                        addToast({
                            title: 'Welcome !',
                            color: "success",
                        });
                        router.push('/my-account');
                    }
                })
        } catch {
            addToast({
                title: "Something went wrong",
                description: "Please, try again later",
                color: "danger",
            });
        } finally {
            setFormLoading(false);
        }
    }

    return (
        <>
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-bold text-white">
                        Login
                    </h1>
                </div>
            </div>
            <Form className="space-y-6" onSubmit={handleLoginFormSubmission}>
                <div className="space-y-2 w-full">
                    <Input
                        id="email"
                        placeholder="Enter your Email"
                        title="Email"
                        type="email"
                    />
                </div>

                <div className="space-y-2 w-full">
                    <Input
                        id="password"
                        placeholder="Enter your Password"
                        title="Password"
                        type="password"
                    />
                </div>

                <Button
                    className="w-full bg-transparent border-2 border-white text-white hover:bg-white hover:text-black transition-colors"
                    disabled={FormLoading}
                    isLoading={FormLoading}
                    type="submit"
                >
                    Login
                </Button>

                <div className="text-center text-white text-sm flex gap-1.5">
                    Don&#39;t have an Account?
                    <Link className="hover:underline transition-all duration-250 font-medium" href="/register">
                        Join Us
                    </Link>
                </div>
            </Form>
        </>
    )
}
