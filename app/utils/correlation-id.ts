/**
 * Genera un correlation ID con el formato requerido: "PTMNV0-" seguido de un timestamp
 * @returns {string} El correlation ID generado
 */
export function generateCorrelationId(): string {
  // Obtener el timestamp actual en formato ISO
  const timestamp = new Date().toISOString().replace(/[-:.]/g, "").replace("T", "").substring(0, 14)

  // Concatenar el prefijo "PTMNV0-" con el timestamp
  return `PTMNV0-${timestamp}`
}

