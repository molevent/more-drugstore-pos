# More Drug Store - POS System

ระบบขายหน้าร้านสำหรับร้านขายยา (Point of Sale System for Drug Store)

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase
- **State Management**: Zustand
- **Routing**: React Router v6
- **Icons**: Lucide React
- **Build Tool**: Vite

## Features

### 1. Authentication (Auth Module)
- Login/Logout with Supabase Auth
- User roles: Admin, Pharmacist, Cashier
- Protected routes

### 2. Point of Sale (POS Module)
- Multi-barcode scanning
- Shopping cart management
- Payment processing
- Receipt generation

### 3. Products Management
- Product catalog
- Drug information
- Symptom-based recommendations
- Search and filter

### 4. Printing
- Drug labels (Thai/English)
- Tax invoices
- iPad support

### 5. Inventory Management
- Stock monitoring
- Low stock alerts
- ZortOut integration for inventory sync

### 6. Reports
- Daily sales summary
- Low stock reports
- CSV export functionality

### 7. Settings
- Platform configuration
- ZortOut API configuration
- User management

## Project Structure

```
src/
├── components/
│   ├── common/          # Reusable components (Button, Input, Modal, Card)
│   ├── auth/            # Authentication components
│   ├── pos/             # POS-specific components
│   ├── products/        # Product components
│   ├── printing/        # Printing components
│   ├── inventory/       # Inventory components
│   └── reports/         # Report components
├── modules/             # Feature modules
├── hooks/               # Custom React hooks
├── services/
│   ├── supabase.ts      # Supabase client
│   └── zortout.ts       # ZortOut API integration
├── stores/              # Zustand state management
│   ├── authStore.ts
│   ├── cartStore.ts
│   └── productStore.ts
├── types/               # TypeScript type definitions
├── utils/               # Helper functions
├── lib/                 # Third-party configurations
└── pages/               # Page components
    ├── LoginPage.tsx
    ├── DashboardPage.tsx
    ├── POSPage.tsx
    ├── ProductsPage.tsx
    ├── InventoryPage.tsx
    ├── ReportsPage.tsx
    └── SettingsPage.tsx
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account

### Installation

1. Clone the repository or navigate to the project directory

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

4. Update `.env` with your Supabase credentials:
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Supabase Setup

Create the following tables in your Supabase database:

#### Users Table
```sql
create table users (
  id uuid references auth.users primary key,
  email text unique not null,
  name text not null,
  role text not null check (role in ('admin', 'pharmacist', 'cashier')),
  created_at timestamp with time zone default now()
);
```

#### Products Table
```sql
create table products (
  id uuid primary key default uuid_generate_v4(),
  barcode text unique not null,
  name text not null,
  name_en text,
  description text,
  price decimal(10,2) not null,
  cost decimal(10,2) not null,
  stock integer not null default 0,
  min_stock integer not null default 10,
  category text not null,
  is_drug boolean default false,
  drug_info jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
```

#### Sales Table
```sql
create table sales (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) not null,
  items jsonb not null,
  subtotal decimal(10,2) not null,
  discount decimal(10,2) default 0,
  tax decimal(10,2) default 0,
  total decimal(10,2) not null,
  payment_method text not null check (payment_method in ('cash', 'card', 'transfer')),
  created_at timestamp with time zone default now()
);
```

### Development

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Build

Build for production:
```bash
npm run build
```

Preview production build:
```bash
npm run preview
```

## Features Implementation Status

- ✅ Project setup with Vite + React + TypeScript
- ✅ Tailwind CSS configuration
- ✅ Supabase client setup
- ✅ Authentication system with protected routes
- ✅ Basic layout with sidebar navigation
- ✅ Login page
- ✅ Dashboard page
- ✅ POS page with cart functionality
- ✅ Products page with search
- ✅ Inventory page
- ✅ Reports page
- ✅ Settings page
- ⏳ Barcode scanning implementation
- ⏳ Payment processing
- ⏳ Receipt printing
- ⏳ Drug label printing
- ⏳ ZortOut integration
- ⏳ Advanced reporting features

## Responsive Design

The application is fully responsive and supports:
- Desktop (1024px+)
- Tablet/iPad (768px - 1023px)
- Mobile (< 768px)

## Language Support

- Thai (Primary)
- English (Secondary)

## License

Private - All rights reserved

## Support

For support and questions, please contact the development team.
