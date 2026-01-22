# More Drug Store - Database Schema Prompt

Copy ข้อความด้านล่างนี้ไปใช้ใน Windsurf AI เพื่อสร้าง Database Schema:

---

```
สร้าง Supabase Database Schema สำหรับระบบ POS ร้านขายยา "More Drug Store"

## Tables ที่ต้องสร้าง:

### 1. users (ใช้ Supabase Auth + extended profile)
- id: uuid (FK to auth.users)
- email: varchar
- full_name: varchar
- role: enum ('admin', 'pharmacist', 'cashier')
- avatar_url: varchar (nullable)
- is_active: boolean (default true)
- created_at: timestamp
- updated_at: timestamp

### 2. categories
- id: uuid (PK)
- name_th: varchar
- name_en: varchar
- parent_id: uuid (FK, nullable, self-reference)
- sort_order: integer
- created_at: timestamp

### 3. products
- id: uuid (PK)
- barcode: varchar (unique)
- sku: varchar (unique)
- name_th: varchar
- name_en: varchar
- description_th: text (nullable)
- description_en: text (nullable)
- category_id: uuid (FK)
- base_price: decimal(10,2)
- cost_price: decimal(10,2)
- stock_quantity: integer (default 0)
- min_stock_level: integer (default 10)
- unit: varchar (เช่น 'แผง', 'กล่อง', 'ขวด')
- image_url: varchar (nullable)
- is_active: boolean (default true)
- created_at: timestamp
- updated_at: timestamp

### 4. drug_info
- id: uuid (PK)
- product_id: uuid (FK, unique)
- active_ingredients: text
- dosage: text
- side_effects: text (nullable)
- contraindications: text (nullable)
- usage_instructions_th: text
- usage_instructions_en: text
- warnings: text (nullable)
- storage_info: text (nullable)

### 5. symptoms
- id: uuid (PK)
- name_th: varchar
- name_en: varchar
- description: text (nullable)
- is_active: boolean (default true)

### 6. product_symptoms (Many-to-Many)
- id: uuid (PK)
- product_id: uuid (FK)
- symptom_id: uuid (FK)
- relevance_score: integer (1-100, ความเกี่ยวข้อง)
- UNIQUE(product_id, symptom_id)

### 7. platforms
- id: uuid (PK)
- name: varchar (เช่น 'Walk-in', 'Shopee', 'Lazada', 'LINE')
- code: varchar (unique)
- is_active: boolean (default true)
- created_at: timestamp

### 8. platform_prices
- id: uuid (PK)
- product_id: uuid (FK)
- platform_id: uuid (FK)
- price: decimal(10,2)
- updated_at: timestamp
- UNIQUE(product_id, platform_id)

### 9. orders
- id: uuid (PK)
- order_number: varchar (unique, auto-generate: ORD-YYYYMMDD-XXXX)
- user_id: uuid (FK)
- platform_id: uuid (FK)
- customer_name: varchar (nullable)
- customer_phone: varchar (nullable)
- customer_tax_id: varchar (nullable, สำหรับใบกำกับภาษี)
- subtotal: decimal(10,2)
- discount: decimal(10,2) (default 0)
- tax: decimal(10,2)
- total: decimal(10,2)
- payment_method: enum ('cash', 'transfer', 'credit_card', 'promptpay')
- payment_status: enum ('pending', 'paid', 'refunded')
- notes: text (nullable)
- zortout_synced: boolean (default false)
- zortout_order_id: varchar (nullable)
- created_at: timestamp
- updated_at: timestamp

### 10. order_items
- id: uuid (PK)
- order_id: uuid (FK)
- product_id: uuid (FK)
- product_name: varchar (snapshot)
- quantity: integer
- unit_price: decimal(10,2)
- discount: decimal(10,2) (default 0)
- total_price: decimal(10,2)
- label_printed: boolean (default false)
- label_printed_at: timestamp (nullable)

### 11. stock_alerts
- id: uuid (PK)
- product_id: uuid (FK)
- alert_type: enum ('low', 'out')
- current_stock: integer
- min_stock_level: integer
- is_resolved: boolean (default false)
- created_at: timestamp
- resolved_at: timestamp (nullable)
- resolved_by: uuid (FK, nullable)

### 12. daily_reports
- id: uuid (PK)
- report_date: date (unique)
- total_orders: integer
- total_items_sold: integer
- total_revenue: decimal(10,2)
- total_cost: decimal(10,2)
- total_profit: decimal(10,2)
- total_tax: decimal(10,2)
- cash_amount: decimal(10,2)
- transfer_amount: decimal(10,2)
- card_amount: decimal(10,2)
- generated_at: timestamp
- generated_by: uuid (FK)

### 13. zortout_config
- id: uuid (PK)
- api_key: varchar (encrypted)
- store_id: varchar
- webhook_url: varchar (nullable)
- is_active: boolean (default true)
- last_sync_at: timestamp (nullable)
- updated_at: timestamp

## สร้างเพิ่มเติม:
1. SQL migration files
2. Row Level Security (RLS) policies
3. TypeScript types/interfaces ใน src/types/database.ts
4. Supabase client functions ใน src/services/supabase.ts
5. Seed data สำหรับทดสอบ (categories, platforms, sample products)

## Indexes ที่ควรสร้าง:
- products.barcode
- products.sku
- products.category_id
- orders.order_number
- orders.created_at
- order_items.order_id
- platform_prices(product_id, platform_id)
- stock_alerts(product_id, is_resolved)
```
