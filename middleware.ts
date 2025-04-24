import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Variable para almacenar el estado de autorización de IP
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}

export function middleware(request: NextRequest) {
  // Obtener la IP del cliente
  const ip = request.ip || request.headers.get("x-forwarded-for") || "0.0.0.0"

  // Modificar la verificación de IP para permitir 0.0.0.0
  const isAuthorizedIP = ip.startsWith("212.142.") || ip === "0.0.0.0"

  // Crear una respuesta con la IP autorizada como encabezado personalizado
  const response = NextResponse.next()

  // Añadir un encabezado personalizado con el estado de autorización
  response.headers.set("x-ip-authorized", isAuthorizedIP ? "true" : "false")

  // Registrar la IP y el estado de autorización para depuración
  console.log(`IP: ${ip}, Autorizada: ${isAuthorizedIP}`)

  return response
}
