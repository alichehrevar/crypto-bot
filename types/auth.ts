export type AuthResponse = {
  success: boolean
  token: string,
  error: string,
}

export type checkEmailExistenceResponse = {
  success: boolean,
  exists: boolean,
  error: string
}
