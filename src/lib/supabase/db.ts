//db.ts is basically used to define the migration folder where it will migrate to get client data

import {drizzle} from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as dotenv from 'dotenv';
import * as schema from './schema';
import { dot } from 'node:test/reporters';
import { migrate } from 'drizzle-orm/node-postgres/migrator';


dotenv.config({path:'.env'});

if(!process.env.DATABASE_URL){
    console.error("DATABASE_URL is not set in environment variables");
}

const client = postgres(process.env.DATABASE_URL as string ,{max:1});
const db = drizzle(client,{schema});
const migrateDb=async ()=>{
    try{
        console.log("Migrating client");
        await  migrate(db ,{migrationsFolder:'migrations'});
        console.log("Migration complete");
    }catch{
        console.error("Migration failed");
    }
};

migrateDb();
export default db;