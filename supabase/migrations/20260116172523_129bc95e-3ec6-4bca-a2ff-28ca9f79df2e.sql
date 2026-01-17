-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily dynamic pricing update at 2 AM
SELECT cron.schedule(
  'update-dynamic-pricing-daily',
  '0 2 * * *',
  'SELECT public.update_all_dynamic_prices()'
);