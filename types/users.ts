// 1. Reusable Sub-types
export type UserRole = 'admin' | 'user' | 'broker' | 'support'; // Extend as needed
export type UserStatus = 'active' | 'suspended' | 'pending';

// Standard MongoDB GeoJSON format
export interface GeoJSONPoint {
    type: 'Point';
    coordinates: [number, number]; // Tuple: [longitude, latitude]
}

export interface DeviceInfo {
    ip: string;
    userAgent: string;
    city: string;
    country: string;
}

// 2. Nested Entity Interfaces
export interface LocationLog {
    location: GeoJSONPoint;
    source: string; // e.g., 'login', 'signup', 'device_refresh'
    deviceInfo: DeviceInfo;
}

export interface UserProfile {
    birthday: string; // ISO 8601 Date String
    firstName: string;
    lastName: string;
    avatar?: string | null;
}

// 3. Main User Interface
export interface User {
    _id: string;
    email: string;
    createdAt: string; // ISO 8601 Date String
    role: UserRole;
    status: UserStatus;
    info: UserProfile;
    locationHistory: LocationLog[];
}

// 4. Generic API Response Wrapper
// Useful for standarizing all backend responses in your Next/Node app
export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string; // Optional: good for error handling
}

// 5. Specific Response Type for this Request
export type UserListResponse = ApiResponse<User[]>;
