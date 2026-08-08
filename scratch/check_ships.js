
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://osgbtvwcplxnrjxzhtbx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zZ2J0dndjcGx4bnJqeHpodGJ4Iiwicm9sZSI6ImFub24pLCJpYXQiOjE3NzE2NzE5OTAsImV4cCI6MjA4NzI0Nzk5MH0.4kuaBLV8EFi0P8lZMmSdUOQhdzaUci5dHsFYRDX-YiE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkShips() {
  const { data: ships, error } = await supabase.from('ships').select('id, name, route');
  if (error) {
    console.error('Error fetching ships:', error);
    return;
  }
  console.log('Ships in DB:');
  console.table(ships);
}

checkShips();
