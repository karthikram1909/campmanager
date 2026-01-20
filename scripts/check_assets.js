
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnv() {
    try {
        const envPath = path.resolve(__dirname, '../.env.local');
        const content = fs.readFileSync(envPath, 'utf8');
        content.split('\n').forEach(line => {
            const [key, value] = line.split('=');
            if (key && value) {
                process.env[key.trim()] = value.trim();
            }
        });
    } catch (e) {
        console.log('Could not load .env.local', e.message);
    }
}

loadEnv();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAssetSchema() {
    console.log('Checking assets table...');

    // Try to insert a dummy record to see what columns error out or select * limit 1
    const { data, error } = await supabase
        .from('assets')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error selecting from assets:', error);
    } else {
        console.log('Successfully selected from assets.');
        if (data.length > 0) {
            console.log('Existing columns based on data:', Object.keys(data[0]));
        } else {
            console.log('Table is empty, cannot infer columns from data.');
            // If empty, we effectively rely on the error message we got earlier or we can try to inspect definitions if we had admin access, 
            // but with anon key we can usually only do DML.
        }
    }
}

checkAssetSchema();
