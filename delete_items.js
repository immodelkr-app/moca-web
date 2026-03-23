import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.production', 'utf-8');
const envVars = {};
envFile.split('\n').forEach(line => {
    const cleanLine = line.trim();
    if (!cleanLine || cleanLine.startsWith('#')) return;
    const match = cleanLine.match(/^([^=]+)="?(.*?)"?\s*$/);
    if (match) {
        envVars[match[1]] = match[2].replace(/\\r|\\n|\\/g, '').trim();
    }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteItems() {
    const { data: products } = await supabase.from('shop_products').select('id, title').order('created_at', { ascending: true });
    console.log('Current items:', products);

    if (products && products.length >= 4) {
        // 3번째, 4번째 아이템 삭제
        const idsToDelete = [products[2].id, products[3].id];
        const { error } = await supabase.from('shop_products').delete().in('id', idsToDelete);
        console.log('Delete result:', error || 'SUCCESS');
    }
}
deleteItems();
