import { useEffect } from "react";
import type { CurrentlyPlaying } from "../hooks/useTrackPlayer";

export interface TrackInfoProps {
	currentTrack?: CurrentlyPlaying;
}

export const TrackInfo: React.FC<TrackInfoProps> = ({ currentTrack }) => {
	return (
		<>
			<img
				src={`${import.meta.env.VITE_STATIC_URL}/${currentTrack?.track.cover}`}
				alt={currentTrack?.track.info.title || ""}
				className="rounded-lg w-64 h-64 mb-4"
			/>
			<div className="title-container flex justify-center">
				<div className="text-2xl font-bold content-center">
					{currentTrack?.track.info.title || ""}
				</div>
			</div>
			<p className="text-sm">{currentTrack?.track.info.artist || ""}</p>
			<p className="text-sm">{currentTrack?.track.info.album || ""}</p>
			<p className="text-sm">{currentTrack?.track.info.genre || ""}</p>
		</>
	);
};
