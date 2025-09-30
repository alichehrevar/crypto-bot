type UserInfo = {
    firstName: string,
    lastName: string,
    phoneCountry: string,
    phoneNumber: string,
    birthday: string,
    avatar: string | null | undefined,
}

export type User = {
    id: string,
    email: string,
    enable2Fa: boolean,
    info: UserInfo | null
}

export type UserResponse = {
    success: boolean,
    data: User
    message: string
}
