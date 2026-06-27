// test_tables.js

async function run() {
  console.log("Fetching Supabase OpenAPI schema...");
  try {
    const res = await fetch("https://ibuqbiqpuaifajdhyath.supabase.co/rest/v1/", {
      headers: {
        "apikey": "sb_publishable_ZpNnAX9cRMUAd7MqJQG_ZQ_QJ134q2z"
      }
    });
    const schema = await res.json();
    console.log("Exposed definitions (tables):", Object.keys(schema.definitions || {}));
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
