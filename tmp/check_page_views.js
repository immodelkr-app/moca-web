
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zlbteyntcolscvsptxzf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsYnRleW50Y29sc2N2c3B0eHpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MDU5NzEsImV4cCI6MjA4NzA4MTk3MX0.V-_7vcM6-XaAtnmDn3gM5sejmNukB_gFaz-dgtg5GPQ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTable() {
    console.log('Checking page_views table...');
    const { data, error } = await supabase
        .from('page_views')
        .select('*')
        .limit(1);

    if (error) {
        console.log('--- ERROR ---');
        console.log(JSON.stringify(error, null, 2));
    } else {
        console.log('Success fetching from page_views. Row count (limit 1):', data.length);
    }
}

checkTable();
