import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zlbteyntcolscvsptxzf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsYnRleW50Y29sc2N2c3B0eHpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MDU5NzEsImV4cCI6MjA4NzA4MTk3MX0.V-_7vcM6-XaAtnmDn3gM5sejmNukB_gFaz-dgtg5GPQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTestUser() {
    const { data, error } = await supabase
        .from('users')
        .select('nickname, password_hash, phone')
        .eq('nickname', 'test_immoca')
        .maybeSingle();
    
    if (error) {
        console.error('Error fetching test user:', error);
        return;
    }
    
    console.log('Test User Details:');
    console.log(data);
}

checkTestUser();
