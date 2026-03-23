const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://zlbteyntcolscvsptxzf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsYn…' // Need full anon key
);
