
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
  console.log('URL:', supabaseUrl);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectRooms() {
  console.log('Inspecting rooms...');

  // Get 'nss' or 'Sajja' camps
  const { data: camps, error: campError } = await supabase
    .from('camps')
    .select('id, name');

  if (campError) {
    console.error('Error fetching camps:', campError);
    return;
  }

  console.log('Camps:', camps.map(c => `${c.name} (${c.id})`));

  for (const camp of camps) {
    if (!['nss', 'Sajja Camp'].some(name => camp.name.includes(name) || camp.name === 'nss')) continue;

    console.log(`\nChecking rooms for camp: ${camp.name}`);

    // get floors
    const { data: floors } = await supabase.from('floors').select('id').eq('camp_id', camp.id);
    if (!floors || floors.length === 0) {
      console.log('No floors found.');
      continue;
    }
    const floorIds = floors.map(f => f.id);

    // Get all rooms for stats
    const { data: rooms, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .in('floor_id', floorIds);

    if (roomError) {
      console.error('Error fetching rooms:', roomError);
      continue;
    }

    console.log(`Found ${rooms.length} rooms.`);

    // Stats
    const typeCounts = {};
    const nullType = rooms.filter(r => !r.occupant_type);

    rooms.forEach(r => {
      const type = r.occupant_type || 'NULL';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    console.log('Occupant Types:', typeCounts);

    if (nullType.length > 0) {
      console.log('WARNING: Found rooms with NULL occupant_type! These trigger strict matching issues.');

      // Update them to 'technician_only' or 'mixed' to fix
      // We will just report primarily.
      // Un-comment below to fix
      /*
      const { error: updateError } = await supabase
          .from('rooms')
          .update({ occupant_type: 'mixed' })
          .in('id', nullType.map(r => r.id));
          
      if (updateError) console.error('Error auto-fixing rooms:', updateError);
      else console.log('Fixed NULL occupant_type rooms to user "mixed".');
      */
    }
  }
}

inspectRooms();
