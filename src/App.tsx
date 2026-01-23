import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import POSPage from './pages/POSPage'
import CategoriesPage from './pages/CategoriesPage'
import AISymptomCheckerForm from './pages/AISymptomCheckerForm'
import ConsultationHistoryPage from './pages/ConsultationHistoryPage'
import StockManagementPage from './pages/StockManagementPage'
import MedicineLabelPage from './pages/MedicineLabelPage'
import ProductsPage from './pages/ProductsPage'
import InventoryPage from './pages/InventoryPage'
import ReportsPage from './pages/ReportsPage'
import SettingsPage from './pages/SettingsPage'
import AuthGuard from './components/auth/AuthGuard'
import Layout from './components/common/Layout'
import { LanguageProvider } from './contexts/LanguageContext'

function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/*"
            element={
              <AuthGuard>
                <Layout>
                  <Routes>
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/pos" element={<POSPage />} />
                    <Route path="/ai-symptom-checker" element={<AISymptomCheckerForm />} />
                    <Route path="/consultation-history" element={<ConsultationHistoryPage />} />
                    <Route path="/stock-management" element={<StockManagementPage />} />
                    <Route path="/medicine-labels" element={<MedicineLabelPage />} />
                    <Route path="/categories" element={<CategoriesPage />} />
                    <Route path="/products" element={<ProductsPage />} />
                    <Route path="/inventory" element={<InventoryPage />} />
                    <Route path="/reports" element={<ReportsPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </Layout>
              </AuthGuard>
            }
          />
        </Routes>
      </BrowserRouter>
    </LanguageProvider>
  )
}

export default App
