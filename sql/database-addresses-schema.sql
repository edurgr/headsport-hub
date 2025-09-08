-- Create addresses table for multiple addresses per user
CREATE TABLE IF NOT EXISTS addresses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  address_line1 VARCHAR(200) NOT NULL,
  address_line2 VARCHAR(200),
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  postal_code VARCHAR(20) NOT NULL,
  country VARCHAR(50) NOT NULL DEFAULT 'Austria',
  phone VARCHAR(20),
  is_preferred BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_addresses_preferred ON addresses(user_id, is_preferred);

-- Enable RLS
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own addresses" ON addresses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own addresses" ON addresses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own addresses" ON addresses
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own addresses" ON addresses
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to ensure only one preferred address per user
CREATE OR REPLACE FUNCTION ensure_single_preferred_address()
RETURNS TRIGGER AS $$
BEGIN
  -- If setting an address as preferred, unset all other preferred addresses for this user
  IF NEW.is_preferred = TRUE THEN
    UPDATE addresses 
    SET is_preferred = FALSE 
    WHERE user_id = NEW.user_id AND id != NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce single preferred address
CREATE TRIGGER trigger_ensure_single_preferred_address
  BEFORE INSERT OR UPDATE ON addresses
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_preferred_address();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER trigger_addresses_updated_at
  BEFORE UPDATE ON addresses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Migrate existing profile addresses to new addresses table
INSERT INTO addresses (user_id, name, address_line1, city, state, postal_code, country, phone, is_preferred)
SELECT 
  id as user_id,
  'Home' as name,
  COALESCE(address, '') as address_line1,
  COALESCE(city, '') as city,
  COALESCE(state, '') as state,
  COALESCE(postal_code, '') as postal_code,
  CASE 
    WHEN country IS NULL OR country = '' THEN 'Austria'
    WHEN LENGTH(country) > 50 THEN LEFT(country, 50)
    ELSE country
  END as country,
  phone,
  TRUE as is_preferred
FROM profiles 
WHERE address IS NOT NULL 
  AND address != '' 
  AND city IS NOT NULL 
  AND city != ''
  AND state IS NOT NULL 
  AND state != ''
  AND postal_code IS NOT NULL 
  AND postal_code != '';

-- Add comment
COMMENT ON TABLE addresses IS 'Multiple addresses per user for shipping orders';
