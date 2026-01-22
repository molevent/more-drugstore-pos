# Database Setup Guide - More Drug Store

## 🎯 Complete Database Schema Implementation

This guide will help you set up the complete database schema with all 13 tables, Row Level Security policies, and seed data.

## 📋 What's Included

### Tables (13 total)
1. **users** - User profiles with roles (admin, pharmacist, cashier)
2. **categories** - Hierarchical product categories
3. **products** - Complete product catalog
4. **drug_info** - Pharmaceutical information for medicines
5. **symptoms** - Medical symptoms database
6. **product_symptoms** - Links products to symptoms (Many-to-Many)
7. **platforms** - Sales channels (Walk-in, Shopee, Lazada, LINE, etc.)
8. **platform_prices** - Platform-specific pricing
9. **orders** - Sales orders with auto-generated order numbers
10. **order_items** - Order line items with label printing tracking
11. **stock_alerts** - Automatic low stock alerts
12. **daily_reports** - Daily sales and financial reports
13. **zortout_config** - ZortOut integration settings

### Features
- ✅ Auto-generated order numbers (ORD-YYYYMMDD-XXXX)
- ✅ Automatic stock alerts when inventory is low
- ✅ Automatic stock deduction on order creation
- ✅ Row Level Security (RLS) policies for all tables
- ✅ Comprehensive indexes for performance
- ✅ Triggers for updated_at timestamps
- ✅ Sample data with 15 products ready to test

## 🚀 Setup Instructions

### Step 1: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Create a new project
3. Wait for project initialization (2-3 minutes)

### Step 2: Run Migration Files

Run these SQL files **in order** in your Supabase SQL Editor:

#### Migration 1: Initial Schema
```bash
File: supabase/migrations/001_initial_schema.sql
```

1. Open Supabase SQL Editor
2. Click "New query"
3. Copy the entire content of `001_initial_schema.sql`
4. Paste and click "Run"
5. Wait for "Success" message

This creates:
- All 13 tables
- Enums for user roles, payment methods, etc.
- Indexes for performance
- Functions for order number generation, stock alerts
- Triggers for automatic updates

#### Migration 2: Row Level Security
```bash
File: supabase/migrations/002_rls_policies.sql
```

1. Create another new query
2. Copy the entire content of `002_rls_policies.sql`
3. Paste and click "Run"

This adds:
- RLS policies for all tables
- Role-based access control
- Public read access for products and categories
- Admin-only access for sensitive data

#### Migration 3: Seed Data
```bash
File: supabase/migrations/003_seed_data.sql
```

1. Create another new query
2. Copy the entire content of `003_seed_data.sql`
3. Paste and click "Run"

This inserts:
- 6 sales platforms (Walk-in, Shopee, Lazada, LINE, Facebook, TikTok)
- 8 product categories
- 17 medical symptoms
- 15 sample products with complete information
- Drug information for medicines
- Product-symptom relationships
- Platform prices

### Step 3: Create Your Admin User

1. In Supabase, go to **Authentication** → **Users**
2. Click **"Add user"** → **"Create new user"**
3. Enter:
   - Email: `admin@moredrug.com`
   - Password: (your secure password)
   - ✅ Check "Auto Confirm User"
4. Click **"Create user"**
5. **Copy the User ID** (UUID shown in the users table)

### Step 4: Insert Admin User Profile

1. Go back to SQL Editor
2. Run this query (replace `YOUR-USER-ID`):

```sql
INSERT INTO public.users (id, email, full_name, role, is_active)
VALUES (
  'YOUR-USER-ID',
  'admin@moredrug.com',
  'Admin User',
  'admin',
  true
);
```

### Step 5: Configure Environment

Create `.env` file in project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Get these values from Supabase **Settings** → **API**

### Step 6: Test the Application

```bash
npm run dev
```

Open http://localhost:5173 and login with your admin credentials.

## 🧪 Testing Data

### Sample Products (Barcodes)

