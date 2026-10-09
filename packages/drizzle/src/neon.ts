import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import type { Database } from "./index";
import * as schema from "./schema";

export function createNeonDatabase(connectionString: string): Database {
  return drizzle({ client: new Pool({ connectionString }), schema });
}
