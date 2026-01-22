# 🚀 Supabase Setup Guide - More Drug Store

## Step-by-Step Setup (10 Minutes)

### Step 1: Create Supabase Account & Project

1. **Go to Supabase**
   - Visit: https://supabase.com
   - Click **"Start your project"**
   - Sign up with GitHub, Google, or Email

2. **Create New Project**
   - Click **"New Project"**
   - Organization: Select or create one
   - **Project Name**: `more-drugstore` (or your choice)
   - **Database Password**: Create a strong password (SAVE THIS!)
   - **Region**: Choose `Southeast Asia (Singapore)` (closest to Thailand)
   - Click **"Create new project"**
   - ⏳ Wait 2-3 minutes for setup

### Step 2: Get Your API Credentials

1. In your project dashboard, click **⚙️ Settings** (bottom left)
2. Click **API** in the sidebar
3. You'll see two important values:

**Copy these:**
```
Project URL: https://xxxxxxxxxxxxx.supabase.co
anon public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Step 3: Configure Your App

1. **Create `.env` file** in project root:
```bash
cd "/Users/surecomputer/Desktop/More Drugstore App"
touch .env
```

2. **Add your credentials** to `.env`:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key-here
```

Replace with your actual values from Step 2.

### Step 4: Run Database Migrations

#### Migration 1: Create Tables

1. In Supabase, click **🗄️ SQL Editor** (left sidebar)
2. Click **"+ New query"**
3. Open file: `supabase/migrations/001_initial_schema.sql`
4. **Copy ALL content** (Ctrl/Cmd + A, then Ctrl/Cmd + C)
5. **Paste** into SQL Editor
6. Click **▶️ Run** (or Ctrl/Cmd + Enter)
7. ✅ Wait for "Success. No rows returned"

**This creates:**
- 13 tables (users, products, orders, etc.)
- Auto-generated order numbers
- Stock alert system
- All triggers and functions

#### Migration 2: Add Security Policies

1. Click **"+ New query"** again
2. Open file: `supabase/migrations/002_rls_policies.sql`
3. **Copy ALL content**
4. **Paste** into SQL Editor
5. Click **▶️ Run**
6. ✅ Wait for success

**This adds:**
- Row Level Security (RLS)
- Role-based access control
- Public/private data policies

#### Migration 3: Insert Sample Data

1. Click **"+ New query"** again
2. Open file: `supabase/migrations/003_seed_data.sql`
3. **Copy ALL content**
4. **Paste** into SQL Editor
5. Click **▶️ Run**
6. ✅ Wait for success

**This inserts:**
- 6 platforms (Walk-in, Shopee, Lazada, LINE, Facebook, TikTok)
- 8 categories
- 17 symptoms
- 15 sample products with full details
- Drug information
- Platform prices

### Step 5: Create Your Admin User

#### 5.1 Create Auth User

1. Click **🔐 Authentication** (left sidebar)
2. Click **Users** tab
3. Click **"Add user"** dropdown
4. Select **"Create new user"**
5. Fill in:
   - **Email**: `admin@moredrug.com` (or your email)
   - **Password**: Create a secure password (REMEMBER THIS!)
   - ✅ **Check**: "Auto Confirm User"
6. Click **"Create user"**
7. **IMPORTANT**: Copy the **User ID** (UUID) - looks like: `a1b2c3d4-e5f6-...`

#### 5.2 Add Admin Profile

1. Go back to **SQL Editor**
2. Click **"+ New query"**
3. Paste this SQL (replace `YOUR-USER-ID-HERE`):

```sql
INSERT INTO public.users (id, email, full_name, role, is_active)
VALUES (
  'YOUR-USER-ID-HERE',
  'admin@moredrug.com',
  'Admin User',
  'admin',
  true
);
```

4. **Replace** `YOUR-USER-ID-HERE` with the UUID you copied
5. Click **▶️ Run**
6. ✅ Success!

### Step 6: Verify Setup

#### Check Tables

1. Click **🗄️ Table Editor** (left sidebar)
2. You should see all tables:
   - ✅ users
   - ✅ categories
   - ✅ products
   - ✅ platforms
   - ✅ orders
   - ✅ etc.

#### Check Sample Data

1. Click **products** table
2. You should see 15 products
3. Click **platforms** table
4. You should see 6 platforms

### Step 7: Test the Application

1. **Make sure dev server is running**:
```bash
npm run dev
```

2. **Open**: http://localhost:5173

3. **Login**:
   - Email: `admin@moredrug.com`
   - Password: (the password you created)

4. **You should see**:
   - Dashboard with stats
   - Sidebar navigation
   - Your name in the sidebar

### Step 8: Test POS System

