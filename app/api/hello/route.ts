import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    message: "Hola desde la API de Node.js",
    timestamp: new Date().toISOString(),
    status: "online",
  })
}
