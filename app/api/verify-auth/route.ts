import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    // Obtener la clave de acceso de la variable de entorno
    const accessPwd = process.env.AccessPwd

    if (!accessPwd) {
      console.error("Variable de entorno AccessPwd no configurada")
      return NextResponse.json({ message: "Error de configuración del servidor" }, { status: 500 })
    }

    // Obtener la contraseña del cuerpo de la solicitud
    const body = await request.json()
    const { password } = body

    if (!password) {
      return NextResponse.json({ message: "Clave de acceso requerida" }, { status: 400 })
    }

    // Verificar si la contraseña coincide con la clave de acceso
    if (password === accessPwd) {
      return NextResponse.json({ message: "Autenticación exitosa" })
    } else {
      return NextResponse.json({ message: "Clave de acceso incorrecta" }, { status: 401 })
    }
  } catch (error) {
    console.error("Error en la verificación de autenticación:", error)
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 })
  }
}

// Mantener el método GET para compatibilidad con el código existente
export async function GET(request: NextRequest) {
  // Verificar si el usuario está autenticado por IP
  const ip = request.ip || request.headers.get("x-forwarded-for") || "0.0.0.0"
  const isAuthorizedIP = ip.startsWith("212.142.") || ip === "0.0.0.0"

  if (isAuthorizedIP) {
    return NextResponse.json({ message: "IP autorizada" })
  }

  // Si no está autorizado por IP, verificar el encabezado de autorización
  const authHeader = request.headers.get("Authorization")

  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return NextResponse.json({ message: "Autorización requerida" }, { status: 401 })
  }

  // Para mantener compatibilidad con el código existente
  try {
    const response = await fetch("https://apides.nortegas.es/api/adc/v1.0/customer?nif=72430367D", {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: authHeader,
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
}
