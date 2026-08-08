const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data: ships } = await supabase.from('ships').select('*');
  console.log("SHIPS:");
  console.table(ships.map(x => ({id: x.id, name: x.name, route: x.route})));

  const { data: staff } = await supabase.from('staff').select('*');
  console.log("\nSTAFF:");
  console.table(staff.map(x => ({id: x.id, name: x.name, ship_id: x.ship_id, role: x.role})));

  const { data: bookings } = await supabase.from('bookings').select('*').eq('id_verification_status', 'pending');
  console.log("\nPENDING BOOKINGS:");
  console.table(bookings.map(x => ({id: x.id, ship_id: x.ship_id, name: x.passenger_name, status: x.status})));
}

check();
