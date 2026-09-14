CREATE OR REPLACE FUNCTION public.stamp_admin_review_edit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  actor uuid := auth.uid();
  actor_role public.user_role;
BEGIN
  IF OLD.rating IS DISTINCT FROM NEW.rating OR OLD.comment IS DISTINCT FROM NEW.comment THEN
    SELECT role INTO actor_role FROM public.profiles WHERE id = actor;
    IF actor_role = 'admin'::public.user_role THEN
      NEW.edited_at := now();
      NEW.edited_by := actor;
      INSERT INTO public.business_review_audit_log(review_id, actor_id, action, note)
      VALUES (NEW.id, actor, 'admin_edit', 'Avaliação editada por administrador.');
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
