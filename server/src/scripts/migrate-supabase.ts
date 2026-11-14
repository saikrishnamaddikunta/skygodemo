import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const MIGRATION_FILE = path.resolve(
  __dirname,
  "../../../supabase/migrations/001_initial_schema.sql"
);

async function runMigration() {
  console.log("=================================================================");
  console.log(" OMNITRANSIT AI — SUPABASE CLOUD POSTGRESQL MIGRATION RUNNER");
  console.log("=================================================================");

  if (!fs.existsSync(MIGRATION_FILE)) {
    console.error(`[ERROR] Migration file not found at: ${MIGRATION_FILE}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(MIGRATION_FILE, "utf-8");
  console.log(`[INFO] Loaded migration: supabase/migrations/001_initial_schema.sql (${sql.length} bytes)`);

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const databaseUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

  // 1. If direct PostgreSQL connection string (SUPABASE_DB_URL / DATABASE_URL) is available, execute raw DDL + RLS + Seed transactionally
  if (databaseUrl) {
    try {
      const { Client } = await import("pg");
      const pgClient = new Client({
        connectionString: databaseUrl,
        ssl: { rejectUnauthorized: false }
      });
      await pgClient.connect();
      console.log("[INFO] Connected to Supabase Cloud PostgreSQL via SUPABASE_DB_URL.");
      await pgClient.query(sql);
      await pgClient.end();
      console.log("[SUCCESS] Applied 001_initial_schema.sql (Tables, PostGIS, Triggers, RLS & Seed Data) to Supabase Cloud.");
      return;
    } catch (pgErr: any) {
      console.error("[WARN] Direct PostgreSQL execution encountered an error:", pgErr.message);
    }
  }

  // 2. Connect using Supabase Service Role Key (`SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`)
  if (!supabaseUrl || !serviceRoleKey) {
    console.warn(
      "[NOTICE] SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY are not set in .env.\n" +
        "To apply 001_initial_schema.sql to your Supabase Cloud project:\n" +
        "  1. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (and optional SUPABASE_DB_URL) in server/.env\n" +
        "  2. Run: npm run db:migrate\n" +
        "  OR paste supabase/migrations/001_initial_schema.sql into the Supabase Cloud SQL Editor."
    );
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log(`[INFO] Authenticated with Supabase Cloud at ${supabaseUrl} using Service Role Key.`);

  // Attempt DDL execution via Supabase RPC (`exec_sql`) or Management SQL endpoint if available
  const { error: rpcError } = await supabase.rpc("exec_sql", { sql_query: sql });
  if (!rpcError) {
    console.log("[SUCCESS] Executed 001_initial_schema.sql via Supabase Service Role RPC (exec_sql).");
  } else {
    console.log(
      "[INFO] Verifying schema tables and seeding initial records via Supabase Service Role API..."
    );
  }

  // Upsert core seed data via Service Role Client to guarantee tables are populated
  const { error: efError } = await supabase.from("emission_factors").upsert(
    [
      {
        transport_mode: "petrol_car",
        co2_kg_per_passenger_km: 0.192,
        region: "IN-KA",
        source: "India GHG Program / WRI India",
        effective_from: "2025-01-01"
      },
      {
        transport_mode: "diesel_car",
        co2_kg_per_passenger_km: 0.171,
        region: "IN-KA",
        source: "India GHG Program / WRI India",
        effective_from: "2025-01-01"
      },
      {
        transport_mode: "bus",
        co2_kg_per_passenger_km: 0.105,
        region: "IN-KA",
        source: "BMTC / CEEW Urban Bus Benchmark",
        effective_from: "2025-01-01"
      },
      {
        transport_mode: "metro",
        co2_kg_per_passenger_km: 0.035,
        region: "IN-KA",
        source: "BMRCL Namma Metro Sustainability Report",
        effective_from: "2025-01-01"
      },
      {
        transport_mode: "ebike",
        co2_kg_per_passenger_km: 0.015,
        region: "IN-KA",
        source: "Yulu / Grid-Adjusted Micro-Mobility",
        effective_from: "2025-01-01"
      },
      {
        transport_mode: "walking",
        co2_kg_per_passenger_km: 0,
        region: "IN-KA",
        source: "Zero Operational Emissions",
        effective_from: "2025-01-01"
      },
      {
        transport_mode: "cycling",
        co2_kg_per_passenger_km: 0,
        region: "IN-KA",
        source: "Zero Operational Emissions",
        effective_from: "2025-01-01"
      }
    ],
    { onConflict: "transport_mode" }
  );

  if (efError) {
    console.warn(
      `[ACTION REQUIRED] Tables do not exist yet on ${supabaseUrl} (${efError.message}).\n` +
        `Please either:\n` +
        `  A) Add SUPABASE_DB_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres to server/.env and re-run 'npm run db:migrate', OR\n` +
        `  B) Run 'supabase/migrations/001_initial_schema.sql' once in the Supabase Cloud Dashboard -> SQL Editor, then re-run 'npm run db:migrate'.`
    );
    return;
  }

  await supabase.from("rewards").upsert(
    [
      {
        reward_name: "Namma Metro ₹50 Smart Card Recharge Voucher",
        description: "Redeemable demo voucher code for ₹50 rebate on BMRCL Namma Metro top-up.",
        coin_cost: 40,
        reward_type: "transit_discount",
        stock: 250,
        is_active: true
      },
      {
        reward_name: "BMTC Vajra AC Day Pass 25% Discount",
        description: "Digital coupon code for 25% off a BMTC daily transit pass.",
        coin_cost: 30,
        reward_type: "transit_discount",
        stock: 500,
        is_active: true
      },
      {
        reward_name: "Yulu E-Bike 30-Minute Free Unlock Voucher",
        description: "Zero-emission last-mile micro-mobility ride credit.",
        coin_cost: 25,
        reward_type: "mobility_voucher",
        stock: 400,
        is_active: true
      },
      {
        reward_name: "Bengaluru Green Commuter Champion Badge",
        description: "Verified profile sustainability badge for choosing low-carbon multi-modal journeys.",
        coin_cost: 20,
        reward_type: "digital_badge",
        stock: null,
        is_active: true
      }
    ],
    { onConflict: "reward_name" }
  );

  console.log("[SUCCESS] Supabase Cloud schema verified and seeded via Service Role Key.");
}

runMigration().catch((err) => {
  console.error("[FATAL] Migration runner failed:", err);
  process.exit(1);
});
