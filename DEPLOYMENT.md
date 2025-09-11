# Deployment Guide - Prophecy Claims

## 🚀 Vercel Deployment (Recommended)

### Prerequisites
- GitHub account with your repository
- Vercel account (free tier available)

### Steps

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "feat: beautiful landing page with beta warning"
   git push origin main
   ```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Sign in with GitHub
   - Click "New Project"
   - Import your `prophecy_claims_react` repository

3. **Configure Project**
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `./` (default)
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `.next` (auto-detected)

4. **Environment Variables** (Optional)
   If using Supabase in the future, add these in Vercel dashboard:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

5. **Deploy**
   - Click "Deploy"
   - Wait for build to complete (~2-3 minutes)
   - Your site will be live at `https://your-project-name.vercel.app`

6. **Custom Domain**
   - In Vercel dashboard, go to Project Settings → Domains
   - Add `prophecy.claims` as custom domain
   - Configure DNS with your domain provider:
     - Add CNAME record: `prophecy.claims` → `cname.vercel-dns.com`
     - Or A record: `prophecy.claims` → Vercel's IP (provided in dashboard)

## 🌐 Alternative Deployment Options

### Netlify
1. Connect GitHub repository
2. Build command: `npm run build`
3. Publish directory: `.next`
4. Deploy

### Traditional Hosting
```bash
npm run build
npm start
```
Requires Node.js server environment.

## 📊 Performance Optimization

The build is already optimized with:
- ✅ Static generation for faster loading
- ✅ Automatic code splitting
- ✅ Image optimization
- ✅ CSS minification
- ✅ Bundle analysis

## 🔍 Build Verification

Before deploying, verify locally:
```bash
npm run build
npm start
```
Visit `http://localhost:3000` to test production build.

## 🚨 Important Notes

- **Beta Banner**: Currently shows development status
- **External Links**: "Create Timeline" buttons link to `app.prophecy.claims`
- **Analytics**: `/viz` route available for future analytics
- **Responsive**: Fully optimized for mobile and desktop

## 📈 Post-Deployment

After successful deployment:
1. Test all interactive elements
2. Verify responsive design on different devices  
3. Check page load speeds
4. Test external links to app.prophecy.claims
5. Monitor Core Web Vitals in Vercel analytics

---

*Ready to bring divine prophecy to the world! 🌟*
