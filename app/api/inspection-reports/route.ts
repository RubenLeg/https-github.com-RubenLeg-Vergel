import { type NextRequest, NextResponse } from "next/server"
import { generateCorrelationId } from "@/app/utils/correlation-id"
import { getBasicAuthToken } from "@/app/constants"

export async function GET(request: NextRequest) {
  try {
    // Obtener los parámetros de consulta
    const searchParams = request.nextUrl.searchParams
    const ic = searchParams.get("ic")
    const cups = searchParams.get("cups")

    // Verificar que todos los parámetros requeridos estén presentes
    if (!ic || !cups) {
      return NextResponse.json(
        {
          error: "Parámetros incompletos",
          details: "Se requieren los parámetros ic y cups",
        },
        { status: 400 },
      )
    }

    // Obtener el token de autenticación básica
    const base64Credentials = getBasicAuthToken()

    // Obtener el correlation ID del encabezado o generar uno nuevo con el formato requerido
    const correlationId = request.headers.get("x-correlation-id") || generateCorrelationId()

    console.log(`Realizando petición a la API de inspecciones de Nortegas...`)
    console.log(`Correlation ID: ${correlationId}`)

    // Construir la URL con los parámetros
    const apiUrl = `https://apides.nortegas.es/api/adc/v1.0/contracts/inspection-reports?ic=${encodeURIComponent(ic)}&cups=${encodeURIComponent(cups)}`

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Basic ${base64Credentials}`,
        "x-correlation-id": correlationId,
      },
      cache: "no-store",
    })

    // Registrar información detallada para depuración
    console.log("Código de estado (inspecciones):", response.status)
    console.log("Mensaje de estado (inspecciones):", response.statusText)

    // Si la respuesta no es exitosa, devolver el error
    if (!response.ok) {
      let errorDetail = ""
      try {
        const errorBody = await response.text()
        errorDetail = errorBody || ""
      } catch (e) {
        console.error("No se pudo leer el cuerpo del error:", e)
      }

      return NextResponse.json(
        { error: `Error ${response.status}: ${response.statusText}`, details: errorDetail },
        { status: response.status },
      )
    }

    // Devolver los datos obtenidos
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error en el Route Handler de inspecciones:", error)
    return NextResponse.json(
      { error: "Error interno del servidor", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