| Barcode | Product | Price | Stock |
|---------|---------|-------|-------|
| 8850123456789 | พาราเซตามอล 500mg | ฿5.00 | 500 |
| 8850123456790 | วิตามินซี 1000mg | ฿150.00 | 200 |
| 8850123456791 | คลอร์เฟนิรามีน 4mg | ฿25.00 | 300 |
| 8850123456792 | โลเปอราไมด์ 2mg | ฿35.00 | 150 |
| 8850123456793 | หน้ากากอนามัย | ฿2.50 | 1000 |
| 8850123456794 | แอลกอฮอล์เจล 70% | ฿45.00 | 250 |
| 8850123456795 | ออกซีเมทาโซลีน | ฿120.00 | 80 |
| 8850123456796 | เด็กซ์โทรเมทอร์แฟน | ฿85.00 | 120 |
| 8850123456797 | พลาสเตอร์ปิดแผล | ฿15.00 | 400 |
| 8850123456798 | ยาทาแก้ปวดกล้ามเนื้อ | ฿95.00 | 100 |
| 8850123456799 | ไอบูโพรเฟน 400mg | ฿8.00 | 400 |
| 8850123456800 | โอเมพราโซล 20mg | ฿12.00 | 200 |
| 8850123456801 | วิตามินบีรวม | ฿120.00 | 150 |
| 8850123456802 | วิตามินดี 1000 IU | ฿180.00 | 100 |
| 8850123456803 | เครื่องวัดไข้ดิจิตอล | ฿250.00 | 50 |

### Platforms Available

- **WALKIN** - Walk-in (ร้าน)
- **SHOPEE** - Shopee
- **LAZADA** - Lazada
- **LINE** - LINE Shopping
- **FACEBOOK** - Facebook
- **TIKTOK** - TikTok Shop

### Categories

1. ยาแก้ปวด ลดไข้ (Pain Relief & Fever)
2. ยาแก้แพ้ (Antihistamines)
3. ยาระบบทางเดินอาหาร (Digestive System)
4. ยาระบบทางเดินหายใจ (Respiratory System)
5. วิตามินและอาหารเสริม (Vitamins & Supplements)
6. ยาทาภายนอก (Topical Medications)
7. อุปกรณ์การแพทย์ (Medical Supplies)
8. ผลิตภัณฑ์เพื่อสุขภาพ (Health Products)

## 🔍 Database Features

### Automatic Order Numbers
Orders automatically get unique numbers like:
- ORD-20260122-0001
- ORD-20260122-0002
- etc.

### Stock Alerts
When product stock reaches or falls below `min_stock_level`:
- Automatic alert created in `stock_alerts` table
- Alert type: 'low' or 'out'
- Can be resolved by staff

### Stock Management
When order items are created:
- Product stock automatically decreases
- Stock alerts triggered if needed

### Platform Pricing
Each product can have different prices per platform:
- Walk-in store price
- Shopee price
- Lazada price
- etc.

## 📊 Database Schema Diagram

```
users (Auth)
  ↓
orders ← platforms
  ↓
order_items → products ← categories
                ↓
              drug_info
                ↓
              product_symptoms → symptoms
                ↓
              platform_prices → platforms
                ↓
              stock_alerts
```

## 🔐 Security (RLS Policies)

### Public Access
- View active products
- View active categories
- View symptoms

### Authenticated Users
- Create orders
- View all products
- Manage inventory
- View reports

### Admin Only
- Manage users
- Manage platforms
- View/edit ZortOut config
- Delete products

## 🛠️ Troubleshooting

### Issue: Migration fails

**Solution**: Run migrations one at a time and check for errors in each step.

### Issue: User can't login

**Solution**: 
1. Verify user exists in Authentication
2. Verify user profile exists in `users` table
3. Check that `is_active = true`

### Issue: Products not showing

**Solution**:
1. Check if seed data ran successfully
2. Verify RLS policies are enabled
3. Check browser console for errors

### Issue: Stock not updating

**Solution**: Check that the trigger `update_stock_trigger` is enabled on `order_items` table.

## 📝 Next Steps

1. **Add More Products**: Insert your actual product catalog
2. **Configure ZortOut**: Add API credentials in `zortout_config`
3. **Create Staff Users**: Add pharmacist and cashier accounts
4. **Customize Categories**: Adjust categories for your store
5. **Set Platform Prices**: Update prices for each sales channel

## 🎓 Advanced Features

### Custom Queries

**Get products by symptom:**
```sql
SELECT p.* FROM products p
JOIN product_symptoms ps ON p.id = ps.product_id
JOIN symptoms s ON ps.symptom_id = s.id
WHERE s.name_th = 'ปวดหัว'
ORDER BY ps.relevance_score DESC;
```

**Daily sales report:**
```sql
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_orders,
  SUM(total) as total_revenue,
  SUM(CASE WHEN payment_method = 'cash' THEN total ELSE 0 END) as cash_sales
FROM orders
WHERE created_at >= CURRENT_DATE
GROUP BY DATE(created_at);
```

**Low stock products:**
```sql
SELECT * FROM products
WHERE stock_quantity <= min_stock_level
AND is_active = true
ORDER BY stock_quantity ASC;
```

---

**Database setup complete! 🎉**

Your POS system now has a professional, scalable database ready for production use.
