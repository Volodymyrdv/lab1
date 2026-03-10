import { promises as fs } from 'fs';
import { supabase } from '../lib/supabase';

async function migrate() {
  try {
    const data = await fs.readFile('data/votes.json', 'utf8');
    const votes = JSON.parse(data) as Record<string, number>;
    const rows = Object.entries(votes).map(([movie, count]) => ({ movie, count }));
    if (rows.length > 0) {
      const { error } = await supabase.from('votes').upsert(rows, { onConflict: 'movie' });
      if (error) throw error;
      console.log('Migration complete');
    } else {
      console.log('No votes to migrate');
    }
  } catch (e) {
    console.error('Migration failed:', e);
  }
}

migrate();
