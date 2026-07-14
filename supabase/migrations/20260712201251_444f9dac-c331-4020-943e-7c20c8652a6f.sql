-- Trigger functions: no direct execution needed by anyone
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- Role-check functions: only signed-in users (needed by RLS policies)
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated;

-- Public policies must not call is_admin (anon has no EXECUTE on it)
DROP POLICY "Anyone can view active projects" ON public.projects;
CREATE POLICY "Anyone can view active projects" ON public.projects FOR SELECT USING (status = 'active');
DROP POLICY "Anyone can view published lands" ON public.lands;
CREATE POLICY "Anyone can view published lands" ON public.lands FOR SELECT USING (status IN ('active','partially_sold','sold_out'));
-- Admin visibility of drafts is covered by the existing FOR ALL admin policies