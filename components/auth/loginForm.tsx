'use client'

import { Checkbox, Input } from "@heroui/react";
import { Link } from "@heroui/link";

export default function LoginForm () {
  return (
    <form className="flex items-center justify-center flex-col gap-4 w-1/2 mx-auto">
      <h3 className="flex justify-start w-full font-bold text-[24px] mb-3">Login</h3>
      <Input label="Email" name="email" type="email" />
      <Input label="Password" name="password" type="password" />
      <div className="flex items-center justify-between w-full">
        <Checkbox defaultSelected>
          <span className="text-[13px]">
            Remember Me
          </span>
        </Checkbox>
        <Link className="text-[13px] dark:text-white light:text-[var(--text-color-light)]" href="/forgot-password">Forgot Password?</Link>
      </div>
    </form>
  )
}
