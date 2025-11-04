export interface DashboardData {
    usersCount: number,
    botsCount: number
}

export interface DashboardResponse {
    success: boolean,
    data: DashboardData,
    error: string
}
