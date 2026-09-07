-- ============================================================================
-- REVIEW DELETE — make admin evaluation deletion actually persist.
--
-- The reviews table is locked down by RLS (select/insert only, no delete
-- policy), so `delete from public.reviews` via the anon key silently deletes
-- 0 rows. That's why a deleted evaluation reappears when the dashboard
-- refetches. Follows the same SECURITY DEFINER idiom as staff_delete.
-- ============================================================================

create or replace function public.review_delete(p_id uuid)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted int;
begin
  delete from public.reviews where id = p_id;
  get diagnostics deleted = row_count;
  return deleted;
end;
$$;

grant execute on function public.review_delete(uuid) to anon, authenticated;