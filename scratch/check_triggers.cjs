const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, "..", ".env");
const envContent = fs.readFileSync(envPath, "utf8");
const urlMatch = envContent.match(/VITE_SUPABASE_URL\s*=\s*(.*)/);
const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY\s*=\s*(.*)/);

const supabaseUrl = urlMatch ? urlMatch[1].trim() : "";
const supabaseKey = keyMatch ? keyMatch[1].trim() : "";

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSSMaria() {
  try {
    const { data, error } = await supabase
      .from("bookings")
      .select("id, passenger_name, passenger_type, id_verification_status, is_id_verified, trip_date")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (error) throw error;
    console.log("Pending Bookings:", data);
  } catch (err) {
    console.error(err);
  }
}

checkSSMaria();
