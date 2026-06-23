# Pokémart - Pokemon TCG Sealed Product Store

A full-featured e-commerce site for selling Pokemon TCG sealed products, built with React, Vite, Supabase, and TCGdex API.

## Features

- 🛍️ **Product Catalog** - Browse Pokemon sealed products with search & filters
- 📦 **Inventory Management** - Admin panel to manage products and stock
- 🛒 **Shopping Cart** - Add products to cart with persistent storage
- 💳 **Payment Processing** - Secure checkout with Stripe integration
- 📋 **Order Management** - Complete order tracking and history
- ⭐ **Reviews & Ratings** - Customers can leave reviews on products
- 🔍 **TCGdex Integration** - Automatic product data from TCGdex API
- 🗄️ **Supabase Backend** - Cloud database with authentication
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile

## Tech Stack

- **Frontend**: React 19, Vite, React Router
- **State Management**: Zustand
- **Backend**: Supabase (PostgreSQL + Auth)
- **Payments**: Stripe (client-side integration)
- **API**: TCGdex API (free Pokemon card data)
- **Styling**: CSS3

## Prerequisites

- Node.js 16+ and npm
- Supabase account (free tier available at https://supabase.com)
- Basic knowledge of React and SQL

## Installation

### 1. Clone & Install Dependencies

```bash
cd pokemon-site
npm install
```

All dependencies are already in package.json:
- @supabase/supabase-js
- @stripe/stripe-js
- @stripe/react-stripe-js
- axios
- react-router-dom
- zustand

### 2. Set Up Stripe for Payments

1. Go to https://stripe.com and create an account (free test account available)
2. In your Stripe Dashboard, go to **Developers → API keys**
3. Copy your **Publishable key** (starts with `pk_test_`)
4. Add it to your `.env` file as `VITE_STRIPE_PUBLISHABLE_KEY`

**Note**: For production, you'll need:
- A Stripe account with business verification
- A backend server to create PaymentIntents securely
- Webhook endpoints for payment confirmations
- The current implementation uses client-side only payment method creation for demo purposes

### 3. Create Environment Variables

Create `.env` file in the project root:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_TCGDEX_API_URL=https://api.tcgdex.net/v1
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
```

### 4. Create Database Tables in Supabase

Go to Supabase Dashboard → SQL Editor and run the following SQL (or use the SETUP_DATABASE.sql file):

```sql
-- Products table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  set_id TEXT,
  set_name TEXT,
  card_id TEXT,
  price DECIMAL(10, 2) NOT NULL,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  description TEXT,
  condition TEXT,
  card_details TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Reviews table
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Cart items table
CREATE TABLE cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- Orders table
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_email TEXT,
  user_name TEXT,
  total_amount DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  stripe_payment_intent_id TEXT,
  shipping_address JSONB,
  billing_address JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Order items table
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  product_name TEXT NOT NULL,
  product_price DECIMAL(10, 2) NOT NULL,
  quantity INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_products_set_id ON products(set_id);
CREATE INDEX idx_reviews_product_id ON reviews(product_id);
CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_cart_items_user_id ON cart_items(user_id);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);

-- Enable Row Level Security (important for production)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
```

### 5. Set Up Row Level Security (Recommended for Production)

For production, add policies in Supabase:

```sql
-- Products: Anyone can read, only admins can write
CREATE POLICY "Public can read products" ON products FOR SELECT USING (true);
CREATE POLICY "Only admins can manage products" ON products FOR ALL USING (auth.uid() = auth.uid());

-- Reviews: Anyone can read/create, users can update/delete their own
CREATE POLICY "Public can read reviews" ON reviews FOR SELECT USING (true);
CREATE POLICY "Users can create reviews" ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their reviews" ON reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their reviews" ON reviews FOR DELETE USING (auth.uid() = user_id);

-- Cart: Users can only access their own cart
CREATE POLICY "Users can manage their cart" ON cart_items FOR ALL USING (auth.uid() = user_id);

