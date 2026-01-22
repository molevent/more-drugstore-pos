# More Drug Store - Project Setup Prompt

Copy ข้อความด้านล่างนี้ไปใช้ใน Windsurf AI เพื่อสร้างโครงสร้างโปรเจกต์:

---

```
สร้าง Web App ชื่อ "More Drug Store" ระบบ POS สำหรับร้านขายยา

Tech Stack:
- Frontend: React + TypeScript + Tailwind CSS
- Database: Supabase
- State Management: Zustand
- Build Tool: Vite

โครงสร้าง Module:
1. Auth - Login/Logout, User roles (admin, pharmacist, cashier)
2. POS - Multi barcode scan, Cart, Payment, Receipt
3. Products - Product catalog, Drug info, Symptom recommendation
4. Printing - Drug label (TH/EN), Tax invoice, iPad support
5. Inventory - Stock monitoring, Low stock alerts, ZortOut sync
6. Reports - Daily summary, Low stock report, CSV export
7. Settings - Platform config, ZortOut config, User management

สร้าง Folder Structure:
src/
├── components/
│   ├── common/          # Button, Input, Modal, Table, Card
│   ├── auth/            # LoginForm, AuthGuard
│   ├── pos/             # BarcodeScanner, Cart, PaymentModal
│   ├── products/        # ProductCard, ProductList, DrugInfo
│   ├── printing/        # LabelPreview, InvoicePreview
│   ├── inventory/       # StockTable, AlertList
│   └── reports/         # DailySummary, ExportButton
├── modules/
│   ├── auth/
│   ├── pos/
│   ├── products/
│   ├── printing/
│   ├── inventory/
│   ├── reports/
│   └── integrations/
├── hooks/               # useAuth, useCart, useProducts, usePrint
├── services/
│   ├── supabase.ts      # Supabase client
│   └── zortout.ts       # ZortOut API
├── stores/              # Zustand stores
│   ├── authStore.ts
│   ├── cartStore.ts
│   └── productStore.ts
├── types/               # TypeScript interfaces
├── utils/               # Helper functions
├── lib/                 # Third-party configs
└── pages/
    ├── LoginPage.tsx
    ├── DashboardPage.tsx
    ├── POSPage.tsx
    ├── ProductsPage.tsx
    ├── InventoryPage.tsx
    ├── ReportsPage.tsx
    └── SettingsPage.tsx

Requirements:
- Responsive design รองรับ iPad
- รองรับภาษาไทยและอังกฤษ
- Dark/Light mode (optional)

เริ่มจากสร้าง:
1. Project setup with Vite + React + TypeScript + Tailwind
2. Install dependencies: @supabase/supabase-js, zustand, react-router-dom, lucide-react
3. Supabase client configuration (สร้าง .env.example)
4. Basic routing structure with protected routes
5. Login page with Supabase Auth
6. Basic layout with sidebar navigation
```