1. **Go to**: ขายสินค้า (POS) page
2. **Scan a barcode** (type and press Enter):
   - Try: `8850123456789` (Paracetamol ฿5.00)
   - Try: `8850123456790` (Vitamin C ฿150.00)
3. **Product should appear in cart**
4. **Adjust quantity** with +/- buttons
5. **Click "ชำระเงิน"** to test checkout

---

## 🧪 Test Barcodes

| Barcode | Product | Price |
|---------|---------|-------|
| 8850123456789 | พาราเซตามอล 500mg | ฿5.00 |
| 8850123456790 | วิตามินซี 1000mg | ฿150.00 |
| 8850123456791 | คลอร์เฟนิรามีน 4mg | ฿25.00 |
| 8850123456792 | โลเปอราไมด์ 2mg | ฿35.00 |
| 8850123456793 | หน้ากากอนามัย | ฿2.50 |
| 8850123456794 | แอลกอฮอล์เจล 70% | ฿45.00 |
| 8850123456795 | ออกซีเมทาโซลีน | ฿120.00 |
| 8850123456796 | เด็กซ์โทรเมทอร์แฟน | ฿85.00 |
| 8850123456797 | พลาสเตอร์ปิดแผล | ฿15.00 |
| 8850123456798 | ยาทาแก้ปวดกล้ามเนื้อ | ฿95.00 |

---

## ❌ Troubleshooting

### Problem: "Missing Supabase environment variables"

**Solution:**
1. Check `.env` file exists in project root
2. Verify it has both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
3. Restart dev server: `npm run dev`

### Problem: Login fails with "Invalid login credentials"

**Solution:**
1. Verify user exists in **Authentication → Users**
2. Check user is confirmed (green checkmark)
3. Verify you inserted user profile in `users` table
4. Try password reset if needed

### Problem: Products not showing

**Solution:**
1. Check migration 003 ran successfully
2. Go to **Table Editor → products**
3. Verify 15 products exist
4. Check browser console (F12) for errors

### Problem: "Row Level Security policy violation"

**Solution:**
1. Verify migration 002 (RLS policies) ran successfully
2. Check you're logged in
3. Verify user has correct role in `users` table

### Problem: Can't create orders

**Solution:**
1. Check `platforms` table has data
2. Verify `orders` table exists
3. Check browser console for specific error

---

## 🔐 Security Notes

### API Keys
- **anon key**: Safe to use in frontend (public)
- **service_role key**: NEVER use in frontend (admin only)

### Row Level Security (RLS)
- All tables have RLS enabled
- Users can only access their own data
- Admins can access everything
- Public can view products/categories

### User Roles
- **admin**: Full access, can manage users
- **pharmacist**: Can manage products, view reports
- **cashier**: Can create orders, view products

---

## 📊 Database Structure

```
Authentication (Supabase Auth)
    ↓
users (profiles with roles)
    ↓
orders ← platforms
    ↓
order_items → products ← categories
                ↓
              drug_info
                ↓
              product_symptoms → symptoms
                ↓
              platform_prices
                ↓
              stock_alerts
```

---

## 🎯 Next Steps

### Add More Products
1. Go to **Table Editor → products**
2. Click **"Insert row"**
3. Fill in product details
4. Add drug_info if it's a medicine

### Add Staff Users
1. **Authentication → Users → Add user**
2. Create user with email/password
3. **SQL Editor**, run:
```sql
INSERT INTO public.users (id, email, full_name, role)
VALUES ('user-id-here', 'staff@moredrug.com', 'Staff Name', 'cashier');
```

### Configure ZortOut
1. Get API credentials from ZortOut
2. **Table Editor → zortout_config**
3. Insert your API key and store ID

### Customize Categories
1. **Table Editor → categories**
2. Add/edit categories for your store
3. Update products to use new categories

---

## 🆘 Need Help?

### Check Logs
- **Supabase Logs**: Project → Logs
- **Browser Console**: F12 → Console tab
- **Network Tab**: F12 → Network tab

### Common Commands
```bash
# Restart dev server
npm run dev

# Check environment variables
cat .env

# Reinstall dependencies
npm install
```

### Supabase Resources
- [Documentation](https://supabase.com/docs)
- [SQL Reference](https://supabase.com/docs/guides/database)
- [Auth Guide](https://supabase.com/docs/guides/auth)

---

## ✅ Setup Complete!

Your More Drug Store POS system is now fully configured and ready to use! 🎉

**What you have:**
- ✅ Complete database with 13 tables
- ✅ 15 sample products ready to test
- ✅ Multi-platform support (6 platforms)
- ✅ Automatic order numbers
- ✅ Stock alert system
- ✅ Role-based security
- ✅ Admin account ready

**Start selling!** 🛒💊
