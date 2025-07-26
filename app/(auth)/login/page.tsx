
import Image from "next/image";

import LoginForm from "@/components/auth/loginForm";
import { siteConfig } from "@/config/site";

export default function LoginPage() {
  return (
    <section className="h-screen w-screen relative">
      <Image
        fill
        alt={siteConfig.name}
        className="w-screen h-screen scale-x-[-1] z-0 absolute"
        src="/images/auth/auth-bg-nature.webp"
      />
      <div className="px-2 lg:px-4">
        <div className="z-10 relative w-full md:w-3/4 lg:w-1/2 mx-auto lg:ml-auto lg:mr-0 my-8 lg:my-32">
          <LoginForm />
        </div>
      </div>
    </section>
  )
}
