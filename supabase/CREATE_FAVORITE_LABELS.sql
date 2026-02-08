-- Create favorite_labels table for pinning frequently used labels
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS favorite_labels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_id, user_id)
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_favorite_labels_product_id ON favorite_labels(product_id);
CREATE INDEX IF NOT EXISTS idx_favorite_labels_user_id ON favorite_labels(user_id);

-- Enable RLS
ALTER TABLE favorite_labels ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own favorites" 
  ON favorite_labels FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own favorites" 
  ON favorite_labels FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites" 
  ON favorite_labels FOR DELETE 
  USING (auth.uid() = user_id);

COMMENT ON TABLE favorite_labels IS 'Stores user favorite/pinned labels for quick access';
COMMENT ON COLUMN favorite_labels.product_id IS 'Reference to the product';
COMMENT ON COLUMN favorite_labels.user_id IS 'User who favorited this label';
