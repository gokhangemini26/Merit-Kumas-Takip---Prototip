-- MIGRATION: FIX ORDER DELETION CONSTRAINTS
-- Run this in your Supabase SQL Editor to fix the foreign key constraint errors.

-- 1. Fix delivery_items reference to order_items
-- This allows deleting an order/order_item while keeping the delivery record (sets reference to NULL)
ALTER TABLE delivery_items 
DROP CONSTRAINT IF EXISTS delivery_items_order_item_id_fkey,
ADD CONSTRAINT delivery_items_order_item_id_fkey 
FOREIGN KEY (order_item_id) 
REFERENCES order_items(id) 
ON DELETE SET NULL;

-- 2. Fix payments reference to orders
-- This automatically deletes associated payments when an order is deleted
ALTER TABLE payments 
DROP CONSTRAINT IF EXISTS payments_order_id_fkey,
ADD CONSTRAINT payments_order_id_fkey 
FOREIGN KEY (order_id) 
REFERENCES orders(id) 
ON DELETE CASCADE;
