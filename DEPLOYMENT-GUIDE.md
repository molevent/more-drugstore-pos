# 🚀 Deployment Guide - GitHub + Netlify

## Quick Deployment Steps

### Step 1: Create GitHub Repository

1. **Go to GitHub**: https://github.com/new
2. **Repository name**: `more-drugstore-pos` (or your choice)
3. **Description**: `POS System for Drug Store with Supabase`
4. **Visibility**: Choose **Private** or **Public**
5. **DO NOT** initialize with README, .gitignore, or license (we already have these)
6. Click **"Create repository"**

### Step 2: Push Code to GitHub

After creating the repository, GitHub will show you commands. Use these:

```bash
cd "/Users/surecomputer/Desktop/More Drugstore App"
git remote add origin https://github.com/YOUR-USERNAME/more-drugstore-pos.git
git branch -M main
git push -u origin main
```

**Replace `YOUR-USERNAME`** with your actual GitHub username.

### Step 3: Deploy to Netlify

1. **Go to Netlify**: https://app.netlify.com
2. **Sign up/Login** with your **GitHub account**
3. Click **"Add new site"** → **"Import an existing project"**
4. Click **"Deploy with GitHub"**
5. **Authorize Netlify** to access your GitHub (if first time)
6. **Select your repository**: `more-drugstore-pos`
7. **Build settings** (should auto-detect):
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - **Branch to deploy**: `main`
8. Click **"Deploy site"**

### Step 4: Add Environment Variables

**IMPORTANT**: Before the site works, add your Supabase credentials:

1. In Netlify, go to **Site configuration** → **Environment variables**
2. Click **"Add a variable"** and add these:

**Variable 1:**
```
Key: VITE_SUPABASE_URL
Value: https://tqbonqjabeavlwjvrpqx.supabase.co
```

**Variable 2:**
```
Key: VITE_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxYm9ucWphYmVhdmx3anZycHF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc1Mzc2NDIsImV4cCI6MjA1MzExMzY0Mn0.sb_publishable_0aERgtlTEPx9WgB53x3dsA_BsxFYfxn
```

3. Click **"Save"**
4. Go to **Deploys** → **Trigger deploy** → **Deploy site**

### Step 5: Get Your Live URL

After deployment completes (1-2 minutes):
- Your site will be live at: `https://random-name-123.netlify.app`
- You can customize the domain in **Site configuration** → **Domain management**

---

## ✅ What You Get

- 🔄 **Automatic deployments**: Every push to `main` branch auto-deploys
- 🌐 **Live URL**: Access your POS from anywhere
- 🔒 **HTTPS**: Secure by default
- 📱 **Works on all devices**: Desktop, tablet, mobile
- ⚡ **Fast CDN**: Global content delivery

---

## 🔧 Custom Domain (Optional)

To use your own domain (e.g., `pos.yourdomain.com`):

1. In Netlify: **Site configuration** → **Domain management**
2. Click **"Add domain"**
3. Follow the DNS setup instructions
4. Wait for DNS propagation (5-30 minutes)

---

## 📝 Future Updates

To update your live site:

```bash
# Make your changes
git add .
git commit -m "Description of changes"
git push origin main
```

Netlify will automatically rebuild and deploy! 🎉

---

## 🆘 Troubleshooting

### Build fails
- Check build logs in Netlify
- Verify environment variables are set
- Make sure `npm run build` works locally

### Site loads but can't login
- Verify environment variables are correct
- Check Supabase URL and key
- Redeploy after adding variables

### Products not showing
- Verify Supabase migrations ran successfully
- Check browser console for errors
- Verify RLS policies are enabled

---

**Ready to deploy!** 🚀
