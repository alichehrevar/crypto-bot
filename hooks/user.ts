// hooks/user.ts

import { makeObservable, observable, action, runInAction } from 'mobx';

import { User, UserResponse } from "@/types/UserType";
import { getData } from "@/actions/get";

class UserStore {
    userData: User | null = null;
    isInitialized: boolean = false; // Add a flag to prevent re-fetching

    constructor() {
        makeObservable(this, {
            userData: observable,
            isInitialized: observable,
            initializeUser: action,
            storeUser: action,
            removeUser: action,
        });
    }

    // safely initialize the user state
    async initializeUser() {
        // Only run initialization once
        if (this.isInitialized || typeof window === "undefined") {
            return;
        }

        let savedUser: User | null = null;
        const localUser = localStorage.getItem("user");

        if (localUser && localUser !== "undefined") {
            savedUser = JSON.parse(localUser);
        }

        // Try to get fresh data from the API
        const apiUser = await this.fetchUserFromAPI();

        runInAction(() => {
            if (apiUser) {
                this.userData = apiUser;
                this.saveUserToLocalStorage();
            } else {
                this.userData = savedUser; // Fallback to localStorage if API fails
            }
            this.isInitialized = true; // Mark as initialized
        });
    }

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

    storeUser(user: User) {
        this.userData = user;
        this.saveUserToLocalStorage();
    }

    removeUser() {
        this.userData = null;
        this.removeUserToLocalStorage();
    }
}

const userStore = new UserStore();

export default userStore;
