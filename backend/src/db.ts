import { type ColumnType, Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";
import type { Metadata } from "./types";
import type { Context } from "hono";
import type { Bindings } from ".";
export interface Database {
	albums: {
		id: string;
		name: string;
		cover_extension: string;
	};
	tracks: {
		id: string;
		vocal_folder_path: string | null;
		instrumental_folder_path: string;
		album_id: string;
		total_duration: number;
		vocal_waveform: number[];
		instrumental_waveform: number[];
		info: Metadata;
		instrumental: boolean;
		tempo: number;
		key: string;
	};
	listening_histories: {
		track_id: string;
		anon_id: string;
		listened_at: ColumnType<Date, string, string>;
	};
}
export function createDB(c: Context<{ Bindings: Bindings }>) {
	return new Kysely<Database>({
		dialect: new PostgresDialect({
			pool: new Pool({
				connectionString: c.env.DATABASE_URL,
			}),
		}),
	}).withSchema("dj");
}
