// Clase singleton para gestionar la autenticación
class AuthService {
  private static instance: AuthService
  private username = "RBTMuleApi_ADCDes"
  private password: string | null = null

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService()
    }
    return AuthService.instance
  }

  public setCredentials(password: string): void {
    this.password = password
  }

  public getCredentials(): { username: string; password: string | null } {
    return {
      username: this.username,
      password: this.password,
    }
  }

  public isAuthenticated(): boolean {
    return this.password !== null
  }

  public clearCredentials(): void {
    this.password = null
  }

  public getBasicAuthToken(): string | null {
    if (!this.password) return null
    return Buffer.from(`${this.username}:${this.password}`).toString("base64")
  }

  // Función para ofuscar la contraseña
  public ofuscatePassword(password: string): string {
    if (!password) return ""
    const visibleChars = 2
    const prefix = password.substring(0, visibleChars)
    const suffix = password.substring(password.length - visibleChars)
    const middle = "•".repeat(Math.max(0, password.length - visibleChars * 2))
    return `${prefix}${middle}${suffix}`
  }
}

export const authService = AuthService.getInstance()
