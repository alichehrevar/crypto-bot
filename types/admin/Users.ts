export interface UserInfo {
    _id: string;
    userId: string;
    firstName: string;
    lastName: string;
    avatar: string;
}

export interface User {
    _id: string;
    email: string;
    role: 'admin' | 'client';
    info: UserInfo;
}

export interface UsersListApiResponse {
    success: boolean;
    data: User[];
    message: string;
}
