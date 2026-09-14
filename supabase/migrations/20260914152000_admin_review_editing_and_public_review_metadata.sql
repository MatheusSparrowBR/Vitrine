ALTER TABLE public.business_reviews
  ADD COLUMN IF NOT EXISTS edited_at timestamptz,
  ADD COLUMN IF NOT EXISTS edited_by uuid REFERENCES public.profiles(id);

CREATE INDEX IF NOT EXISTS idx_business_reviews_edited_by
  ON public.business_reviews(edited_by)
  WHERE edited_by IS NOT NULL;

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

DROP TRIGGER IF EXISTS trg_stamp_admin_review_edit ON public.business_reviews;
CREATE TRIGGER trg_stamp_admin_review_edit
BEFORE UPDATE ON public.business_reviews
FOR EACH ROW
EXECUTE FUNCTION public.stamp_admin_review_edit();

DROP FUNCTION IF EXISTS public.get_public_business_reviews(uuid, integer);
CREATE FUNCTION public.get_public_business_reviews(p_business_id uuid, p_limit integer DEFAULT 50)
RETURNS TABLE(
  id uuid,
  business_id uuid,
  reviewer_name text,
  rating smallint,
  comment text,
  owner_response text,
  owner_response_at timestamptz,
  created_at timestamptz,
  is_mine boolean,
  edited_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT r.id,r.business_id,r.reviewer_name,r.rating,r.comment,resp.note,resp.created_at,r.created_at,(r.user_id=auth.uid()),r.edited_at
  FROM public.business_reviews r
  JOIN public.businesses b ON b.id=r.business_id
  LEFT JOIN LATERAL (
    SELECT a.note,a.created_at FROM public.business_review_audit_log a
    WHERE a.review_id=r.id AND a.action='response'
    ORDER BY a.created_at DESC LIMIT 1
  ) resp ON true
  LEFT JOIN LATERAL (
    SELECT a.action FROM public.business_review_audit_log a
    WHERE a.review_id=r.id AND a.action IN('published','hidden')
    ORDER BY a.created_at DESC LIMIT 1
  ) mod ON true
  WHERE r.business_id=p_business_id AND b.status='active' AND coalesce(mod.action,'published')='published'
  ORDER BY r.created_at DESC
  LIMIT greatest(1,least(coalesce(p_limit,50),100));
$$;

GRANT EXECUTE ON FUNCTION public.get_public_business_reviews(uuid, integer) TO anon, authenticated;
