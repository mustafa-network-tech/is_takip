import { AuthProvider, useAuth } from './context/AuthContext'
import AuthScreen from './components/AuthScreen'
import ProductionCardApp from './ProductionCardApp'

function AuthenticatedApp() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-zinc-100 text-sm text-zinc-600">
        Yükleniyor…
      </div>
    )
  }

  if (!session) {
    return <AuthScreen />
  }

  return <ProductionCardApp />
}

export default function App() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  )
}
