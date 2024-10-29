import { api } from "../services/api";

export interface Album {
	id: string;
	name: string;
	cover_extension: string;
}

export interface Track {
	id: string;
	cover: string;
	info: {
		title: string;
		artist: string;
		album: string;
		length: number;
		genre: string;
		vocal_waveform?: number[];
		instrumental_waveform: number[];
		tempo: number;
		instrumental: boolean;
		key: string;
	};
	savedAlbumName: string;
	coverExtension: string;
	saved_vocal_folder_path: string;
	saved_instrumental_folder_path: string;
}
export const useTrack = async (trackId: string) => {
	return await api.get<Track>(`/track/${trackId}`);
};

export const useRandomTrack = async (anonId: string) => {
	return await api.post<Track>("/track/random", {
		anonId,
	});
};
