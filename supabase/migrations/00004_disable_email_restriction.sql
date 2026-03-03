-- Temporarily disable @ohsu.edu email restriction for testing
-- To re-enable, restore the email check in handle_new_user()

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  -- Email domain restriction temporarily disabled for testing
  -- if new.email not like '%@ohsu.edu' then
  --   raise exception 'Only @ohsu.edu email addresses are allowed';
  -- end if;

  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    new.id,
    new.email,
    split_part(new.email, '@', 1)
  );
  RETURN new;
END;
$$;
