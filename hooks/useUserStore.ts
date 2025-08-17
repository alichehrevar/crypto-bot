// hooks/useUserStore.ts

import { useEffect } from 'react';

import userStore from './user';

export const useUserStore = () => {
    useEffect(() => {
        // This effect runs only on the client, after the initial render,
        // which is the perfect time to initialize our store.
        userStore.initializeUser();
    }, []); // Empty array ensures this runs only once.

    return userStore;
};
