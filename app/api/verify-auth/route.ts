import { type NextRequest, NextResponse } from "next/server"

// Clave de acceso para usuarios sin IP autorizada
const ACCESS_KEY = "NortegasAccess2024"

export async function GET(request: NextRequest) {
  try {
    // Obtener el encabezado de autorización
    const authHeader = request.headers.get("Authorization")

    if (!authHeader || !authHeader.startsWith("Basic ")) {
      return NextResponse.json({ message: "Autorización requerida" }, { status: 401 })
    }

    // Extraer y decodificar las credenciales
    const base64Credentials = authHeader.split(" ")[1]
    const credentials = Buffer.from(base64Credentials, "base64").toString("utf-8")
    const [username, password] = credentials.split(":")

    // Verificar si es una autenticación para acceso general (sin IP autorizada)
    if (username === "RBTMuleApi_ADCDes") {
      // Verificar si la contraseña coincide con la clave de acceso
      if (password === ACCESS_KEY) {
        return NextResponse.json({ message: "Autenticación exitosa" })
      }

      // Si no coincide, intentar hacer una llamada a la API de Nortegas para verificar la contraseña
      try {
        const response = await fetch("https://apides.nortegas.es/api/adc/v1.0/customer?nif=72430367D", {
          method: "GET",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Basic ${base64Credentials}`,
          },
          cache: "no-store",
        })

        if (response.ok) {
          return NextResponse.json({ message: "Autenticación exitosa" })
        } else {
          return NextResponse.json({ message: "Credenciales inválidas" }, { status: 401 })
        }
      } catch (error) {
        console.error("Error al verificar credenciales:", error)
        return NextResponse.json({ message: "Error al verificar credenciales" }, { status: 500 })
      }
    } else {
      return NextResponse.json({ message: "Usuario incorrecto" }, { status: 401 })
    }
  } catch (error) {
    console.error("Error en la verificación de autenticación:", error)
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 })
  }
}
