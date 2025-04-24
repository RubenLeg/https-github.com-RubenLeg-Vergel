import { type NextRequest, NextResponse } from "next/server"
import { generateCorrelationId } from "@/app/utils/correlation-id"
import { getBasicAuthToken } from "@/app/constants"

export async function GET(request: NextRequest) {
  try {
    // Obtener los parámetros de consulta
    const searchParams = request.nextUrl.searchParams
    const nif = searchParams.get("nif")
    const ic = searchParams.get("ic")

    // Determinar qué parámetro usar para la consulta
    let queryParam = ""
    let queryValue = ""

    if (ic) {
      queryParam = "ic"
      queryValue = ic
    } else if (nif) {
      queryParam = "nif"
      queryValue = nif
    } else {
      // Valor predeterminado si no se proporciona ningún parámetro
      queryParam = "nif"
      queryValue = "72430367D"
    }

    // Obtener el token de autenticación básica
    const base64Credentials = getBasicAuthToken()

    // Obtener el correlation ID del encabezado o generar uno nuevo con el formato requerido
    const correlationId = request.headers.get("x-correlation-id") || generateCorrelationId()

    console.log(`Realizando petición a la API de Nortegas desde Route Handler con ${queryParam}=${queryValue}...`)
    console.log(`Correlation ID: ${correlationId}`)

    // Construir la URL con el parámetro correcto
    const response = await fetch(`https://apides.nortegas.es/api/adc/v1.0/customer?${queryParam}=${queryValue}`, {
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
    console.log("Código de estado:", response.status)
    console.log("Mensaje de estado:", response.statusText)

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
    console.error("Error en el Route Handler:", error)
    return NextResponse.json(
      { error: "Error interno del servidor", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
