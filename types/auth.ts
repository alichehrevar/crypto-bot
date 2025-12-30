export type AuthResponse = {
  success: boolean,
  data: {
    token: string,
    user: {
      email: string
    }
  },
  message: string
}
