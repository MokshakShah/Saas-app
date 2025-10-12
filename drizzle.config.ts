// import type {Config} from 'drizzle-kit';
// import * as dotenv from 'dotenv';
// import { log } from 'console';
// dotenv.config({path:'.env'});

// if(!process.env.DATABASE_URL){
//     console.error("DATABASE_URL is not set in environment variables");
// }

// export default{
//     schema:'./src/lib/supabase/schema.ts',
//     out:'./migrations',
//     driver:'pg-node',
//     dialect:'postgresql',
//     dbCredentials:{
//         connectionString:process.env.DATABASE_URL||'',
//     },
// }satisfies Config;


import type { Config } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL is not set in environment variables");
  process.exit(1);
}

export default {
  dialect: "postgresql",
  schema: "./src/lib/supabase/schema.ts",
  out: "./migrations", // folder for migrations
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  introspect: {
    skipCheckConstraints: true, 
  },
  verbose: true,
  strict: true,
} satisfies Config;
