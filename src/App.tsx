import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import POSPage from './pages/POSPage'
import CategoriesPage from './pages/CategoriesPage'
import CategoriesManagementPage from './pages/CategoriesManagementPage'
import AISymptomCheckerForm from './pages/AISymptomCheckerForm'
import ConsultationHistoryPage from './pages/ConsultationHistoryPage'
import StockManagementPage from './pages/StockManagementPage'
import MedicineLabelPage from './pages/MedicineLabelPage'
import ProductsPage from './pages/ProductsPage'
import InventoryPage from './pages/InventoryPage'
import WarehouseManagementPage from './pages/WarehouseManagementPage'
import PurchaseOrderPage from './pages/PurchaseOrderPage'
import PaymentVoucherPage from './pages/PaymentVoucherPage'
import PaymentMethodsPage from './pages/PaymentMethodsPage'
import WithholdingTaxPage from './pages/WithholdingTaxPage'
import ExpensesPage from './pages/ExpensesPage'
import ReportsPage from './pages/ReportsPage'
import ContactsPage from './pages/ContactsPage'
import SalesOrdersPage from './pages/SalesOrdersPage'
import NegativeStockReportPage from './pages/NegativeStockReportPage'
import StockAdjustmentReportPage from './pages/StockAdjustmentReportPage'
import StockTransferReportPage from './pages/StockTransferReportPage'
import SettingsPage from './pages/SettingsPage'
import ShopSettingsPage from './pages/ShopSettingsPage'
import SalesChannelsSettingsPage from './pages/SalesChannelsSettingsPage'
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
                    <Route path="/categories-management" element={<CategoriesManagementPage />} />
                    <Route path="/products" element={<ProductsPage />} />
                    <Route path="/inventory" element={<InventoryPage />} />
                    <Route path="/warehouse-management" element={<WarehouseManagementPage />} />
                    <Route path="/purchase-orders" element={<PurchaseOrderPage />} />
                    <Route path="/payment-vouchers" element={<PaymentVoucherPage />} />
                    <Route path="/payment-methods" element={<PaymentMethodsPage />} />
                    <Route path="/withholding-tax" element={<WithholdingTaxPage />} />
                    <Route path="/expenses" element={<ExpensesPage />} />
                    <Route path="/reports" element={<ReportsPage />} />
                    <Route path="/contacts" element={<ContactsPage />} />
                    <Route path="/sales-orders" element={<SalesOrdersPage />} />
                    <Route path="/negative-stock-report" element={<NegativeStockReportPage />} />
                    <Route path="/stock-adjustment-report" element={<StockAdjustmentReportPage />} />
                    <Route path="/stock-transfer-report" element={<StockTransferReportPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/settings/shop" element={<ShopSettingsPage />} />
                    <Route path="/settings/sales-channels" element={<SalesChannelsSettingsPage />} />
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
