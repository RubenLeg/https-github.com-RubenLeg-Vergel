import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

// Ruta al archivo que almacenará el número de versión
const versionFilePath = path.join(process.cwd(), "version.json")

// Función para leer la versión actual
function getCurrentVersion(): number {
  try {
    if (fs.existsSync(versionFilePath)) {
      const versionData = JSON.parse(fs.readFileSync(versionFilePath, "utf8"))
      return versionData.version || 1
    }
  } catch (error) {
    console.error("Error al leer el archivo de versión:", error)
  }
  return 1
}

// Función para incrementar y guardar la nueva versión
function incrementVersion(): number {
  const currentVersion = getCurrentVersion()
  const newVersion = currentVersion + 1

  try {
    fs.writeFileSync(versionFilePath, JSON.stringify({ version: newVersion }))
    return newVersion
  } catch (error) {
    console.error("Error al escribir el archivo de versión:", error)
    return currentVersion
  }
}

// Variable para almacenar la versión durante el tiempo de vida del servidor
let buildVersion: number | null = null

export async function GET() {
  // Si es la primera vez que se llama a este endpoint desde que se inició el servidor
  if (buildVersion === null) {
    // En producción, incrementamos la versión en cada despliegue
    if (process.env.NODE_ENV === "production") {
      buildVersion = incrementVersion()
    } else {
      // En desarrollo, solo leemos la versión actual
      buildVersion = getCurrentVersion()
    }
  }

  return NextResponse.json({ version: buildVersion })
}

