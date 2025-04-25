"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Loader2, AlertTriangle, Clock, RefreshCw } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { generateCorrelationId } from "@/app/utils/correlation-id"
import { ScrollArea } from "@/components/ui/scroll-area"
// Añadir el import para AuthForm al inicio del archivo
import AuthForm from "./auth-form"

// Tipo para los registros de la consola
type ConsoleLog = {
  timestamp: string
  method: string
  url: string
  status?: number
  response?: any
  error?: string
  correlationId?: string
}

// Tipo para los contratos procesados
type ProcessedContract = {
  id: string
  label: string
  contractType: string
  contractNumber: string
  cups: string
  contractId?: string
  rawData: any
}

// Tipo para el modo de búsqueda
type SearchMode = "dni" | "ic"

// Tipo para las pestañas activas
type ActiveTab = "consums" | "invoices"

// Tipo para los elementos del historial
type HistoryItem = {
  id: string
  ic: string
  cif: string
  businessName: string
  lastName1?: string // Añadir el campo lastName1 como opcional
  searchMode: SearchMode
  searchValue: string
  timestamp: number
}

// Añadir estos nuevos tipos después de los tipos existentes
// Actualizar el tipo InspectionData para almacenar todas las fechas
type InspectionData = {
  cups: string
  inspectionDates: string[] // Cambiado de lastInspectionDate a inspectionDates (array)
  loading: boolean
  error: string | null
}

// Añadir después de las definiciones de tipos, antes del componente CustomerData
// Constantes para el almacenamiento del historial
const HISTORY_STORAGE_KEY = "nortegas_search_history"
const MAX_HISTORY_ITEMS = 10

