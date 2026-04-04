-- Fix: Enable realtime on user_messages table for live inbox updates
-- The InboxPage uses supabase.channel() for realtime but the publication wasn't enabled

-- Enable realtime on the user_messages table
BEGIN;
  -- Add user_messages to the supabase_realtime publication
  ALTER PUBLICATION supabase_realtime ADD TABLE user_messages;
  
  -- Also add other tables that might need realtime
  ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS notifications;
  ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS vendor_announcements;
  ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS sales;
  ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS payout_requests;
COMMIT;

-- Verify the publication
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
