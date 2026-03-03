import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://taufkvruaufxizlqvrrz.supabase.co',
  'sb_secret_Ha_3Qc1X6KZXCyS438IJJA_Sxx72NXa',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const { data: all } = await supabase.from('sessions').select('id, topic, tissue');

const toDelete = all.filter(s => {
  const t = (s.tissue || '').trim().toLowerCase();
  return !t || t === 'no tissue' || t === 'n/a' || t === 'n/a - sawbones';
});

console.log('Sessions to delete:', toDelete.length);
console.log('Samples being deleted:', toDelete.slice(0, 8).map(s => s.topic));

const kept = all.filter(s => !toDelete.find(d => d.id === s.id));
console.log('Sessions being kept:', kept.length);

const ids = toDelete.map(s => s.id);
if (ids.length > 0) {
  const { error } = await supabase.from('sessions').delete().in('id', ids);
  if (error) console.log('Error:', error.message);
  else console.log('Deleted', ids.length, 'sessions');
}
