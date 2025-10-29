// hooks/user.ts

import { makeObservable, observable, action, computed, runInAction } from 'mobx';

import { User, UserResponse } from "@/types/UserType";
import { getData } from "@/actions/get";

type Role = 'admin' | 'client' | null;

class UserStore {
    userData: User | null = null;
    role: Role = null;
    isInitialized: boolean = false;

    constructor() {
        makeObservable(this, {
            // state
            userData: observable,
            role: observable,
            isInitialized: observable,

            // actions
            initializeUser: action,
            hydrateFromSession: action,
            storeUser: action,
            removeUser: action,

            // computed
            isAdmin: computed,
        });
    }

    /**
     * Called from client components that mount early (like layout)
     * This keeps backwards compatibility with your old logic, but:
     * - it will not touch `role` (role is authoritative from /api/session)
     * - it will only run once
     */
    async initializeUser() {
        if (this.isInitialized || typeof window === "undefined") {
            return;
        }

        let savedUser: User | null = null;
        const localUser = localStorage.getItem("user");

        if (localUser && localUser !== "undefined") {
            savedUser = JSON.parse(localUser);
        }

        const apiUser = await this.fetchUserFromAPI();

        runInAction(() => {
            // prefer fresh API profile data if available
            if (apiUser) {
                this.userData = apiUser;
                this.saveUserToLocalStorage();
            } else {
                this.userData = savedUser ?? null;
            }

            // DO NOT set role here. Role is set only by hydrateFromSession().
            this.isInitialized = true;
        });
    }

    /**
     * This is called by SessionHydrator after it calls /api/session.
     * /api/session is server-trusted (verified JWT), so it decides role.
     */
    hydrateFromSession({ role, userData }: { role: Role; userData?: any }) {
        this.role = role;
        if (userData) {
            this.userData = userData;
            this.saveUserToLocalStorage();
        }
        this.isInitialized = true;
    }

    /**
     * Computed helper for convenience in components.
     * Usage: userStore.isAdmin
     */
    get isAdmin() {
        return this.role === 'admin';
    }

    /**
     * Fetches latest user profile data from backend /user/info
     * (this endpoint should already be protected by your token in getData)
     */
    async fetchUserFromAPI() {
        try {
            const response: UserResponse = await getData('/user/info');

            return response.data;
        } catch {
            return null;
        }
    }

    saveUserToLocalStorage(): void {
        if (this.userData) {
            localStorage.setItem('user', JSON.stringify(this.userData));
        }
    }

    removeUserToLocalStorage(): void {
        localStorage.removeItem('user');
    }

    /**
     * Manually set/refresh user profile (e.g. after editing profile settings)
     */
    storeUser(user: User) {
        this.userData = user;
        this.saveUserToLocalStorage();
    }

    /**
     * Log out cleanup
     */
    removeUser() {
        this.userData = null;
        this.role = null;
        this.removeUserToLocalStorage();
        this.isInitialized = true;
    }
}

const userStore = new UserStore();

export default userStore;
