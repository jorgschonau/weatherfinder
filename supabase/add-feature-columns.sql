-- Add GeoNames feature columns to places table
ALTER TABLE places
  ADD COLUMN IF NOT EXISTS feature_class TEXT,
  ADD COLUMN IF NOT EXISTS feature_code TEXT;

-- Create indexes for filtering
CREATE INDEX IF NOT EXISTS places_feature_class_idx ON places(feature_class);
CREATE INDEX IF NOT EXISTS places_feature_code_idx ON places(feature_code);
