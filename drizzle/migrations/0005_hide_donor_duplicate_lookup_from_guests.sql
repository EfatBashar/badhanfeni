DROP FUNCTION public.register_public_donor(text, text, text, text);
CREATE FUNCTION public.register_public_donor(_name text, _phone text, _blood_group text, _gender text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF char_length(trim(_name)) < 2 OR char_length(trim(_name)) > 100
     OR _phone !~ '^01[3-9][0-9]{8}$'
     OR _blood_group NOT IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')
     OR _gender NOT IN ('male', 'female') THEN
    RAISE EXCEPTION 'Invalid donor registration details';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(_phone, 0));

  INSERT INTO public.donors (name, phone, blood_group, gender, total_donations)
  SELECT trim(_name), _phone, _blood_group, _gender, 0
  WHERE NOT EXISTS (SELECT 1 FROM public.donors WHERE phone = _phone);
END;
$$;
REVOKE ALL ON FUNCTION public.register_public_donor(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_public_donor(text, text, text, text) TO anon, authenticated;