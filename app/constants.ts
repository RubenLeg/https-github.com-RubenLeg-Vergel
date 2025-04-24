// Credenciales para autenticación básica
export const API_USERNAME = "RBTMuleApi_ADCDes"
export const API_PASSWORD = "k6)Yo8N77dJL@y{v"

// Función para generar el token de autenticación básica
export function getBasicAuthToken(): string {
  return Buffer.from(`${API_USERNAME}:${API_PASSWORD}`).toString("base64")
}

