# Quick Start Guide

## 5-Minute Setup

### Step 1: Install Dependencies ✅ (Already Done)
```bash
npm install
```

### Step 2: Create Supabase Project

1. Go to https://supabase.com
2. Click "Sign In" → "Create new account" (if needed)
3. Create a new project:
   - Project name: `pokemon-tcg-store` (or your choice)
   - Database password: (save this!)
   - Region: Choose closest to you
   - Click "Create new project"

### Step 3: Set Up Stripe (Optional - for Payments)

1. Go to https://stripe.com
2. Click "Sign up" → Create free test account
3. In Stripe Dashboard, go to **Developers → API keys**
4. Copy your **Publishable key** (starts with `pk_test_`)

### Step 4: Get Your Credentials

Once Supabase project is ready:
1. Go to **Settings → API**
2. Find these values and copy them:
   - **Project URL** (starts with `https://your-project-id.supabase.co`)
   - **anon public** key (long string of characters)

### Step 5: Create `.env` File

Create a file named `.env` in your project root (same level as `package.json`):

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-long-key-here
VITE_TCGDEX_API_URL=https://api.tcgdex.net/v1
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_key_here
```

### Step 6: Create Database Tables

1. In Supabase Dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy and paste **all** the SQL from `SETUP_DATABASE.sql` file
4. Click **Run** button
5. Wait for confirmation ✅

### Step 7: Start Development Server

```bash
npm run dev
```

Visit: http://localhost:5173

## What You Should See

- Header with "Pokémart" logo
- Empty product catalog (no products added yet)
- "Admin" link in header
- Shopping cart icon

## Next Steps

1. **Add Your First Product** in Admin panel (`/admin`)
2. **Add more products** with different prices and stock
3. **Test the catalog** - view products, search, filter
4. **Test shopping cart** - add items
5. **Leave reviews** (you can test without real auth)

## Troubleshooting

### `.env` not working?
- Make sure file is named `.env` (not `.env.local` or `.env.example`)
- File should be in root directory (where package.json is)
- Restart dev server after creating `.env`
- Check that values don't have extra quotes

### Database tables not created?
- Verify SQL pasted correctly in Supabase SQL Editor
- Look for error messages at bottom of SQL Editor
- Try running SQL one section at a time

### Can't connect to Supabase?
- Double-check URL - should start with `https://`
- Double-check anon key is the **public** key, not secret
- Check browser console for error messages
- Verify project is active in Supabase dashboard

### Still having issues?
- Check full documentation in `README_SETUP.md`
- Review Supabase getting started guide: https://supabase.com/docs/guides/getting-started

## Available Routes

- `/` - Product catalog (home page)
- `/product/:id` - Single product page with reviews
- `/cart` - Shopping cart
- `/checkout` - Payment checkout (requires Stripe setup)
- `/order-confirmation` - Order confirmation page
- `/admin` - Admin panel (add/edit/delete products)

## Admin Panel Tips

- **Add Test Product**: 
  - Name: "Charizard EX Box"
  - Set: "Scarlet & Violet"
  - Price: "49.99"
  - Stock: "10"

- **Use Real Image URLs**: Try Pokemon card image from any Pokemon site
  - Example: https://images.pokemontcg.io/sv04pt/1/high.png

- **Card Conditions**: Sealed, Near Mint, or leave blank

## Want to Add Real TCGdex Data?

The API is ready! You can fetch card data and create products:

```javascript
import { tcgdexAPI } from './services/tcgdexAPI'

// Fetch all sets
const sets = await tcgdexAPI.getSets()
sets.forEach(set => console.log(set.name))

// Fetch cards from a set
const cards = await tcgdexAPI.getCardsBySet('sv1')
// Create products from cards...
```

## Ready to Deploy?

See "Deployment" section in `README_SETUP.md` for:
- Deploy to Vercel
- Deploy to Netlify
- Custom domain setup