// Añadir el estado para los datos de consumo
export default function CustomerData() {
  const [inputValue, setInputValue] = useState<string>("72430367D")
  const [searchMode, setSearchMode] = useState<SearchMode>("dni")
  const [customerData, setCustomerData] = useState<any>(null)
  const [contractsData, setContractsData] = useState<any>(null)
  const [processedContracts, setProcessedContracts] = useState<ProcessedContract[]>([])
  const [selectedContract, setSelectedContract] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [contractsLoading, setContractsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [contractsError, setContractsError] = useState<string | null>(null)
  const [requestCompleted, setRequestCompleted] = useState(false)
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLog[]>([])
  const [firstApiStatus, setFirstApiStatus] = useState<number | null>(null)
  const [secondApiStatus, setSecondApiStatus] = useState<number | null>(null)

  // Estados para consumos
  const [consumsData, setConsumsData] = useState<any>(null)
  const [consumsLoading, setConsumsLoading] = useState<boolean>(false)
  const [consumsError, setConsumsError] = useState<string | null>(null)
  const [consumsApiStatus, setConsumsApiStatus] = useState<number | null>(null)

  // Estados para facturas
  const [invoicesData, setInvoicesData] = useState<any>(null)
  const [invoicesLoading, setInvoicesLoading] = useState<boolean>(false)
  const [invoicesError, setInvoicesError] = useState<string | null>(null)
  const [invoicesApiStatus, setInvoicesApiStatus] = useState<number | null>(null)

  // Añadir este nuevo estado después de los estados existentes en el componente CustomerData
  const [inspectionsData, setInspectionsData] = useState<Record<string, InspectionData>>({})

  // Estado para la pestaña activa
  const [activeTab, setActiveTab] = useState<ActiveTab>("consums")

  // Estado para la autorización de IP
  const [ipAuthorized, setIpAuthorized] = useState<boolean | null>(null)
  const [clientIP, setClientIP] = useState<string>("")
  const [ipCheckLoading, setIpCheckLoading] = useState<boolean>(true)

  // Añadir un nuevo estado para controlar la autenticación por clave
  const [isPasswordAuthenticated, setIsPasswordAuthenticated] = useState<boolean>(false)

  // Estado para el historial de consultas
  const [searchHistory, setSearchHistory] = useState<HistoryItem[]>(() => {
    // Intentar cargar el historial desde localStorage al inicializar el componente
    if (typeof window !== "undefined") {
      try {
        const savedHistory = localStorage.getItem(HISTORY_STORAGE_KEY)
        if (savedHistory) {
          return JSON.parse(savedHistory)
        }
      } catch (error) {
        console.error("Error al cargar el historial desde localStorage:", error)
      }
    }
    return []
  })

  // Efecto para cambiar el valor por defecto según el modo de búsqueda
  useEffect(() => {
    if (searchMode === "dni") {
      setInputValue("72430367D")
    } else {
      setInputValue("203127684")
    }
  }, [searchMode])

  // Verificar la autenticación al cargar el componente
  useEffect(() => {
    const checkIP = async () => {
      try {
        setIpCheckLoading(true)

        // Generar correlation ID para la llamada
        const correlationId = generateCorrelationId()

        const response = await fetch("/api/check-ip", {
          headers: {
            "x-correlation-id": correlationId,
          },
        })
        const data = await response.json()

        setIpAuthorized(data.isAuthorized)
        setClientIP(data.ip)

        // Registrar en la consola
        addConsoleLog({
          timestamp: new Date().toISOString(),
          method: "INFO",
          url: `Verificación de IP: ${data.ip} - ${data.isAuthorized ? (data.ip === "0.0.0.0" ? "Autorizada (modo preview)" : "Autorizada") : "No autorizada"}`,
          correlationId,
        })
      } catch (error) {
        console.error("Error al verificar la IP:", error)
        setIpAuthorized(false)

        // Registrar el error en la consola
        addConsoleLog({
          timestamp: new Date().toISOString(),
          method: "ERROR",
          url: "Error al verificar la IP del cliente",
          error: error instanceof Error ? error.message : "Error desconocido",
        })
      } finally {
        setIpCheckLoading(false)
      }
    }

    checkIP()
  }, [])

  // Función para añadir un registro a la consola
  const addConsoleLog = (log: ConsoleLog) => {
    setConsoleLogs((prevLogs) => [...prevLogs, log])
  }

  // Función para guardar el historial en localStorage
  const saveHistoryToStorage = (history: HistoryItem[]) => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history))
      } catch (error) {
        console.error("Error al guardar el historial en localStorage:", error)
      }
    }
  }

  // Función para formatear la fecha actual en formato AAAAMMDD
  const getCurrentDateFormatted = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, "0")
    const day = String(now.getDate()).padStart(2, "0")
    return `${year}${month}${day}`
  }

  // Modificar la función para procesar los contratos para incluir el contractId
  useEffect(() => {
    if (
      secondApiStatus === 200 &&
      contractsData &&
      contractsData.value &&
      contractsData.value.contracts &&
      Array.isArray(contractsData.value.contracts)
    ) {
      const contracts = contractsData.value.contracts.map((contract: any, index: number) => {
        // Extraer los campos necesarios, con valores por defecto si no existen
        const contractType = contract.contractType || "N/A"
        const contractNumber = contract.contractNumber || "N/A"
        const cups = contract.cups || "N/A"
        const contractId = contract.contractId || ""

        // Crear el label concatenando los campos con guiones
        const label = `${contractType}-${contractNumber}-${cups}`

        return {
          id: `contract-${index}`,
          label,
          contractType,
          contractNumber,
          cups,
          contractId,
          rawData: contract,
        }
      })

      setProcessedContracts(contracts)

      // Seleccionar el primer contrato por defecto si hay contratos disponibles
      if (contracts.length > 0) {
        setSelectedContract(contracts[0].id)
      } else {
        setSelectedContract("")
      }

      // Registrar en la consola
      addConsoleLog({
        timestamp: new Date().toISOString(),
        method: "INFO",
        url: `Se han procesado ${contracts.length} contratos para el desplegable desde value.contracts`,
      })
    } else {
      setProcessedContracts([])
      setSelectedContract("")
    }
  }, [contractsData, secondApiStatus])

  // Añadir un efecto para cargar los datos de consumo cuando se selecciona un contrato
  useEffect(() => {
    if (selectedContract && customerData?.value?.ic) {
      const selectedContractDetails = getSelectedContractDetails()
      if (selectedContractDetails && selectedContractDetails.cups && selectedContractDetails.contractId) {
        // Si la pestaña activa es "consums", cargar los datos de consumo
        if (activeTab === "consums") {
          fetchConsumsData(selectedContractDetails.cups, selectedContractDetails.contractId, customerData.value.ic)
        }
      }
    } else {
      // Limpiar datos de consumos si no hay contrato seleccionado
      setConsumsData(null)
      setConsumsError(null)
      setConsumsApiStatus(null)
    }
  }, [selectedContract, activeTab])

  // Añadir un efecto para cargar los datos de facturas cuando se cambia a la pestaña de facturas
  useEffect(() => {
    if (activeTab === "invoices" && selectedContract && customerData?.value?.ic) {
      const selectedContractDetails = getSelectedContractDetails()
      if (selectedContractDetails && selectedContractDetails.contractNumber) {
        fetchInvoicesData(customerData.value.ic, selectedContractDetails.contractNumber)
      }
    }
  }, [activeTab, selectedContract])

  // Función para llamar a la segunda API cuando la primera es exitosa
  const callSecondApiIfNeeded = (customerData: any, statusCode: number) => {
    // Solo llamar a la segunda API si:
    // 1. La primera llamada devolvió un código 200
    // 2. Existe el campo "ic" dentro de la estructura "value" en la respuesta
    if (statusCode === 200 && customerData && customerData.value && customerData.value.ic) {
      fetchContractsData(customerData.value.ic)
    } else {
      // Limpiar datos de contratos si no se cumplen las condiciones
      setContractsData(null)
      setContractsError(null)
      setProcessedContracts([])
      setSelectedContract("")
      setSecondApiStatus(null)

      // Registrar en la consola por qué no se llamó a la segunda API
      if (statusCode !== 200) {
        addConsoleLog({
          timestamp: new Date().toISOString(),
          method: "INFO",
          url: "Segunda API no llamada - La primera API no devolvió código 200",
        })
      } else if (!customerData || !customerData.value) {
        addConsoleLog({
          timestamp: new Date().toISOString(),
          method: "INFO",
          url: 'Segunda API no llamada - No se encontró la estructura "value" en la respuesta',
        })
      } else if (!customerData.value.ic) {
        addConsoleLog({
          timestamp: new Date().toISOString(),
          method: "INFO",
          url: 'Segunda API no llamada - No se encontró el campo "ic" dentro de "value" en la respuesta',
        })
      }
    }
  }

  // Función para obtener datos de contratos
  const fetchContractsData = async (ic: string) => {
    if (!ic) {
      addConsoleLog({
        timestamp: new Date().toISOString(),
        method: "ERROR",
        url: "Llamada a API de contratos cancelada - IC no proporcionado",
      })
      return
    }

    setContractsLoading(true)
    setContractsError(null)
    setContractsData(null)
    setProcessedContracts([])
    setSelectedContract("")
    setSecondApiStatus(null)

    // Generar correlation ID para la llamada
    const correlationId = generateCorrelationId()

    // Registrar la llamada en la consola
    const timestamp = new Date().toISOString()
    const url = `/api/contracts?ic=${encodeURIComponent(ic)}`

    addConsoleLog({
      timestamp,
      method: "GET",
      url: `${url} (Llamada automática después de recibir IC: ${ic})`,
      correlationId,
    })

    try {
      const response = await fetch(url, {
        headers: {
          "x-correlation-id": correlationId,
        },
      })
      const statusCode = response.status
      setSecondApiStatus(statusCode)

      const result = await response.json()

      // Actualizar el registro de la consola con el resultado
      addConsoleLog({
        timestamp: new Date().toISOString(),
        method: "GET",
        url,
        status: statusCode,
        response: result,
        correlationId,
      })

      if (response.ok) {
        setContractsData(result)

        // Verificar si hay contratos en la estructura value.contracts
        if (result.value && result.value.contracts && Array.isArray(result.value.contracts)) {
          addConsoleLog({
            timestamp: new Date().toISOString(),
            method: "INFO",
            url: `Se encontraron ${result.value.contracts.length} contratos en value.contracts`,
            correlationId,
          })
        } else {
          addConsoleLog({
            timestamp: new Date().toISOString(),
            method: "INFO",
            url: "No se encontraron contratos en la estructura value.contracts",
            correlationId,
          })
        }
      } else {
        setContractsError(`Error: ${result.error || "Desconocido"} ${result.details ? `- ${result.details}` : ""}`)
      }
    } catch (err) {
      // Registrar el error en la consola
      addConsoleLog({
        timestamp: new Date().toISOString(),
        method: "GET",
        url,
        error: err instanceof Error ? err.message : "Error desconocido",
        correlationId,
      })

      setContractsError("Error inesperado al obtener datos de contratos")
      console.error(err)
    } finally {
      setContractsLoading(false)
    }
  }

  // Función para obtener datos de consumos
  const fetchConsumsData = async (cups: string, contractId: string, ic: string) => {
    if (!cups || !contractId || !ic) {
      addConsoleLog({
        timestamp: new Date().toISOString(),
        method: "ERROR",
        url: "Llamada a API de consumos cancelada - Faltan parámetros requeridos",
      })
      return
    }

    setConsumsLoading(true)
    setConsumsError(null)
    setConsumsData(null)
    setConsumsApiStatus(null)

    // Generar correlation ID para la llamada
    const correlationId = generateCorrelationId()

    // Registrar la llamada en la consola
    const timestamp = new Date().toISOString()
    const url = `/api/consums?cups=${encodeURIComponent(cups)}&contractId=${encodeURIComponent(contractId)}&ic=${encodeURIComponent(ic)}`

    addConsoleLog({
      timestamp,
      method: "GET",
      url: `${url} (Llamada automática al seleccionar contrato y pestaña de consumos)`,
      correlationId,
    })

    try {
      const response = await fetch(url, {
        headers: {
          "x-correlation-id": correlationId,
        },
      })
      const statusCode = response.status
      setConsumsApiStatus(statusCode)

      const result = await response.json()

      // Actualizar el registro de la consola con el resultado
      addConsoleLog({
        timestamp: new Date().toISOString(),
        method: "GET",
        url,
        status: statusCode,
        response: result,
        correlationId,
      })

      if (response.ok) {
        setConsumsData(result)
      } else {
        setConsumsError(`Error: ${result.error || "Desconocido"} ${result.details ? `- ${result.details}` : ""}`)
      }
    } catch (err) {
      // Registrar el error en la consola
      addConsoleLog({
        timestamp: new Date().toISOString(),
        method: "GET",
        url,
        error: err instanceof Error ? err.message : "Error desconocido",
        correlationId,
      })

      setConsumsError("Error inesperado al obtener datos de consumos")
      console.error(err)
    } finally {
      setConsumsLoading(false)
    }
  }

  // Función para obtener datos de facturas
  const fetchInvoicesData = async (ic: string, contract: string) => {
    if (!ic || !contract) {
      addConsoleLog({
        timestamp: new Date().toISOString(),
        method: "ERROR",
        url: "Llamada a API de facturas cancelada - Faltan parámetros requeridos",
      })
      return
    }

    setInvoicesLoading(true)
    setInvoicesError(null)
    setInvoicesData(null)
    setInvoicesApiStatus(null)

    // Obtener la fecha actual en formato AAAAMMDD
    const dateTo = getCurrentDateFormatted()
    const dateFrom = "20200101" // Fecha fija según requerimiento
    const status = "TODOS" // Valor fijo según requerimiento

    // Generar correlation ID para la llamada
    const correlationId = generateCorrelationId()

    // Registrar la llamada en la consola
    const timestamp = new Date().toISOString()
    const url = `/api/invoices?ic=${encodeURIComponent(ic)}&contract=${encodeURIComponent(contract)}&dateFrom=${dateFrom}&dateTo=${dateTo}&status=${status}`

    addConsoleLog({
      timestamp,
      method: "GET",
      url: `${url} (Llamada automática al seleccionar pestaña de facturas)`,
      correlationId,
    })

    try {
      const response = await fetch(url, {
        headers: {
          "x-correlation-id": correlationId,
        },
      })
      const statusCode = response.status
      setInvoicesApiStatus(statusCode)

      const result = await response.json()

      // Actualizar el registro de la consola con el resultado
      addConsoleLog({
        timestamp: new Date().toISOString(),
        method: "GET",
        url,
        status: statusCode,
        response: result,
        correlationId,
      })

      if (response.ok) {
        setInvoicesData(result)
      } else {
        setInvoicesError(`Error: ${result.error || "Desconocido"} ${result.details ? `- ${result.details}` : ""}`)
      }
    } catch (err) {
      // Registrar el error en la consola
      addConsoleLog({
        timestamp: new Date().toISOString(),
        method: "GET",
        url,
        error: err instanceof Error ? err.message : "Error desconocido",
        correlationId,
      })

      setInvoicesError("Error inesperado al obtener datos de facturas")
      console.error(err)
    } finally {
      setInvoicesLoading(false)
    }
  }

  // Añadir esta nueva función después de la función fetchInvoicesData
  // Función para obtener datos de inspecciones
  const fetchInspectionData = async (ic: string, cups: string) => {
    if (!ic || !cups) {
      addConsoleLog({
        timestamp: new Date().toISOString(),
        method: "ERROR",
        url: "Llamada a API de inspecciones cancelada - Faltan parámetros requeridos",
      })
      return null
    }

    // Actualizar el estado para mostrar que está cargando
    setInspectionsData((prev) => ({
      ...prev,
      [cups]: {
        cups,
        inspectionDates: [], // Inicializar como array vacío
        loading: true,
        error: null,
      },
    }))

    // Generar correlation ID para la llamada
    const correlationId = generateCorrelationId()

    // Registrar la llamada en la consola
    const timestamp = new Date().toISOString()
    const url = `/api/inspection-reports?ic=${encodeURIComponent(ic)}&cups=${encodeURIComponent(cups)}`

    addConsoleLog({
      timestamp,
      method: "GET",
      url: `${url} (Llamada para obtener inspecciones del contrato)`,
      correlationId,
    })

    try {
      const response = await fetch(url, {
        headers: {
          "x-correlation-id": correlationId,
        },
      })

      const result = await response.json()

      // Actualizar el registro de la consola con el resultado
      addConsoleLog({
        timestamp: new Date().toISOString(),
        method: "GET",
        url,
        status: response.status,
        response: result,
        correlationId,
      })

      if (response.ok) {
        // Procesar la respuesta para obtener todas las fechas
        let inspectionDates: string[] = []

        if (
          result.value &&
          result.value.inspectionReports &&
          Array.isArray(result.value.inspectionReports) &&
          result.value.inspectionReports.length > 0
        ) {
          // Extraer todas las fechas de revisión
          inspectionDates = result.value.inspectionReports
            .filter((report: any) => report.reviewDate) // Filtrar solo los que tienen fecha
            .map((report: any) => report.reviewDate) // Extraer las fechas
            // Ordenar de más nueva a más antigua - las fechas están en formato AAAAMMDD, así que la comparación directa de strings funciona
            .sort((a: string, b: string) => b.localeCompare(a))
        }

        // Actualizar el estado con todas las fechas de inspección
        setInspectionsData((prev) => ({
          ...prev,
          [cups]: {
            cups,
            inspectionDates,
            loading: false,
            error: null,
          },
        }))

        return inspectionDates
      } else {
        const errorMsg = `Error: ${result.error || "Desconocido"} ${result.details ? `- ${result.details}` : ""}`

        // Actualizar el estado con el error
        setInspectionsData((prev) => ({
          ...prev,
          [cups]: {
            cups,
            inspectionDates: [],
            loading: false,
            error: errorMsg,
          },
        }))

        return null
      }
    } catch (err) {
      // Registrar el error en la consola
      addConsoleLog({
        timestamp: new Date().toISOString(),
        method: "GET",
        url,
        error: err instanceof Error ? err.message : "Error desconocido",
        correlationId,
      })

      const errorMsg = "Error inesperado al obtener datos de inspecciones"

      // Actualizar el estado con el error
      setInspectionsData((prev) => ({
        ...prev,
        [cups]: {
          cups,
          inspectionDates: [],
          loading: false,
          error: errorMsg,
        },
      }))

      console.error(err)
      return null
    }
  }

  // Añadir este nuevo efecto después de los efectos existentes
  // Efecto para cargar los datos de inspección cuando se cargan los contratos
  useEffect(() => {
    if (
      secondApiStatus === 200 &&
      contractsData &&
      contractsData.value &&
      contractsData.value.contracts &&
      Array.isArray(contractsData.value.contracts) &&
      contractsData.value.contracts.length > 0 &&
      customerData?.value?.ic
    ) {
      // Para cada contrato, obtener los datos de inspección
      contractsData.value.contracts.forEach((contract: any) => {
        if (contract.cups) {
          fetchInspectionData(customerData.value.ic, contract.cups)
        }
      })
    }
  }, [contractsData, secondApiStatus, customerData])

  // Función para manejar el clic en un elemento del historial
  const handleHistoryItemClick = (item: HistoryItem) => {
    // Establecer el modo de búsqueda y el valor de entrada
    setSearchMode(item.searchMode)
    setInputValue(item.searchValue)

    // Ejecutar la búsqueda
    executeSearch(item.searchValue, item.searchMode)
  }

  // Función para ejecutar una búsqueda (utilizada tanto por handleFetchData como por handleHistoryItemClick)
  const executeSearch = async (value: string, mode: SearchMode) => {
    // Verificar si la IP está autorizada
    // if (!ipAuthorized) {
    //   setError("Acceso restringido: Esta aplicación solo está disponible desde la red corporativa (212.142.*.*)")
    //   return
    // }

    // Con esta nueva condición:
    if (!ipAuthorized && !isPasswordAuthenticated) {
      setError("Acceso restringido: Por favor, autentíquese para continuar")
      return
    }

    // Estandarizar el texto introducido por el usuario (trim y toUpperCase)
    const standardizedInput = value.trim().toUpperCase()

    if (!standardizedInput) {
      setError(`Por favor, introduce un ${mode === "dni" ? "DNI/NIF" : "IC"} válido`)
      return
    }

    setLoading(true)
    setError(null)
    setRequestCompleted(false)
    setCustomerData(null)
    setContractsData(null)
    setContractsError(null)
    setFirstApiStatus(null)
    setSecondApiStatus(null)
    setProcessedContracts([])
    setSelectedContract("")

    // Limpiar datos de consumos y facturas
    setConsumsData(null)
    setConsumsError(null)
    setConsumsApiStatus(null)
    setInvoicesData(null)
    setInvoicesError(null)
    setInvoicesApiStatus(null)

    // Limpiar la consola al iniciar una nueva consulta
    setConsoleLogs([])

    // Generar correlation ID para la llamada
    const correlationId = generateCorrelationId()

    // Construir la URL según el modo de búsqueda
    const paramName = mode === "dni" ? "nif" : "ic"
    const url = `/api/customer?${paramName}=${encodeURIComponent(standardizedInput)}`

    // Registrar la llamada en la consola
    const timestamp = new Date().toISOString()

    addConsoleLog({
      timestamp,
      method: "GET",
      url: `${url} (Búsqueda por ${mode.toUpperCase()})`,
      correlationId,
    })

    try {
      const response = await fetch(url, {
        headers: {
          "x-correlation-id": correlationId,
        },
      })
      const statusCode = response.status
      setFirstApiStatus(statusCode)

      const result = await response.json()

      // Actualizar el registro de la consola con el resultado
      addConsoleLog({
        timestamp: new Date().toISOString(),
        method: "GET",
        url,
        status: statusCode,
        response: result,
        correlationId,
      })

      if (response.ok) {
        setCustomerData(result)

        // Añadir al historial si la respuesta contiene los datos necesarios
        if (result.value && result.value.ic && (result.value.cif || result.value.nif) && result.value.businessName) {
          // Crear un nuevo elemento de historial
          const newHistoryItem: HistoryItem = {
            id: Date.now().toString(),
            ic: result.value.ic,
            cif: result.value.cif || result.value.nif || "N/A",
            businessName: result.value.businessName || "N/A",
            lastName1: result.value.lastName1 || "", // Añadir el apellido
            searchMode: mode,
            searchValue: standardizedInput,
            timestamp: Date.now(),
          }

          // Añadir al historial, evitando duplicados basados en IC
          setSearchHistory((prevHistory) => {
            // Verificar si ya existe un elemento con el mismo IC
            const existingIndex = prevHistory.findIndex((item) => item.ic === newHistoryItem.ic)

            let updatedHistory: HistoryItem[]

            if (existingIndex >= 0) {
              // Si existe, crear un nuevo array con el elemento actualizado
              updatedHistory = [...prevHistory]
              updatedHistory[existingIndex] = newHistoryItem
            } else {
              // Si no existe, añadir al inicio del array
              updatedHistory = [newHistoryItem, ...prevHistory]
              // Limitar a MAX_HISTORY_ITEMS elementos
              if (updatedHistory.length > MAX_HISTORY_ITEMS) {
                updatedHistory = updatedHistory.slice(0, MAX_HISTORY_ITEMS)
              }
            }

            // Guardar en localStorage
            saveHistoryToStorage(updatedHistory)

            return updatedHistory
          })
        }

        // Llamar a la segunda API si la primera fue exitosa y tiene el campo IC dentro de value
        callSecondApiIfNeeded(result, statusCode)
      } else {
        setError(`Error: ${result.error || "Desconocido"} ${result.details ? `- ${result.details}` : ""}`)
      }
    } catch (err) {
      // Registrar el error en la consola
      addConsoleLog({
        timestamp: new Date().toISOString(),
        method: "GET",
        url,
        error: err instanceof Error ? err.message : "Error desconocido",
        correlationId,
      })

      setError("Error inesperado al procesar la solicitud")
      console.error(err)
    } finally {
      setLoading(false)
      setRequestCompleted(true)
    }
  }

  // Función para manejar la búsqueda desde el formulario
  const handleFetchData = () => {
    executeSearch(inputValue, searchMode)
  }

  // Función para renderizar el JSON con el campo "ic" en negrita
  // Función para renderizar la ficha de cliente
  const renderClientCard = (data: any) => {
    if (!data || !data.value) return null

    const value = data.value
    const name = `${value.businessName || ""} ${value.lastName1 || ""}`.trim()
    const ic = value.ic || "N/A"
    const nif = value.nif || value.cif || "N/A"
    const hasElectronicInvoice = value.emailFe && value.emailFe.trim() !== ""
    const mobile = value.mobile || "No disponible"
    const email = value.email || "No disponible"
    const phones = Array.isArray(value.phone) ? value.phone : []

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-[#003a4d]">{name}</h3>
          <span className="px-2 py-0.5 bg-[#00a0df]/10 text-[#00a0df] text-xs font-medium rounded-full">Cliente</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-2">
            <div>
              <p className="text-xs text-gray-500">Identificador (IC)</p>
              <p className="font-medium">{ic}</p>
            </div>

            <div>
              <p className="text-xs text-gray-500">CIF/NIF</p>
              <p className="font-medium">{nif}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div>
              <p className="text-xs text-gray-500">Teléfono móvil</p>
              <p className="font-medium">{mobile}</p>
            </div>

            {phones.length > 0 && (
              <div>
                <p className="text-xs text-gray-500">Otros teléfonos</p>
                {phones.length === 1 ? (
                  <p className="font-medium">{phones[0]}</p>
                ) : (
                  <Select>
                    <SelectTrigger className="w-full h-8 text-sm">
                      <SelectValue placeholder="Ver teléfonos" />
                    </SelectTrigger>
                    <SelectContent>
                      {phones.map((phone, index) => (
                        <SelectItem key={index} value={`phone-${index}`}>
                          {phone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div>
              <p className="text-xs text-gray-500">Email de contacto</p>
              <p className="font-medium">{email}</p>
            </div>

            <div>
              <p className="text-xs text-gray-500">Factura electrónica</p>
              <div className="flex items-center">
                <div
                  className={`w-2 h-2 rounded-full mr-2 ${hasElectronicInvoice ? "bg-green-500" : "bg-red-500"}`}
                ></div>
                <p className="text-sm">{hasElectronicInvoice ? "Activada" : "No activada"}</p>
              </div>
              {hasElectronicInvoice && value.emailFe && <p className="text-xs text-gray-500">Email: {value.emailFe}</p>}
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-gray-200">
          <details className="text-xs">
            <summary className="cursor-pointer text-[#00a0df] hover:underline">Ver respuesta JSON completa</summary>
            <pre className="mt-2 overflow-auto max-h-[150px] p-2 bg-gray-50 rounded text-xs">
              {JSON.stringify(data, null, 2)}
            </pre>
          </details>
        </div>
      </div>
    )
  }

  // Añadir esta nueva función para renderizar las fichas de contratos después de la función renderClientCard

  // Función para renderizar las fichas de contratos
  const renderContractCards = (data: any) => {
    if (
      !data ||
      !data.value ||
      !data.value.contracts ||
      !Array.isArray(data.value.contracts) ||
      data.value.contracts.length === 0
    ) {
      return <p className="text-amber-600">No se encontraron contratos para este cliente.</p>
    }

    // Añadir esta función después de la función formatHistoryTimestamp
    // Función para formatear la fecha de inspección desde formato AAAAMMDD a AAAA/MM/DD
    const formatInspectionDate = (dateString: string): string => {
      if (!dateString || dateString.length !== 8) return "No disponible"

      const year = dateString.substring(0, 4)
      const month = dateString.substring(4, 6)
      const day = dateString.substring(6, 8)

      return `${year}/${month}/${day}`
    }

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4">
          {data.value.contracts.map((contract: any, index: number) => {
            // Determinar el tipo de gas
            const gasType =
              contract.contractType === "02" ? "GLP" : contract.contractType === "04" ? "GN" : "Desconocido"

            // Verificar si tiene servicio "A punto"
            const hasAPuntoService =
              contract.services && Array.isArray(contract.services) && contract.services.length > 0

            // Obtener el nombre de la comercializadora
            const marketerName = contract.marketer && contract.marketer.name ? contract.marketer.name : "No disponible"

            // Formatear la dirección completa a partir de los componentes individuales
            const addressComponents = []

            if (contract.supplyAddress) {
              const address = contract.supplyAddress

              // Añadir calle y número
              if (address.street) {
                let streetNumber = address.street
                if (address.number) {
                  streetNumber += `, ${address.number}`
                }
                addressComponents.push(streetNumber)
              }

              // Añadir piso y puerta
              if (address.floor || address.door) {
                let floorDoor = ""
                if (address.floor) {
                  floorDoor += `Piso: ${address.floor}`
                }
                if (address.door) {
                  if (floorDoor) floorDoor += ", "
                  floorDoor += `Puerta: ${address.door}`
                }
                if (floorDoor) {
                  addressComponents.push(floorDoor)
                }
              }

              // Añadir municipio y provincia
              if (address.municipality || address.province) {
                let location = ""
                if (address.municipality) {
                  location += address.municipality
                }
                if (address.province) {
                  if (location) location += ", "
                  location += address.province
                }
                if (location) {
                  addressComponents.push(location)
                }
              }
            }

            const formattedAddress =
              addressComponents.length > 0 ? addressComponents.join(" - ") : "Dirección no disponible"

            return (
              <div key={index} className="border rounded-md overflow-hidden shadow-sm">
                <div
                  className={`${contract.contractType === "04" ? "bg-[#12235b]" : contract.contractType === "02" ? "bg-[#079ee0]" : "bg-[#003a4d]"} text-white p-3 flex justify-between items-center`}
                >
                  <div className="flex items-center">
                    <span className="font-medium">Contrato {index + 1}</span>
                  </div>
                  <span className="px-2 py-1 bg-[#00a0df]/20 text-white text-xs font-medium rounded-full">
                    {gasType}
                  </span>
                </div>

                <div className="p-4 bg-white">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-gray-500">Identificador del contrato</p>
                        <p className="font-medium">{contract.contractNumber || "No disponible"}</p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500">CUPS (Identificador de instalación)</p>
                        <p className="font-medium">{contract.cups || "No disponible"}</p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500">Comercializadora</p>
                        <p className="font-medium">{marketerName}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-gray-500">Dirección de suministro</p>
                        <p className="font-medium">{formattedAddress}</p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500">Inspecciones realizadas</p>
                        {inspectionsData[contract.cups] ? (
                          inspectionsData[contract.cups].loading ? (
                            <div className="flex items-center">
                              <Loader2 className="h-3 w-3 animate-spin mr-2" />
                              <span className="text-sm">Cargando...</span>
                            </div>
                          ) : inspectionsData[contract.cups].error ? (
                            <p className="text-sm text-red-500">Error al cargar datos</p>
                          ) : inspectionsData[contract.cups].inspectionDates.length > 0 ? (
                            <div className="max-h-24 overflow-y-auto pr-1">
                              {inspectionsData[contract.cups].inspectionDates.map((date, idx) => (
                                <p key={idx} className={`text-sm ${idx === 0 ? "font-medium" : "text-gray-500"}`}>
                                  {formatInspectionDate(date)}{" "}
                                  {idx === 0 && <span className="text-xs text-green-600">(Última)</span>}
                                </p>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-amber-600">Sin inspecciones registradas</p>
                          )
                        ) : (
                          <p className="text-sm text-gray-400">Consultando...</p>
                        )}
                      </div>

                      <div className="flex space-x-4">
                        <div>
                          <p className="text-xs text-gray-500 font-semibold">Multivivienda</p>
                          <div className="flex items-center mt-1">
                            <div
                              className={`w-2 h-2 rounded-full mr-2 ${contract.multiHousing === "1" ? "bg-green-500" : "bg-red-500"}`}
                            ></div>
                            <p className="text-sm">{contract.multiHousing === "1" ? "Sí" : "No"}</p>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs text-gray-500">Servicio "A punto"</p>
                          <div className="flex items-center mt-1">
                            <div
                              className={`w-2 h-2 rounded-full mr-2 ${hasAPuntoService ? "bg-green-500" : "bg-red-500"}`}
                            ></div>
                            <p className="text-sm">{hasAPuntoService ? "Contratado" : "No contratado"}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="pt-3 border-t border-gray-200">
          <details className="text-xs">
            <summary className="cursor-pointer text-[#00a0df] hover:underline">Ver respuesta JSON completa</summary>
            <pre className="mt-2 overflow-auto max-h-[200px] p-2 bg-gray-50 rounded text-xs">
              {JSON.stringify(data, null, 2)}
            </pre>
          </details>
        </div>
      </div>
    )
  }

  // Función para formatear la fecha/hora para la consola
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      fractionalSecondDigits: 3,
    })
  }

  // Función para formatear la fecha/hora para el historial
  const formatHistoryTimestamp = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // Función para obtener el contrato seleccionado
  const getSelectedContractDetails = () => {
    if (!selectedContract) return null
    return processedContracts.find((contract) => contract.id === selectedContract)
  }

  // Función para manejar el cambio en el modo de búsqueda
  const handleSearchModeChange = (value: string) => {
    setSearchMode(value as SearchMode)
  }

  // Reemplazar el panel 3 con los dos subpaneles
  return (
    <div className="space-y-6">
      {/* Alerta de IP no autorizada */}
      {ipCheckLoading ? (
        <div className="flex justify-center items-center p-4">
          <Loader2 className="h-6 w-6 animate-spin text-[#00a0df] mr-2" />
          <span>Verificando acceso...</span>
        </div>
      ) : !ipAuthorized && !isPasswordAuthenticated ? (
        <div className="space-y-4">
          <Alert variant="destructive" className="bg-red-50 border-red-300">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="text-red-800 font-bold">Acceso restringido</AlertTitle>
            <AlertDescription className="text-red-700">
              Esta aplicación está diseñada para la red corporativa (212.142.*.*).
              <br />
              Su dirección IP actual es: {clientIP}
              <br />
              Por favor, introduzca la clave de acceso para continuar.
            </AlertDescription>
          </Alert>
          <AuthForm onAuthenticated={() => setIsPasswordAuthenticated(true)} />
        </div>
      ) : (
        <Alert className="bg-green-50 border-green-300 py-1">
          <AlertTitle className="text-green-800">Acceso autorizado</AlertTitle>
          <AlertDescription className="text-green-700">
            {ipAuthorized
              ? `IP autorizada: ${clientIP} ${clientIP === "0.0.0.0" && "(modo preview)"}`
              : "Acceso mediante clave"}
          </AlertDescription>
        </Alert>
      )}

      {/* Tabla con 2 columnas para la sección de búsqueda */}
      {/* Reducir el espacio entre elementos en la tabla de búsqueda */}
      <div className="w-full border border-gray-200 rounded-md overflow-hidden mb-3">
        <table className="w-full">
          <tbody>
            <tr>
              {/* Columna izquierda: RadioButton, campo de texto y botón */}
              <td className="p-3 border-r border-gray-200 w-1/2">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-[#003a4d] font-medium text-sm">Tipo de búsqueda</Label>
                    <RadioGroup
                      value={searchMode}
                      onValueChange={handleSearchModeChange}
                      className="flex space-x-4"
                      disabled={!ipAuthorized && !isPasswordAuthenticated}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="dni" id="dni" />
                        <Label
                          htmlFor="dni"
                          className={`cursor-pointer text-sm ${!ipAuthorized && !isPasswordAuthenticated ? "opacity-50" : ""}`}
                        >
                          DNI/NIF
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="ic" id="ic" />
                        <Label
                          htmlFor="ic"
                          className={`cursor-pointer text-sm ${!ipAuthorized && !isPasswordAuthenticated ? "opacity-50" : ""}`}
                        >
                          IC
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="input-value" className="text-[#003a4d] font-medium text-sm">
                      {searchMode === "dni" ? "DNI/NIF" : "IC"}
                    </Label>
                    <div className="flex space-x-2">
                      <Input
                        id="input-value"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value.toUpperCase())}
                        placeholder={`Introduce el ${searchMode === "dni" ? "DNI/NIF" : "IC"}`}
                        className="flex-1 border-[#e0e0e0] focus:border-[#00a0df] focus:ring-[#00a0df] h-8 text-sm"
                        disabled={!ipAuthorized && !isPasswordAuthenticated}
                      />
                      <Button
                        onClick={handleFetchData}
                        disabled={loading || (!ipAuthorized && !isPasswordAuthenticated)}
                        className="bg-[#00a0df] hover:bg-[#0090c9] text-white h-8 px-3 py-0"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                            <span className="text-xs">Consultando...</span>
                          </>
                        ) : (
                          <span className="text-xs">Consultar</span>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </td>

              {/* Columna derecha: Panel de históricos */}
              <td className="p-3 w-1/2">
                <div className="h-full border border-gray-200 rounded-md bg-white shadow-sm">
                  <div className="bg-[#003a4d] text-white p-1.5 rounded-t-md flex items-center justify-between">
                    <div className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      <span className="text-xs font-medium">Historial de consultas</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 text-white hover:bg-[#00a0df]/20 p-0 px-1"
                      onClick={() => {
                        setSearchHistory([])
                        saveHistoryToStorage([])
                      }}
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      <span className="text-xs">Limpiar</span>
                    </Button>
                  </div>

                  <ScrollArea className="h-[150px] p-2">
                    {searchHistory.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm p-4">
                        <Clock className="h-8 w-8 mb-1 opacity-20" />
                        <p className="text-xs">No hay consultas en el historial</p>
                        <p className="text-xs">Las consultas exitosas se mostrarán aquí</p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {searchHistory.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => handleHistoryItemClick(item)}
                            className="p-1.5 border border-gray-100 rounded hover:bg-gray-50 cursor-pointer transition-colors"
                          >
                            <div className="flex justify-between items-center mb-0.5">
                              <span className="text-xs font-medium text-[#00a0df]">
                                {item.searchMode === "dni" ? "DNI/NIF" : "IC"}: {item.searchValue}
                              </span>
                              <span className="text-xs text-gray-400">{formatHistoryTimestamp(item.timestamp)}</span>
                            </div>
                            <div className="text-xs font-medium truncate">
                              {item.ic} - {item.cif} - {item.businessName} {item.lastName1 ? item.lastName1 : ""}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Reorganización de paneles en 2 filas */}
      {/* Fila 1: Panel 1 (Cliente) a todo el ancho */}
      <div className="space-y-3">
        {/* Panel 1: Ficha de cliente - Ocupa todo el ancho */}
        <div className="nortegas-card">
          <div className="nortegas-card-header flex justify-between items-center">
            <div>
              <h3 className="font-medium text-sm">Panel 1: Cliente</h3>
              <p className="text-xs opacity-80">Datos del cliente</p>
            </div>
          </div>
          <div className="nortegas-card-content">
            {loading ? (
              <div className="flex justify-center items-center h-32">
                <Loader2 className="h-8 w-8 animate-spin text-[#00a0df]" />
              </div>
            ) : customerData ? (
              renderClientCard(customerData)
            ) : requestCompleted ? (
              <p className="text-amber-600">
                No se encontraron datos para el {searchMode === "dni" ? "DNI/NIF" : "IC"} especificado.
              </p>
            ) : (
              <p className="text-gray-400 italic">
                Consulta un {searchMode === "dni" ? "DNI/NIF" : "IC"} para ver los resultados
              </p>
            )}
          </div>
        </div>

        {/* Fila 2: Panel 2 (Contratos) y Panel 3 (Selector y Detalles) en dos columnas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Panel 2: Datos de contratos - Columna izquierda */}
          <div className="nortegas-card">
            <div className="nortegas-card-header flex justify-between items-center">
              <div>
                <h3 className="font-medium text-sm">Panel 2: Contratos</h3>
                <p className="text-xs opacity-80">Contratos detallados</p>
              </div>
            </div>
            <div className="nortegas-card-content">
              {contractsLoading ? (
                <div className="flex justify-center items-center h-40">
                  <Loader2 className="h-8 w-8 animate-spin text-[#00a0df]" />
                </div>
              ) : contractsError ? (
                <div className="text-red-600">
                  <p>Error al obtener contratos:</p>
                  <p className="text-sm">{contractsError}</p>
                </div>
              ) : contractsData ? (
                renderContractCards(contractsData)
              ) : firstApiStatus === 200 && customerData && (!customerData.value || !customerData.value.ic) ? (
                <p className="text-amber-600">
                  El cliente no tiene un IC asociado en la estructura "value". No se pueden obtener contratos.
                </p>
              ) : firstApiStatus === 200 && customerData ? (
                <p className="text-amber-600">No se encontraron contratos para este cliente.</p>
              ) : (
                <p className="text-gray-400 italic">
                  Los contratos se mostrarán aquí después de consultar un cliente con IC.
                </p>
              )}
            </div>
          </div>

          {/* Panel 3: Dividido en dos subpaneles - Columna derecha */}
          <div className="nortegas-card">
            <div className="nortegas-card-header flex justify-between items-center">
              <div>
                <h3 className="font-medium text-sm">Panel 3: Selector y Detalles</h3>
                <p className="text-xs opacity-80">Contratos, Consumos y Facturas</p>
              </div>
            </div>
            <div className="nortegas-card-content">
              {secondApiStatus === 200 && processedContracts.length > 0 ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="contract-select" className="text-[#003a4d]">
                      Contratos disponibles ({processedContracts.length})
                    </Label>
                    <Select
                      value={selectedContract}
                      onValueChange={setSelectedContract}
                      disabled={!ipAuthorized && !isPasswordAuthenticated}
                    >
                      <SelectTrigger id="contract-select" className="w-full border-[#e0e0e0]">
                        <SelectValue placeholder="Seleccione un contrato" />
                      </SelectTrigger>
                      <SelectContent>
                        {processedContracts.map((contract) => (
                          <SelectItem key={contract.id} value={contract.id}>
                            {contract.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedContract && (
                    <div className="mt-4">
                      <Tabs
                        defaultValue="consums"
                        className="w-full"
                        onValueChange={(value) => setActiveTab(value as ActiveTab)}
                      >
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="consums">Panel 3.1: Consumos</TabsTrigger>
                          <TabsTrigger value="invoices">Panel 3.2: Facturas</TabsTrigger>
                        </TabsList>

                        {/* Panel 3.1: Consumos */}
                        <TabsContent value="consums" className="border rounded-md p-4 mt-2">
                          <h4 className="text-sm font-medium text-[#003a4d] mb-2">Consumos del contrato:</h4>
                          {consumsLoading ? (
                            <div className="flex justify-center items-center h-40">
                              <Loader2 className="h-8 w-8 animate-spin text-[#00a0df]" />
                            </div>
                          ) : consumsError ? (
                            <div className="text-red-600">
                              <p>Error al obtener consumos:</p>
                              <p className="text-sm">{consumsError}</p>
                            </div>
                          ) : consumsData ? (
                            <div className="space-y-6">
                              {/* Sección superior: Lecturas del contador */}
                              <div className="border rounded-md p-3 bg-gray-50">
                                <h5 className="text-sm font-medium text-[#003a4d] mb-3">Lecturas del contador</h5>
                                {consumsData.value &&
                                consumsData.value.meterReadings &&
                                consumsData.value.meterReadings.length > 0 ? (
                                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                                    <table className="w-full text-sm">
                                      <thead className="bg-gray-100">
                                        <tr>
                                          <th className="text-left py-2 px-3 text-xs font-medium text-[#003a4d]">
                                            Fecha
                                          </th>
                                          <th className="text-right py-2 px-3 text-xs font-medium text-[#003a4d]">
                                            Lectura (m³)
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {consumsData.value.meterReadings.map((reading: any, index: number) => (
                                          <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                            <td className="py-2 px-3 border-t border-gray-100">
                                              {new Date(reading.readingDate).toLocaleDateString("es-ES")}
                                            </td>
                                            <td className="py-2 px-3 text-right font-medium border-t border-gray-100">
                                              {reading.readingValue}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <p className="text-sm text-gray-500 italic">
                                    No hay lecturas disponibles para este contrato.
                                  </p>
                                )}
                              </div>

                              {/* Sección inferior: Consumos de gas */}
                              <div className="border rounded-md p-3 bg-gray-50">
                                <h5 className="text-sm font-medium text-[#003a4d] mb-3">Consumos de gas</h5>
                                {consumsData.value &&
                                consumsData.value.consumptionRecords &&
                                consumsData.value.consumptionRecords.length > 0 ? (
                                  <div className="space-y-3">
                                    {consumsData.value.consumptionRecords.map((record: any, index: number) => (
                                      <div
                                        key={index}
                                        className="bg-white p-3 rounded border border-gray-200 shadow-sm"
                                      >
                                        <div className="flex justify-between items-center mb-2">
                                          <span className="text-xs font-medium text-[#003a4d]">
                                            {new Date(record.startDate).toLocaleDateString("es-ES")} -{" "}
                                            {new Date(record.endDate).toLocaleDateString("es-ES")}
                                          </span>
                                          <span className="text-xs bg-[#00a0df]/10 text-[#00a0df] px-1 rounded">
                                            Periodo
                                          </span>
                                        </div>
                                        <div className="flex items-baseline">
                                          <span className="text-sm font-medium">
                                            {record.consumption} <span className="text-xs text-gray-500">m³</span>
                                          </span>
                                          {record.averageCpConsumption && (
                                            <span className="ml-2 text-xs text-gray-500">
                                              (Promedio vecinos: {record.averageCpConsumption} m³)
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-sm text-gray-500 italic">
                                    No hay datos de consumo disponibles para este contrato.
                                  </p>
                                )}
                              </div>

                              {/* Opción para ver JSON completo */}
                              <div className="pt-2 border-t border-gray-200">
                                <details className="text-xs">
                                  <summary className="cursor-pointer text-[#00a0df] hover:underline">
                                    Ver respuesta JSON completa
                                  </summary>
                                  <pre className="mt-2 overflow-auto max-h-[200px] p-2 bg-gray-50 rounded text-xs">
                                    {JSON.stringify(consumsData, null, 2)}
                                  </pre>
                                </details>
                              </div>
                            </div>
                          ) : (
                            <p className="text-gray-400 italic">
                              Los datos de consumo se mostrarán aquí al seleccionar un contrato.
                            </p>
                          )}
                        </TabsContent>

                        {/* Panel 3.2: Facturas */}
                        <TabsContent value="invoices" className="border rounded-md p-4 mt-2">
                          <h4 className="text-sm font-medium text-[#003a4d] mb-2">Facturas del contrato:</h4>
                          {invoicesLoading ? (
                            <div className="flex justify-center items-center h-40">
                              <Loader2 className="h-8 w-8 animate-spin text-[#00a0df]" />
                            </div>
                          ) : invoicesError ? (
                            <div className="text-red-600">
                              <p>Error al obtener facturas:</p>
                              <p className="text-sm">{invoicesError}</p>
                            </div>
                          ) : invoicesData ? (
                            <div className="space-y-4">
                              {/* Listado de facturas */}
                              {invoicesData.value &&
                              invoicesData.value.invoices &&
                              invoicesData.value.invoices.length > 0 ? (
                                <div className="border rounded-md overflow-hidden">
                                  <table className="w-full text-sm">
                                    <thead className="bg-[#003a4d] text-white">
                                      <tr>
                                        <th className="text-left py-2 px-3 font-medium">Nº Factura</th>
                                        <th className="text-left py-2 px-3 font-medium">Periodo</th>
                                        <th className="text-right py-2 px-3 font-medium">Importe</th>
                                        <th className="text-center py-2 px-3 font-medium">Estado</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {invoicesData.value.invoices.map((invoice: any, index: number) => {
                                        // Determinar el color del estado
                                        let statusColor = "bg-gray-100 text-gray-600"
                                        if (invoice.invoiceStatus) {
                                          const status = invoice.invoiceStatus.toUpperCase()
                                          if (status === "PAGADA" || status === "PAID") {
                                            statusColor = "bg-green-100 text-green-700"
                                          } else if (status === "PENDIENTE" || status === "PENDING") {
                                            statusColor = "bg-yellow-100 text-yellow-700"
                                          } else if (status === "ANULADA" || status === "CANCELLED") {
                                            statusColor = "bg-red-100 text-red-700"
                                          }
                                        }

                                        // Formatear el importe si existe
                                        const formattedAmount = invoice.invoiceAmount
                                          ? `${Number.parseFloat(invoice.invoiceAmount).toFixed(2)} €`
                                          : "N/A"

                                        return (
                                          <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                            <td className="py-3 px-3 border-t border-gray-200">
                                              {invoice.invoiceRef || "No disponible"}
                                            </td>
                                            <td className="py-3 px-3 border-t border-gray-200">
                                              {invoice.invoicePeriod || "No disponible"}
                                            </td>
                                            <td className="py-3 px-3 text-right border-t border-gray-200 font-medium">
                                              {formattedAmount}
                                            </td>
                                            <td className="py-3 px-3 text-center border-t border-gray-200">
                                              <span className={`px-2 py-1 rounded-full text-xs ${statusColor}`}>
                                                {invoice.invoiceStatus || "Desconocido"}
                                              </span>
                                            </td>
                                          </tr>
                                        )
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <div className="p-4 bg-amber-50 border border-amber-200 rounded-md">
                                  <p className="text-amber-600">No se encontraron facturas para este contrato.</p>
                                </div>
                              )}

                              {/* Opción para ver JSON completo */}
                              <div className="pt-3 border-t border-gray-200">
                                <details className="text-xs">
                                  <summary className="cursor-pointer text-[#00a0df] hover:underline">
                                    Ver respuesta JSON completa
                                  </summary>
                                  <pre className="mt-2 overflow-auto max-h-[200px] p-2 bg-gray-50 rounded text-xs">
                                    {JSON.stringify(invoicesData, null, 2)}
                                  </pre>
                                </details>
                              </div>
                            </div>
                          ) : (
                            <p className="text-gray-400 italic">
                              Las facturas se mostrarán aquí al seleccionar la pestaña de facturas.
                            </p>
                          )}
                        </TabsContent>
                      </Tabs>
                    </div>
                  )}
                </div>
              ) : secondApiStatus === 200 &&
                contractsData &&
                contractsData.value &&
                (!contractsData.value.contracts || contractsData.value.contracts.length === 0) ? (
                <p className="text-amber-600">No se encontraron contratos en la estructura "value.contracts".</p>
              ) : secondApiStatus !== 200 && secondApiStatus !== null ? (
                <p className="text-amber-600">
                  La segunda API no devolvió un código 200. No se pueden mostrar contratos.
                </p>
              ) : (
                <p className="text-gray-400 italic">
                  Los contratos se mostrarán aquí cuando la segunda API devuelva un código 200.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Consola de registro de llamadas HTTP */}
      {/* Reducir el espacio entre elementos en la consola HTTP */}
      <div className="mt-4 nortegas-card">
        <div className="nortegas-card-header flex justify-between items-center">
          <div>
            <h3 className="font-medium text-sm">Consola HTTP</h3>
            <p className="text-xs opacity-80">Registro de llamadas realizadas</p>
          </div>
        </div>
        <div className="nortegas-card-content p-0">
          <div className="nortegas-console overflow-auto max-h-[200px]">
            {consoleLogs.length === 0 ? (
              <p className="text-gray-500 text-xs">No hay registros de llamadas HTTP.</p>
            ) : (
              <div className="space-y-1">
                {consoleLogs.map((log, index) => (
                  <div key={index} className="border-b border-gray-700 pb-1 text-xs">
                    <div className="flex items-start">
                      <span className="text-gray-400 mr-2">[{formatTimestamp(log.timestamp)}]</span>
                      <span
                        className={`mr-2 ${
                          log.method === "GET"
                            ? "text-green-400"
                            : log.method === "INFO"
                              ? "text-blue-400"
                              : log.method === "ERROR"
                                ? "text-red-400"
                                : "text-yellow-400"
                        }`}
                      >
                        {log.method}
                      </span>
                      <span className="text-yellow-300">{log.url}</span>
                      {log.correlationId && <span className="text-purple-300 ml-2">[{log.correlationId}]</span>}
                    </div>
                    {log.status !== undefined && (
                      <div className="ml-6">
                        <span
                          className={`${log.status >= 200 && log.status < 300 ? "text-green-400" : "text-red-400"}`}
                        >
                          Status: {log.status}
                        </span>
                      </div>
                    )}
                    {log.response && (
                      <div className="ml-6">
                        <span className="text-gray-400">Response: </span>
                        <span className="text-gray-300">{JSON.stringify(log.response).substring(0, 100)}...</span>
                      </div>
                    )}
                    {log.error && (
                      <div className="ml-6">
                        <span className="text-red-400">Error: {log.error}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
