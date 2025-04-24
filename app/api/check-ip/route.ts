import { type NextRequest, NextResponse } from "next/server"
import { generateCorrelationId } from "@/app/utils/correlation-id"

export async function GET(request: NextRequest) {
  // Generar un correlation ID con el formato requerido
  const correlationId = generateCorrelationId()

  // Obtener la IP del cliente
  const ip = request.ip || request.headers.get("x-forwarded-for") || "0.0.0.0"

  // Verificar si la IP comienza con 212.142 o es 0.0.0.0
  const isAuthorizedIP = ip.startsWith("212.142.") || ip === "0.0.0.0"

  // Actualizar el mensaje para incluir la excepción
  const message = isAuthorizedIP
    ? ip === "0.0.0.0"
      ? "IP autorizada (modo preview)"
      : "IP autorizada"
    : "Acceso restringido: Esta aplicación solo está disponible desde la red corporativa (212.142.*.*)"

  // Registrar el correlation ID
  console.log(`Verificación de IP - Correlation ID: ${correlationId}`)

  // Devolver el resultado
  return NextResponse.json({
    ip,
    isAuthorized: isAuthorizedIP,
    message: message,
    correlationId: correlationId,
  })
}

