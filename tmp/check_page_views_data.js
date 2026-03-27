
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zlbteyntcolscvsptxzf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsYnRleW50Y29sc2N2c3B0eHpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MDU5NzEsImV4cCI6MjA4NzA4MTk3MX0.V-_7vcM6-XaAtnmDn3gM5sejmNukB_gFaz-dgtg5GPQ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkData() {
    console.log('Fetching latest 10 page_views...');
    const { data, error } = await supabase
        .from('page_views')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.log('--- ERROR ---');
        console.log(JSON.stringify(error, null, 2));
    } else {
        console.log('Success. Found', data.length, 'rows.');
        data.forEach(row => {
            console.log(`Path: ${row.path}, CreatedAt: ${row.created_at}`);
        });
    }
}

checkData();
