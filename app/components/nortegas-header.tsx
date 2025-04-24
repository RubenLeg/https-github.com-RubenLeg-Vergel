"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

export default function NortegasHeader() {
  const [buildId, setBuildId] = useState<string>("")

  useEffect(() => {
    // Obtener el ID de build actual
    const fetchBuildId = async () => {
      try {
        const response = await fetch("/api/version")
        if (response.ok) {
          const data = await response.json()
          setBuildId(data.version)
        }
      } catch (error) {
        console.error("Error al obtener la versión:", error)
      }
    }

    fetchBuildId()
  }, [])

  return (
    <header className="w-full bg-nortegas-blue text-white">
      {/* Barra superior */}
      <div className="hidden md:block border-b border-nortegas-blue-light/30">
        <div className="container mx-auto px-4 py-2 flex justify-between items-center text-xs">
          <div className="flex space-x-6">
            <span>NORTEGAS</span>
            <span>Compromiso</span>
            <span>Proveedores</span>
            <span>Información útil</span>
          </div>
          <div className="flex space-x-4">
            <span>ES</span>
            <span>EN</span>
          </div>
        </div>
      </div>

      {/* Barra principal */}
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center">
          <div className="mr-4">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-nortegas-blue font-bold text-xl">
              N
            </div>
          </div>
          <span className="text-xl font-medium">Pruebas WhatsApp en MRQ</span>
        </div>

        <div className="hidden md:flex space-x-6 text-sm">
          <span>Nuestros servicios</span>
          <span>Quiero tener gas</span>
          <span>Empresas</span>
          <span>Gestiones online</span>
        </div>

        <div className="flex items-center">
          <div className="mr-4 text-xs opacity-80">v{buildId}</div>
          <Link
            href="#"
            className="bg-transparent border border-white rounded-full px-4 py-1 text-sm hover:bg-white hover:text-nortegas-blue transition-colors"
          >
            Área de cliente
          </Link>
        </div>
      </div>
    </header>
  )
}

