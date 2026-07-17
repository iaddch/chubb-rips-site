-- Pokemon TCG Store Database Setup
-- Copy and paste this entire file into Supabase SQL Editor and click "Run"

-- Products table - stores all Pokemon sealed products
CREATE TABLE IF NOT EXISTS products (
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

-- Reviews table - customer reviews and ratings
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Events table - used by the admin sales dashboard
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Sales table - stores product line items for a specific event
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  items JSONB NOT NULL DEFAULT '[]'::JSONB
);

-- Inventory table - tracks cards and sealed products used by the admin sales flow
CREATE TABLE IF NOT EXISTS inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Card', 'Sealed Product')),
  qty INTEGER NOT NULL DEFAULT 0,
  price_bought_at NUMERIC(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Cart items table - shopping cart items
CREATE TABLE IF NOT EXISTS cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- Orders table - completed purchases
CREATE TABLE IF NOT EXISTS orders (
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

-- Order items table - items in each order
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  product_name TEXT NOT NULL,
  product_price DECIMAL(10, 2) NOT NULL,
  quantity INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Upcoming shows table - powers the "Where to find us" page. date/time are
-- free-form display text (e.g. "August 24, 2026" / "4:00 PM - 9:00 PM")
-- rather than real DATE/TIME columns, matching how the page always showed
-- them; images is an ordered array of URLs, images[1] is the card thumbnail.
CREATE TABLE IF NOT EXISTS upcoming_shows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  location TEXT NOT NULL,
  images TEXT[] NOT NULL DEFAULT '{}',
  instagram_link TEXT,
  ticket_link TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Seeds the three sample shows that used to live in a hardcoded mock file,
-- so the page isn't empty right after this migration runs. Safe to edit or
-- delete afterward from the new admin page.
INSERT INTO upcoming_shows (id, name, date, time, location, images, instagram_link, ticket_link) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Miami TCG Trade Night', 'August 24, 2026', '4:00 PM - 9:00 PM', 'Miami Convention Center, Booth #402',
    ARRAY['https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?w=1200&q=80','https://images.unsplash.com/photo-1606503153255-59d8b8b82176?w=1200&q=80','https://images.unsplash.com/photo-1611523658822-385aa008324c?w=1200&q=80'],
    'https://www.instagram.com/chubbsvaultt/', 'https://www.eventbrite.com/'),
  ('22222222-2222-2222-2222-222222222222', 'Orlando Collectors Expo', 'September 13, 2026', '10:00 AM - 6:00 PM', 'Orange County Convention Center, Hall B',
    ARRAY['https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?w=1200&q=80&sat=-40','https://images.unsplash.com/photo-1611523658822-385aa008324c?w=1200&q=80&sat=-40'],
    'https://www.instagram.com/chubbsvaultt/', NULL),
  ('33333333-3333-3333-3333-333333333333', 'Tampa Bay Card Show', 'October 4, 2026', '9:00 AM - 5:00 PM', 'Tampa Fairgrounds, Table 18',
    ARRAY['https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=1200&q=80'],
    'https://www.instagram.com/chubbsvaultt/', 'https://www.eventbrite.com/')
ON CONFLICT (id) DO NOTHING;

-- Site settings table - a single global config row (id = 1). Used for
-- site-wide switches such as the checkout kill switch below; add more
-- boolean/text columns here rather than creating a new table per switch.
CREATE TABLE IF NOT EXISTS site_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  checkouts_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO site_settings (id, checkouts_enabled)
VALUES (1, true)
ON CONFLICT (id) DO NOTHING;

-- Profiles table - one row per auth.users row, holds the admin flag.
-- The admin flag is never writable by the client (no INSERT/UPDATE policy
-- for regular users below), so it can only be granted by the site owner
-- running SQL directly in the Supabase dashboard (see bottom of this file).
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Auto-create a profile row (is_admin = false) whenever someone signs up,
-- so every authenticated user has exactly one profiles row to check against.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_set_id ON products(set_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- Enable Row Level Security (important for production)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE upcoming_shows ENABLE ROW LEVEL SECURITY;

-- Policies for products (public read, no write restrictions for MVP)
DROP POLICY IF EXISTS "Public can read products" ON products;
CREATE POLICY "Public can read products"
  ON products FOR SELECT USING (true);

-- Policies for reviews (public read, authenticated can create their own)
DROP POLICY IF EXISTS "Public can read reviews" ON reviews;
CREATE POLICY "Public can read reviews"
  ON reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create their own reviews" ON reviews;
CREATE POLICY "Users can create their own reviews"
  ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Profiles: a user can read (and only read) their own row. There is no
-- INSERT/UPDATE/DELETE policy here on purpose - granting admin access
-- must go through the Supabase dashboard/SQL editor with the service role,
-- never through the client, or any signed-up user could grant themselves
-- admin.
DROP POLICY IF EXISTS "Users can read their own profile" ON profiles;
CREATE POLICY "Users can read their own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

-- Site settings: everyone (including signed-out visitors) can read the
-- current config, since the cart page needs to know whether checkouts are
-- paused before anyone signs in. Only admins can change it.
DROP POLICY IF EXISTS "Public can read site settings" ON site_settings;
CREATE POLICY "Public can read site settings"
  ON site_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can update site settings" ON site_settings;
CREATE POLICY "Admins can update site settings"
  ON site_settings FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin));

