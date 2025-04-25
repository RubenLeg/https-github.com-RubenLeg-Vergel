"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { EyeIcon, EyeOffIcon, KeyIcon, Loader2 } from "lucide-react"
import { authService } from "@/app/services/auth-service"

// Componente para el formulario de autenticación
export default function AuthForm({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!password.trim()) {
      setError("Por favor, introduce la contraseña")
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Guardar las credenciales en memoria
      authService.setCredentials(password)

      // Verificar si las credenciales son válidas haciendo una llamada de prueba
      const authToken = authService.getBasicAuthToken()
      const response = await fetch("/api/verify-auth", {
        headers: {
          Authorization: `Basic ${authToken}`,
        },
      })

      if (response.ok) {
        onAuthenticated()
      } else {
        const data = await response.json()
        setError(data.message || "Credenciales inválidas")
        authService.clearCredentials()
      }
    } catch (err) {
      setError("Error al verificar las credenciales")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="bg-nortegas-dark-blue text-white">
        <CardTitle className="flex items-center">
          <KeyIcon className="mr-2 h-5 w-5" />
          Autenticación requerida
        </CardTitle>
        <CardDescription className="text-gray-200">Introduzca la clave de acceso para continuar</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Usuario</Label>
              <Input id="username" value="RBTMuleApi_ADCDes" disabled className="bg-gray-100" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Clave de acceso</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                  placeholder="Introduzca la clave de acceso"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">{error}</div>
            )}
          </div>

          <CardFooter className="px-0 pt-6">
            <Button type="submit" className="w-full bg-nortegas-blue hover:bg-nortegas-blue/90" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                "Acceder"
              )}
            </Button>
          </CardFooter>
        </form>
      </CardContent>
    </Card>
  )
}
