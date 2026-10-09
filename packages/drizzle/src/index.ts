import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

export { schema };
export * from "./schema";

/** Any Postgres-backed Drizzle database carrying this schema (Neon, PGlite, …). */
export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;
