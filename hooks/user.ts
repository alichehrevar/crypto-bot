import { makeObservable, observable, action } from 'mobx';

import {User} from "@/types/UserType";
import {getData} from "@/actions/get";

class UserStore {
    userData: User | null = null;

    constructor() {
        makeObservable(this, {
            userData: observable,
            storeUser: observable,
            removeUser: observable,
            loadUserFromLocalStorage: action
        });

        // Load user from localStorage after initial render (client-side only)
        if (typeof window !== "undefined") {
            this.loadUserFromLocalStorage();
        }
    }

    async fetchUserFromAPI() {
        try {
            const userData = await getData('/user/profile')

            return userData.data.user;
        } catch {
            return null;
        }
    }

    // Load user from localStorage (only on client-side)
    async loadUserFromLocalStorage(): Promise<void> {
        let savedUser: User | null = null;
        const localUser = localStorage.getItem("user");

        if (localUser && localUser !== "undefined") {
            savedUser = JSON.parse(localUser);
        }

        const apiUser = await this.fetchUserFromAPI();

        if (apiUser) {
            this.storeUser(apiUser); // Save to store & localStorage
        } else {
            this.userData = savedUser;
        }
    }

    // Save user to localStorage (only on client-side)
    saveUserToLocalStorage(): void {
        if (typeof window !== "undefined") {
            localStorage.setItem('user', JSON.stringify(this.userData));
        }
    }

    // Remove user to localStorage (only on client-side)
    removeUserToLocalStorage(): void {
        if (typeof window !== "undefined" && localStorage.getItem('user')) {
            localStorage.removeItem('user');
        }
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
