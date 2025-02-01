import axios, { AxiosInstance } from 'axios';

export const getApiClient = (): AxiosInstance => {
    return axios.create({
        baseURL: process.env.NEXT_PUBLIC_BACKEND_URL
    });
};
