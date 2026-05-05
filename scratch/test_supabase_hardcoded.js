import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zlbteyntcolscvsptxzf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsYnRleW50Y29sc2N2c3B0eHpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MDU5NzEsImV4cCI6MjA4NzA4MTk3MX0.V-_7vcM6-XaAtnmDn3gM5sejmNukB_gFaz-dgtg5GPQ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
    try {
        console.log('Fetching users count...');
        const { data, error, status } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true });
        
        if (error) {
            console.error('Error:', error.message);
            console.error('Status:', status);
        } else {
            console.log('Success! Count:', data);
        }
    } catch (e) {
        console.error('Exception:', e.message);
    }
}

test();