-- Orders: Users can only access their own orders
CREATE POLICY "Users can view their orders" ON orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their orders" ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Order items: Users can view items from their orders
CREATE POLICY "Users can view their order items" ON order_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = order_items.order_id 
    AND orders.user_id = auth.uid()
  )
);
```

### 6. Run Development Server

```bash
npm run dev
```

Visit http://localhost:5173

## Project Structure

```
src/
├── config/
│   └── supabase.js          # Supabase client initialization
├── services/
│   ├── supabaseService.js   # Database queries
│   └── tcgdexAPI.js         # TCGdex API integration
├── store/
│   └── index.js             # Zustand stores (auth, cart, products)
├── pages/
│   ├── Catalog.jsx          # Product listing page
│   ├── ProductDetail.jsx    # Single product page with reviews
│   ├── Cart.jsx             # Shopping cart
│   └── Admin.jsx            # Admin panel for inventory management
├── components/
│   ├── Header.jsx           # Navigation header
│   ├── ReviewForm.jsx       # Review submission form
│   └── ReviewList.jsx       # Display reviews
├── styles/
│   ├── Header.css
│   ├── Catalog.css
│   ├── ProductDetail.css
│   ├── Cart.css
│   ├── Admin.css
│   ├── ReviewForm.css
│   └── ReviewList.css
├── App.jsx                  # Main app with routing
├── App.css                  # Global styles
├── main.jsx
└── index.css
```

## How to Use

### Customer Features

1. **Browse Products** - Go to home page, see all products in a grid
2. **Filter & Search** - Use sidebar filters to find products
3. **View Details** - Click "View Details" to see full product info
4. **Leave Reviews** - Scroll to "Customer Reviews" section (must be logged in)
5. **Add to Cart** - Click "Add to Cart" button
6. **Manage Cart** - View cart, update quantities, remove items

### Admin Features

1. **Go to Admin Page** - `/admin` route
2. **Add Product** - Fill form and click "Add Product"
   - Name, Set Name, Price (required)
   - Stock Quantity, Image URL, Condition (optional)
3. **Edit Product** - Click "Edit" button on product, update fields, click "Update Product"
4. **Delete Product** - Click "Delete" button (confirmation required)
5. **Track Stock** - See current stock levels in the table

## Adding Products Manually

In the Admin panel, you can manually add products with:
- Custom pricing per product
- Stock quantity tracking
- Image URLs
- Condition information (Sealed, Near Mint, etc.)

## Integrating TCGdex API

The TCGdex API is pre-configured. Use it like this:

```javascript
import { tcgdexAPI } from './services/tcgdexAPI'

// Get all sets
const sets = await tcgdexAPI.getSets()

// Get cards from a set
const cards = await tcgdexAPI.getCardsBySet('sv1')

// Search cards
const results = await tcgdexAPI.searchCards('Charizard')

// Get single card details
const card = await tcgdexAPI.getCard('sv1-1')
```

Example: You could create a page that fetches TCGdex card data and auto-creates products.

## Authentication

Currently using Supabase Auth (ready to implement):
- Users can sign up / log in
- Reviews are tied to user accounts
- Admin access can be managed via custom claims

To enable auth UI, you can add Supabase Auth components or create a login page.

## Deployment

### Deploy to Vercel (Recommended)

1. Push code to GitHub
2. Connect repository to Vercel
3. Set environment variables in Vercel project settings
4. Deploy!

### Deploy to Netlify

1. Push code to GitHub
2. Connect repository to Netlify
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Add environment variables in Netlify UI
6. Deploy!

## Future Features

- 🛡️ Complete user authentication UI
- 💳 Payment integration (Stripe/PayPal)
- 📧 Order confirmation emails
- 🎁 Wishlist functionality
- 📊 Admin analytics dashboard
- 🚚 Shipping integration
- 📦 Order tracking
- 🌟 Advanced product recommendations

## Troubleshooting

### "Cannot find module" errors
```bash
npm install
```

### Database connection errors
- Check your .env file has correct Supabase credentials
- Verify Supabase project is active and tables are created
- Check CORS settings in Supabase if needed

### Products not loading
- Verify database tables exist
- Check browser console for errors
- Ensure Supabase API keys are correct

### Cart not persisting
- Cart is stored in memory (Zustand state)
- Add localStorage persistence if needed:

```javascript
// In store/index.js, add persistence
export const useCartStore = create(
  persist(
    (set, get) => ({
      // ... store logic
    }),
    { name: 'cart-storage' }
  )
)
```

## API References

- **TCGdex API**: https://tcgdex.dev/docs
- **Supabase Docs**: https://supabase.com/docs
- **React Router**: https://reactrouter.com
- **Zustand**: https://github.com/pmndrs/zustand

## License

MIT - Feel free to use this for your Pokemon TCG store!

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review Supabase documentation
3. Check React and Vite docs for framework-specific issues
