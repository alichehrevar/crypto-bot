// app/login/page.tsx
'use client';

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from 'js-cookie';

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000/api';
            const res = await fetch(`${apiUrl}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            if (res.ok) {
                const data = await res.json();
                console.log("Parsed Response Data:", data);
                // Store the token in a cookie (set expiration as needed)
                Cookies.set("token", data.token, { expires: 1 }); // expires in 1 day, for example.
                router.push("/dashboard");
            } else {
                const errorData = await res.json();
                setError(errorData.error || "Login failed");
            }
        } catch (err) {
            setError("An unexpected error occurred");
        }
    };

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Login</h1>
            {error && <p className="text-red-500">{error}</p>}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="p-2 border"
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="p-2 border"
                />
                <button type="submit" className="p-2 bg-blue-500 text-white">
                    Login
                </button>
            </form>
        </div>
    );
}
