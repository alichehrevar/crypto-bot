export type AuthResponse = {
  success: boolean
  message: string,
  error: string,
}

export type OtpVerification = {
    success: boolean,
    error: string,
    data: {
        token: string
    }
}

export type checkEmailExistenceResponse = {
  success: boolean,
  exists: boolean,
  error: string
}

export type Toggle2faResponse = {
    success: boolean,
    message: string,
}
