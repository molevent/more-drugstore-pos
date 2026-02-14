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
import AbnormalOrdersReportPage from './pages/AbnormalOrdersReportPage'
import NearExpiryReportPage from './pages/NearExpiryReportPage'
import StockCheckReportPage from './pages/StockCheckReportPage'
import SalesReportPage from './pages/SalesReportPage'
import ManualStockCutReportPage from './pages/ManualStockCutReportPage'
import StockReplenishmentReportPage from './pages/StockReplenishmentReportPage'
import PurchasePreparationReportPage from './pages/PurchasePreparationReportPage'
import ReorderReportPage from './pages/ReorderReportPage'
import StockRefillReportPage from './pages/StockRefillReportPage'
import StockCountingPage from './pages/StockCountingPage'
import CashierClosingReportPage from './pages/CashierClosingReportPage'
import ReceiptTaxInvoiceReportPage from './pages/ReceiptTaxInvoiceReportPage'
import QuotationPage from './pages/QuotationPage'
import QuotationsListPage from './pages/QuotationsListPage'
import SettingsPage from './pages/SettingsPage'
import ShopSettingsPage from './pages/ShopSettingsPage'
import SalesChannelsSettingsPage from './pages/SalesChannelsSettingsPage'
import ZortOutSyncPage from './pages/ZortOutSyncPage'
import ProductCatalogPage from './pages/ProductCatalogPage'
import ProductCatalogsListPage from './pages/ProductCatalogsListPage'
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
                    <Route path="/abnormal-orders-report" element={<AbnormalOrdersReportPage />} />
                    <Route path="/near-expiry-report" element={<NearExpiryReportPage />} />
                    <Route path="/stock-check-report" element={<StockCheckReportPage />} />
                    <Route path="/sales-report" element={<SalesReportPage />} />
                    <Route path="/manual-stock-cut-report" element={<ManualStockCutReportPage />} />
                    <Route path="/stock-replenishment-report" element={<StockReplenishmentReportPage />} />
                    <Route path="/purchase-preparation-report" element={<PurchasePreparationReportPage />} />
                    <Route path="/reorder-report" element={<ReorderReportPage />} />
                    <Route path="/stock-refill-report" element={<StockRefillReportPage />} />
                    <Route path="/stock-counting" element={<StockCountingPage />} />
                    <Route path="/cashier-closing-report" element={<CashierClosingReportPage />} />
                    <Route path="/receipt-tax-invoice-report" element={<ReceiptTaxInvoiceReportPage />} />
                    <Route path="/quotation" element={<QuotationPage />} />
                    <Route path="/quotation/:id" element={<QuotationPage />} />
                    <Route path="/quotations" element={<QuotationsListPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/settings/shop" element={<ShopSettingsPage />} />
                    <Route path="/settings/sales-channels" element={<SalesChannelsSettingsPage />} />
                    <Route path="/product-catalog" element={<ProductCatalogPage />} />
                    <Route path="/product-catalogs" element={<ProductCatalogsListPage />} />
                    <Route path="/zortout-sync" element={<ZortOutSyncPage />} />
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
