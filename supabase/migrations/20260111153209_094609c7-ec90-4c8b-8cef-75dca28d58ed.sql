CREATE OR REPLACE FUNCTION public.generate_certificate_number()
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  prefix TEXT := 'LERN';
  year_part TEXT;
  random_part TEXT;
BEGIN
  year_part := to_char(NOW(), 'YY');
  random_part := upper(substr(md5(random()::text), 1, 8));
  RETURN prefix || '-' || year_part || '-' || random_part;
END;
$$;