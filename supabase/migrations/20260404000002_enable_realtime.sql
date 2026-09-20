-- Fix: Enable realtime on user_messages table for live inbox updates
-- The InboxPage uses supabase.channel() for realtime but the publication wasn't enabled

-- Add tables to the supabase_realtime publication.
-- NOTE: Postgres has no ADD TABLE IF NOT EXISTS; skip tables already in the
-- publication (SQLSTATE 42710 duplicate_object) instead of failing.
BEGIN;
DO $pub$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['user_messages', 'notifications', 'vendor_announcements', 'sales', 'payout_requests'] LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    EXCEPTION WHEN duplicate_object THEN
      NULL; -- already a publication member
    WHEN undefined_object THEN
      NULL; -- table does not exist at this point
    END;
  END LOOP;
END;
$pub$;
COMMIT;

-- Verify the publication
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
