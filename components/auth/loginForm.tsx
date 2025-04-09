'use client'

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Checkbox, Input, Button, Form, addToast } from "@heroui/react";

import { sendRequest } from "@/actions/post";
import { AuthResponse } from "@/types/auth";

export default function LoginForm () {

  const router = useRouter();

  const [FormLoading, setFormLoading] = useState(false);

  async function handleLoginFormSubmission (event: FormEvent<HTMLFormElement>) {
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
            router.push('/profile/settings');
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
    <Form className="flex items-center justify-center flex-col gap-4 w-3/4 lg:w-1/2 mx-auto" onSubmit={handleLoginFormSubmission}>
      <h3 className="flex justify-start w-full font-bold text-[24px] mb-3">Login</h3>
      <Input
        isRequired
        classNames={{
          inputWrapper: 'dark:border-white border-[1.4px] backdrop-blur-sm'
        }}
        label="Email"
        name="email"
        type="email"
        variant="bordered"
      />
      <Input
        isRequired
        classNames={{
          inputWrapper: 'dark:border-white border-[1.4px] backdrop-blur-sm'
        }}
        label="Password"
        minLength={8}
        name="password"
        type="password"
        validate={(value) => {
          if (!value) {
            return "Please fill out this field."
          }
          if (value.length < 8) {
            return "Password must be at least 8 characters long";
          }
        }}
        variant="bordered"
      />
      <div className="flex items-center justify-between w-full">
        <Checkbox defaultSelected size="sm">
          <span className="text-[13px]">
            Remember Me
          </span>
        </Checkbox>
        <Link className="text-[13px] dark:text-white light:text-[var(--text-color-light)]" href="/forgot-password">Forgot Password?</Link>
      </div>
      <Button className="w-full mt-6 py-6 border-white" isLoading={FormLoading} type="submit" variant="bordered">
        Login
      </Button>
      <div className="flex items-center gap-x-1.5">
        <span className="font-light text-[13px]">Don&#39;t have an account? </span>
        <Link className="dark:text-white text-[14px] font-bold" href="/register">Join Us</Link>
      </div>
    </Form>
  )
}
