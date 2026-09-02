-- Grant the service-role client access to write documents.
--
-- Supabase does not grant service_role table privileges automatically, and the
-- original documents migration only granted them to `authenticated`. After
-- moving server-side document writes to the service-role client, this grant is
-- required for those routes to work. The statement is idempotent, so it is safe
-- to apply to a database where migration 202609020001 was already run.
grant select, insert, update, delete on public.documents to service_role;
