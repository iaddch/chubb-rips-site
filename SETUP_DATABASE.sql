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

-- Policies for products (public read, no write restrictions for MVP)
DROP POLICY IF EXISTS "Public can read products" ON products;
CREATE POLICY "Public can read products" 
  ON products FOR SELECT USING (true);

-- Policies for reviews (public read, authenticated can create)
DROP POLICY IF EXISTS "Public can read reviews" ON reviews;
CREATE POLICY "Public can read reviews" 
  ON reviews FOR SELECT USING (true);

-- Policies for events and sales (permissive for the demo/admin dashboard)
DROP POLICY IF EXISTS "Allow all access to events" ON events;
CREATE POLICY "Allow all access to events"
  ON events FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to sales" ON sales;
CREATE POLICY "Allow all access to sales"
  ON sales FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to inventory" ON inventory;
CREATE POLICY "Allow all access to inventory"
  ON inventory FOR ALL USING (true) WITH CHECK (true);

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
AND table_name IN ('products', 'reviews', 'cart_items', 'orders', 'order_items');
