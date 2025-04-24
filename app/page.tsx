import Link from "next/link"
import CustomerData from "./components/customer-data"
import NortegasHeader from "./components/nortegas-header"

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-nortegas-gray">
      <NortegasHeader />

      <main className="flex-grow container mx-auto px-4 py-4">
        <div className="w-full max-w-7xl mx-auto">
          <div className="bg-white p-6 rounded-lg shadow-md border border-nortegas-blue-light/20">
            <CustomerData />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div className="bg-white p-4 rounded-lg shadow-md border border-nortegas-blue-light/20">
              <h2 className="font-semibold text-nortegas-blue mb-2 flex items-center">
                <span className="w-2 h-2 bg-nortegas-blue-light rounded-full mr-2"></span>
                Estado del Servidor
              </h2>
              <p className="text-nortegas-gray-dark">El servidor está funcionando correctamente.</p>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-md border border-nortegas-blue-light/20">
              <h2 className="font-semibold text-nortegas-blue mb-2 flex items-center">
                <span className="w-2 h-2 bg-nortegas-blue-light rounded-full mr-2"></span>
                Endpoints Disponibles
              </h2>
              <ul className="space-y-2 text-nortegas-gray-dark">
                <li>
                  <Link href="/api/hello" className="text-nortegas-blue-light hover:underline">
                    /api/hello - Endpoint de prueba
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-nortegas-blue text-white py-4 mt-12">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm">&copy; {new Date().getFullYear()} Nortegas. Todos los derechos reservados.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
