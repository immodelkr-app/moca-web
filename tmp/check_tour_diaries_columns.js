
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zlbteyntcolscvsptxzf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsYnRleW50Y29sc2N2c3B0eHpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MDU5NzEsImV4cCI6MjA4NzA4MTk3MX0.V-_7vcM6-XaAtnmDn3gM5sejmNukB_gFaz-dgtg5GPQ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkColumns() {
    console.log('Fetching 1 row from tour_diaries to see columns...');
    const { data, error } = await supabase
        .from('tour_diaries')
        .select('*')
        .limit(1);

    if (error) {
        console.log('--- ERROR ---');
        console.log(JSON.stringify(error, null, 2));
    } else if (data.length > 0) {
        console.log('Columns:', Object.keys(data[0]));
        console.log('Sample Data:', data[0]);
    } else {
        console.log('No data found in tour_diaries.');
    }
}

checkColumns();
