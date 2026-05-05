import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
    console.log('Testing Supabase connection...');
    const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true });
    
    if (error) {
        console.error('Connection failed:', error.message);
        if (error.message.includes('Unauthorized')) {
            console.error('Hint: The ANON_KEY might be invalid or expired.');
        }
    } else {
        console.log('Connection successful! User count:', data);
    }
}

testConnection();
