import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AuthProvider } from './contexts/AuthContext'
import { CookiesPage } from './pages/CookiesPage'
import { CustomersPage } from './pages/CustomersPage'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { LoyaltyPage } from './pages/LoyaltyPage'
import { NewSalePage } from './pages/NewSalePage'
import { SalesPage } from './pages/SalesPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route index element={<DashboardPage />} />
              <Route path="vendas" element={<SalesPage />} />
              <Route path="vendas/nova" element={<NewSalePage />} />
              <Route path="sabores" element={<CookiesPage />} />
              <Route path="clientes" element={<CustomersPage />} />
              <Route path="fidelidade" element={<LoyaltyPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
