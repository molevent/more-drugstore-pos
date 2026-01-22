# More Drug Store - Complete Setup Guide

## 🚀 Quick Start (5 Minutes)

### Step 1: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click **"New Project"**
4. Fill in:
   - **Name**: More Drug Store
   - **Database Password**: (create a strong password)
   - **Region**: Choose closest to Thailand
5. Click **"Create new project"** and wait 2-3 minutes

### Step 2: Get Your Supabase Credentials

1. In your Supabase project dashboard, click **"Settings"** (gear icon)
2. Click **"API"** in the left sidebar
3. Copy these values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (under "Project API keys")

### Step 3: Configure Environment Variables

1. In the project folder, create a file named `.env`
2. Add your credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Replace with your actual values from Step 2.

### Step 4: Setup Database

1. In Supabase dashboard, click **"SQL Editor"** in the left sidebar
2. Click **"New query"**
3. Open the file `supabase-setup.sql` from this project
4. Copy ALL the SQL code
5. Paste it into the Supabase SQL Editor
6. Click **"Run"** (or press Ctrl/Cmd + Enter)
7. Wait for success message: "Success. No rows returned"

### Step 5: Create Your First User

1. In Supabase dashboard, click **"Authentication"** in the left sidebar
2. Click **"Users"** tab
3. Click **"Add user"** → **"Create new user"**
4. Fill in:
   - **Email**: admin@moredrug.com (or your email)
   - **Password**: (create a password)
   - **Auto Confirm User**: ✅ Check this box
5. Click **"Create user"**
6. **Copy the User ID** (UUID) that appears

### Step 6: Make User an Admin

1. Go back to **"SQL Editor"**
2. Create a new query
3. Paste this SQL (replace `YOUR-USER-ID` with the UUID you copied):

```sql
INSERT INTO public.users (id, email, name, role)
VALUES ('YOUR-USER-ID', 'admin@moredrug.com', 'Admin User', 'admin');
```

4. Click **"Run"**

### Step 7: Start the Application

The development server is already running at:
**http://localhost:5173**

### Step 8: Login

1. Open http://localhost:5173 in your browser
2. Login with:
   - **Email**: admin@moredrug.com (or the email you used)
   - **Password**: (the password you created)
3. You're in! 🎉

---

## 📱 Features Available Now

### ✅ Working Features

1. **Authentication**
   - Login/Logout
   - Protected routes
   - User role management

2. **Dashboard**
   - Sales overview
   - Stock alerts
   - Quick stats

3. **POS (Point of Sale)**
   - Barcode scanning (type barcode and press Enter)
   - Shopping cart
   - Add/remove items
   - Quantity management
   - Total calculation

4. **Products**
   - View all products
   - Search products
   - Filter by category
   - See drug information

5. **Inventory**
   - Stock levels
   - Low stock alerts
   - Stock monitoring

6. **Reports**
   - Daily sales summary
   - Payment method breakdown
   - Sales history

7. **Settings**
   - Store configuration
   - ZortOut integration settings
   - User management

---

## 🧪 Testing the Application

### Test Barcode Scanning

The sample data includes these barcodes you can test:

1. **8850123456789** - พาราเซตามอล 500mg (฿5.00)
2. **8850123456790** - วิตามินซี 1000mg (฿150.00)
3. **8850123456791** - ยาแก้แพ้ (฿25.00)
4. **8850123456792** - ยาบรรเทาอาการท้องเสีย (฿35.00)
5. **8850123456793** - หน้ากากอนามัย (฿2.50)
6. **8850123456794** - แอลกอฮอล์เจล (฿45.00)
7. **8850123456795** - ยาพ่นจมูก (฿120.00)
8. **8850123456796** - ยาแก้ไอ (฿85.00)
9. **8850123456797** - ปลาสเตอร์ (฿15.00)
10. **8850123456798** - ยาทาแก้ปวดกล้ามเนื้อ (฿95.00)

### How to Test POS

1. Go to **"ขายสินค้า (POS)"** page
2. Type a barcode in the input field (e.g., `8850123456789`)
3. Press **Enter** or click the scan button
4. Product will be added to cart
5. Adjust quantity if needed
6. Click **"ชำระเงิน"** to checkout (payment processing coming soon)

---

## 🔧 Troubleshooting

### Issue: "Missing Supabase environment variables"

**Solution**: Make sure you created the `.env` file with correct credentials.

### Issue: "Cannot find products"

**Solution**: Make sure you ran the `supabase-setup.sql` file completely.

### Issue: "Login failed"

**Solution**: 
1. Check that you created the user in Supabase Authentication
2. Make sure you inserted the user into the `users` table with admin role
3. Verify the email and password are correct

### Issue: "Products not showing in POS"

**Solution**: The products are loaded from Supabase. Check:
1. Database setup completed successfully
2. Sample products were inserted
3. Check browser console for errors (F12)

---

## 📊 Database Structure

### Tables Created

1. **users** - User accounts with roles
2. **products** - Product catalog with drug information
3. **sales** - Sales transactions
4. **stock_alerts** - Low stock notifications

### Sample Data Included

- ✅ 10 sample products (medicines and medical supplies)
- ✅ Complete drug information for medicines
- ✅ Thai and English names
- ✅ Realistic pricing and stock levels

---

## 🎯 Next Steps

### Recommended Enhancements

1. **Payment Processing**
   - Implement actual payment flow
   - Add receipt generation
   - Print functionality

2. **Barcode Scanner Integration**
   - Connect physical barcode scanner
   - USB/Bluetooth scanner support

3. **Printing**
   - Drug label printing
   - Tax invoice printing
   - Receipt printer integration

4. **ZortOut Integration**
   - Implement inventory sync
   - Auto-update stock levels
   - Product import/export

5. **Advanced Features**
   - Multi-language support (Thai/English toggle)
   - Dark mode
   - Sales analytics and charts
   - Customer management
   - Prescription management
   - Expiry date tracking

---

## 🆘 Need Help?

### Common Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Install dependencies
npm install
```

### Useful Links

- [Supabase Documentation](https://supabase.com/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Zustand State Management](https://github.com/pmndrs/zustand)

---

## 📝 Notes

- The application is responsive and works on desktop, tablet, and mobile
- All text is in Thai with English support
- The UI follows modern design principles
- Security is handled by Supabase Row Level Security (RLS)
- All sensitive data is protected

---

**Enjoy your new POS system! 🎉**
