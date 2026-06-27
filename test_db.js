// test_db.js
const { createClient } = require("@supabase/supabase-js");

const url = "https://ibuqbiqpuaifajdhyath.supabase.co";
const key = "sb_publishable_ZpNnAX9cRMUAd7MqJQG_ZQ_QJ134q2z";

const supabase = createClient(url, key);

async function run() {
  console.log("Testing Supabase connection...");
  const { data, error } = await supabase.from("profiles").select("*").limit(1);
  if (error) {
    console.error("Error fetching profiles:", error);
  } else {
    console.log("Profiles fetch successful, data:", data);
  }
}

run();
