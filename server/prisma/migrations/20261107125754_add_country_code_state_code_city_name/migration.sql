-- Add country_code, state_code, city_name columns to users table
-- These fields store ISO country codes, state/province codes, and city names
-- from the country-state-city geographical library, enabling database-independent
-- location selection for international customers.
ALTER TABLE users ADD COLUMN IF NOT EXISTS country_code VARCHAR(2);
ALTER TABLE users ADD COLUMN IF NOT EXISTS state_code VARCHAR(10);
ALTER TABLE users ADD COLUMN IF NOT EXISTS city_name VARCHAR(100);
