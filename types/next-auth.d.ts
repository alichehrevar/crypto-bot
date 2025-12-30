// next-auth.d.ts
import { DefaultSession } from "next-auth"

declare module "next-auth" {
    interface User {
        accessToken?: string;
    }
    interface Session {
        user: {
            accessToken?: string;
            id: string;
        } & DefaultSession["user"]
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        accessToken?: string;
        id?: string;
    }
}
