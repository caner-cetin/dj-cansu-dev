import { Hono } from "hono";
import { cors } from "hono/cors";
import { basicAuth } from "hono/basic-auth";
import { v4 as uuidv4 } from "uuid";
import { sql } from "kysely";
import dayjs from "dayjs";
import { createDB, type Database } from "./db";
import type { Metadata, TrackResponse } from "./types";

export interface Bindings {
	DATABASE_URL: string;
	// @ts-ignore
	S3_BUCKET: S3Bucket;
	UPLOAD_ADMIN_USERNAME: string;
	UPLOAD_ADMIN_PASSWORD: string;
}
const app = new Hono<{ Bindings: Bindings }>();

// Middleware
const allowedOrigins = [
	/^https?:\/\/(?:.*\.)?cansu\.dev(?::\d+)?$/,
	/^https?:\/\/(?:.*\.)?localhost(?::\d+)?$/,
];

app.use(
	"*",
	cors({
		origin: ["https://cansu.dev", "http://localhost:5173"],
		allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
		allowHeaders: ["Content-Type"],
		exposeHeaders: ["Link"],
		maxAge: 30,
		credentials: false,
	}),
);

app.get("/", (c) => c.text("OK"));

app.get("/health", (c) => {
	return c.redirect("https://www.youtube.com/watch?v=NuXjeEC2XOA");
});

// Admin routes with basic auth
app.use("/admin/*", async (c, next) => {
	const auth = basicAuth({
		username: c.env.UPLOAD_ADMIN_USERNAME,
		password: c.env.UPLOAD_ADMIN_PASSWORD,
	});
	return auth(c, next);
});

app.post("/admin/albums/upload", async (c) => {
	const db = createDB(c);
	const body = (await c.req.json()) as {
		metadata: Metadata;
		key: string;
		tempo: number;
		length: number;
		instrumentalFolderPath: string;
		instrumental: false;
		vocalFolderPath: string;
		waveform: number[];
		vocalWaveform: number[];
	}[];

	const results = [];
	for (const trackData of body) {
		// Find or create album
		const albumName = trackData.metadata.Album;
		if (albumName === undefined) {
			return c.json(
				{ error: `Album name not found for metadata ${trackData.metadata}` },
				400,
			);
		}
		let album = await db
			.selectFrom("albums")
			.where("name", "=", albumName)
			.selectAll()
			.executeTakeFirst();

		if (!album) {
			const newAlbum = {
				id: uuidv4(),
				name: albumName,
				cover_extension: "",
			};

			await db.insertInto("albums").values(newAlbum).execute();

			album = newAlbum;
		}

		// Create track
		const track = {
			id: uuidv4(),
			album_id: album.id,
			info: trackData.metadata,
			key: trackData.key,
			tempo: trackData.tempo,
			instrumental: trackData.instrumental,
			instrumental_folder_path: trackData.instrumentalFolderPath,
			vocal_folder_path: trackData.vocalFolderPath,
			instrumental_waveform: trackData.waveform,
			vocal_waveform: trackData.vocalWaveform,
			total_duration: trackData.length,
		};

		await db.insertInto("tracks").values(track).execute();

		results.push(track);
	}

	return c.json(results, 201);
});

app.post("/track/random", async (c) => {
	const db = createDB(c);
	const { anonId } = await c.req.json();

	const track =
		(await db
			.selectFrom("tracks as t")
			.leftJoin("albums as a", "a.id", "t.album_id")
			.leftJoin("listening_histories as lh", (join) =>
				join.onRef("t.id", "=", "lh.track_id").on("lh.anon_id", "=", anonId),
			)
			.where("lh.track_id", "is", null)
			.selectAll(["t"])
			.orderBy(sql<string>`RANDOM()`)
			.limit(1)
			.executeTakeFirst()) ??
		(await db.transaction().execute(async (trx) => {
			await trx
				.deleteFrom("listening_histories")
				.where("anon_id", "=", anonId)
				.execute();

			return await trx
				.selectFrom("tracks as t")
				.leftJoin("albums as a", "a.id", "t.album_id")
				.selectAll(["t"])
				.orderBy(sql<string>`RANDOM()`)
				.limit(1)
				.executeTakeFirst();
		}));
	// If no unlistened tracks, clear history and get random track
	if (track === undefined) {
		if (!track) {
			return c.json({ error: "No tracks found" }, 400);
		}
	}

	if (track.id === null) {
		return c.json({ error: "Malformed track data, no ID found" }, 500);
	}

	// Get album info
	const album = await db
		.selectFrom("albums")
		.where("id", "=", track.album_id)
		.selectAll()
		.executeTakeFirst();

	if (!album) {
		return c.json({ error: "Album not found" }, 500);
	}

	// Record listening history
	await db
		.insertInto("listening_histories")
		.values({
			track_id: track.album_id,
			anon_id: anonId,
			listened_at: dayjs().format(),
		})
		.execute();

	return c.json(processTrackInfo(track, album));
});

app.get("/track/:trackId", async (c) => {
	const db = createDB(c);
	const trackId = c.req.param("trackId");

	const track = await db
		.selectFrom("tracks")
		.where("id", "=", trackId)
		.selectAll()
		.executeTakeFirst();

	if (!track) {
		return c.json({ error: "Track not found" }, 404);
	}

	const album = await db
		.selectFrom("albums")
		.where("id", "=", track.album_id)
		.selectAll()
		.executeTakeFirst();

	if (!album) {
		return c.json({ error: "Album not found" }, 500);
	}

	return c.json(processTrackInfo(track, album));
});

function processTrackInfo(
	track: Database["tracks"] | (Database["tracks"] & Database["albums"]),
	album: Database["albums"],
): TrackResponse {
	const info = track.info;

	const vocalWaveform = track.instrumental ? null : track.vocal_waveform;
	const vocalFolderPath = track.instrumental ? "" : track.vocal_folder_path;

	return {
		id: track.id,
		cover: `${album.name}/cover.jpg`,
		info: {
			title: info.Title,
			artist: info.Artist,
			album: info.Album,
			length: track.total_duration,
			genre: info.Genre,
			vocal_waveform: vocalWaveform,
			instrumental_waveform: track.instrumental_waveform,
			tempo: track.tempo,
			instrumental: track.instrumental,
			key: track.key,
		},
		saved_album_name: album.name,
		cover_extension: album.cover_extension,
		saved_vocal_folder_path: vocalFolderPath,
		saved_instrumental_folder_path: track.instrumental_folder_path,
	};
}
export default app;
