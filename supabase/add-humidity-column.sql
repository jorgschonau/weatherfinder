-- Add humidity column to weather_forecast table
ALTER TABLE weather_forecast ADD COLUMN IF NOT EXISTS humidity SMALLINT;

-- Comment for documentation
COMMENT ON COLUMN weather_forecast.humidity IS 'Relative humidity in percent (0-100)';
