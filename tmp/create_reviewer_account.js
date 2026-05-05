import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zlbteyntcolscvsptxzf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsYnRleW50Y29sc2N2c3B0eHpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MDU5NzEsImV4cCI6MjA4NzA4MTk3MX0.V-_7vcM6-XaAtnmDn3gM5sejmNukB_gFaz-dgtg5GPQ';
const supabase = createClient(supabaseUrl, supabaseKey);

async function createReviewerAccount() {
    console.log('Creating reviewer account...');
    
    // Check if exists first
    const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('nickname', 'immoca')
        .maybeSingle();
    
    if (existing) {
        console.log('User "immoca" already exists. Updating...');
        const { error } = await supabase
            .from('users')
            .update({
                password_hash: 'casyhy', // hash for immoca2026
                grade: 'GOLD',
                phone: '010-0000-0000',
                name: '심사위원',
                address: '서울시 강남구',
                referral_source: []
            })
            .eq('nickname', 'immoca');
        
        if (error) console.error('Update error:', error);
        else console.log('Update successful!');
    } else {
        console.log('User "immoca" does not exist. Inserting...');
        const { error } = await supabase
            .from('users')
            .insert([{
                nickname: 'immoca',
                password_hash: 'casyhy', // hash for immoca2026
                phone: '010-0000-0000',
                grade: 'GOLD',
                name: '심사위원',
                address: '서울시 강남구',
                referral_source: []
            }]);
        
        if (error) console.error('Insert error:', error);
        else console.log('Insert successful!');
    }
}

createReviewerAccount();