-- Let the site push live updates (e.g. an admin flips the checkout switch)
-- to every open tab via Supabase Realtime, instead of customers needing to
-- refresh the page to see the new status.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'site_settings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE site_settings;
  END IF;
END $$;

-- Policies for events, sales, and inventory (admin dashboard tables).
-- Only users whose profiles.is_admin = true may read or write these -
-- being merely logged in is not enough.
DROP POLICY IF EXISTS "Allow all access to events" ON events;
DROP POLICY IF EXISTS "Authenticated users can manage events" ON events;
CREATE POLICY "Admins can manage events"
  ON events FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin));

DROP POLICY IF EXISTS "Allow all access to sales" ON sales;
DROP POLICY IF EXISTS "Authenticated users can manage sales" ON sales;
CREATE POLICY "Admins can manage sales"
  ON sales FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin));

DROP POLICY IF EXISTS "Allow all access to inventory" ON inventory;
DROP POLICY IF EXISTS "Authenticated users can manage inventory" ON inventory;
CREATE POLICY "Admins can manage inventory"
  ON inventory FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin));

-- Upcoming shows: unlike events/sales/inventory above, this data is shown
-- on the public "Where to find us" page, so everyone can read it. Only
-- admins can create, edit, or delete shows.
DROP POLICY IF EXISTS "Public can read upcoming shows" ON upcoming_shows;
CREATE POLICY "Public can read upcoming shows"
  ON upcoming_shows FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage upcoming shows" ON upcoming_shows;
CREATE POLICY "Admins can manage upcoming shows"
  ON upcoming_shows FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin));

-- Policies for cart (users can only access their own cart)
DROP POLICY IF EXISTS "Users can manage their cart" ON cart_items;
CREATE POLICY "Users can manage their cart" 
  ON cart_items FOR ALL USING (auth.uid() = user_id);

-- Policies for orders (users can only access their own orders)
DROP POLICY IF EXISTS "Users can view their orders" ON orders;
CREATE POLICY "Users can view their orders" 
  ON orders FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create their orders" ON orders;
CREATE POLICY "Users can create their orders" 
  ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policies for order items (users can view items from their orders)
DROP POLICY IF EXISTS "Users can view their order items" ON order_items;
CREATE POLICY "Users can view their order items" 
  ON order_items FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_items.order_id 
      AND orders.user_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "Users can create their order items" ON order_items;
CREATE POLICY "Users can create their order items" 
  ON order_items FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_items.order_id 
      AND orders.user_id = auth.uid()
    )
  );

-- Insert sample product (optional - for testing)
INSERT INTO products (name, set_name, price, stock_quantity, condition, description) 
VALUES (
  'Charizard EX Box',
  'Scarlet & Violet',
  49.99,
  5,
  'Sealed',
  'Factory sealed Charizard EX collection box from Scarlet & Violet expansion'
) ON CONFLICT DO NOTHING;

-- Verify tables were created
SELECT 'Setup complete! Tables created:' as status;
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('products', 'reviews', 'cart_items', 'orders', 'order_items', 'profiles');

-- ============================================================
-- HOW TO MAKE YOURSELF AN ADMIN
-- ============================================================
-- 1. Sign up for a normal account at /login on the site (this creates
--    an auth.users row and, via the trigger above, a profiles row with
--    is_admin = false).
-- 2. In the Supabase dashboard, open the SQL Editor (this runs as the
--    service role, which bypasses RLS, so it's the only place this
--    should ever be done) and run:
--
--      UPDATE profiles SET is_admin = true
--      WHERE id = (SELECT id FROM auth.users WHERE email = 'you@example.com');
--
-- 3. Sign out and back in on the site. The Sales/Inventory admin pages
--    are now visible and reachable for that account only.
-- Never expose an "is_admin" toggle in the app UI or API - it must only
-- ever be settable from the Supabase dashboard.
