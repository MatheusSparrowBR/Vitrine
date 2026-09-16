-- RLS policies execute helper functions as the calling database role.
-- Keep the helper itself in the private schema, but grant EXECUTE to the roles
-- that need it during RLS evaluation. The private schema is not part of the
-- public PostgREST surface, so this does not make the helper an exposed RPC.
GRANT EXECUTE ON FUNCTION private.is_admin() TO anon, authenticated;
