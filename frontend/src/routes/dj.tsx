// AudioPlayer.tsx
import { useEffect, useRef, useState } from "react";
import { type CurrentlyPlaying, useTrackPlayer } from "../hooks/useTrackPlayer";
import { createFileRoute } from "@tanstack/react-router";
import { Footer } from "../components/Footer";
import { TrackInfo } from "../components/TrackInfo";
import { PlaybackControl } from "../components/PlaybackControl";
import { VolumeControl } from "../components/VolumeControl";
import type { AudioSynchronizer } from "../utils/AudioSynchronizer";

export const Route = createFileRoute("/dj")({
  component: AudioPlayer,
});

export default function AudioPlayer() {
  // Refs for audio elements and waveform containers
  const playing = useRef<CurrentlyPlaying | undefined>(undefined);
  const vocalPlayerRef = useRef<HTMLAudioElement>(null);
  const instrumentalPlayerRef = useRef<HTMLAudioElement>(null);
  const vocalSeekAreaRef = useRef<HTMLDivElement>(null);
  const instrumentalSeekAreaRef = useRef<HTMLDivElement>(null);
  const [_, setAudioSynchronizer] = useState<AudioSynchronizer | null>(null);
  // State
  const [currentTime, setCurrentTime] = useState("0:00");
  const [isPaused, setIsPaused] = useState(true);
  const [isMuted, setIsMuted] = useState(false);

  const loadTrack = useTrackPlayer();

  const playRandom = async () => {
    if (
      !vocalPlayerRef.current ||
      !instrumentalPlayerRef.current ||
      !vocalSeekAreaRef.current ||
      !instrumentalSeekAreaRef.current
    )
      return;

    // Reset the current playback state
    setIsPaused(true);
    vocalPlayerRef.current.pause();
    instrumentalPlayerRef.current.pause();

    try {
      loadTrack({
        playingRef: playing,
        vocalPlayer: vocalPlayerRef.current,
        instrumentalPlayer: instrumentalPlayerRef.current,
        vocalSeekArea: vocalSeekAreaRef.current,
        instrumentalSeekArea: instrumentalSeekAreaRef.current,
        setAudioSynchronizer,
      });
      if (vocalPlayerRef.current && instrumentalPlayerRef.current) {
        await Promise.all([
          vocalPlayerRef.current.play(),
          instrumentalPlayerRef.current.play(),
        ]).then(() => {
          setIsPaused(false);
        });
      }
    } catch (error) {
      console.error("Error loading track:", error);
    }
  };

  // Handle time update
  useEffect(() => {
    const handleTimeUpdate = () => {
      if (instrumentalPlayerRef.current) {
        const time = instrumentalPlayerRef.current.currentTime;
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        setCurrentTime(`${minutes}:${seconds.toString().padStart(2, "0")}`);
      }
    };

    instrumentalPlayerRef.current?.addEventListener(
      "timeupdate",
      handleTimeUpdate,
    );
    return () => {
      instrumentalPlayerRef.current?.removeEventListener(
        "timeupdate",
        handleTimeUpdate,
      );
    };
  }, []);
  return (
    <div className="bg-black text-white flex flex-col min-h-screen">
      <main className="flex-grow overflow-hidden">
        <div
          id="backgroundBlur"
          style={{
            backgroundImage: playing.current?.track.cover
              ? `url(${import.meta.env.VITE_STATIC_URL}/${playing.current.track.cover})`
              : undefined,
          }}
        />

        <div className="container mx-auto px-2 py-4">
          <div className="flex justify-between items-center mb-4 relative">
            <div className="text-2xl opacity-90">{currentTime}</div>
            <div className="text-center z-10">
              <button
                type="button"
                className="px-4 py-2 text-lg"
                onClick={() => playRandom()}
              >
                {playing.current ? "Loading..." : "Play Random Track"}
              </button>
            </div>
            <div className="text-2xl opacity-50">
              {playing.current?.track.info.length
                ? `${Math.floor(playing.current.track.info.length / 60)}:${Math.floor(
                  playing.current.track.info.length % 60,
                )
                  .toString()
                  .padStart(2, "0")}`
                : "0:00"}
            </div>
          </div>
          <div className="items-center flex flex-col">
            <TrackInfo currentTrack={playing.current} />
            <PlaybackControl
              instrumentalPlayerRef={instrumentalPlayerRef}
              vocalPlayerRef={vocalPlayerRef}
              isPaused={isPaused}
              setIsPaused={setIsPaused}
              setIsMuted={setIsMuted}
              isMuted={isMuted}
            />
            <VolumeControl
              instrumentalPlayerRef={instrumentalPlayerRef}
              vocalPlayerRef={vocalPlayerRef}
              currentTrack={playing.current}
            />
          </div>
          {/* biome-ignore lint/a11y/useMediaCaption: <explanation> */}
          <audio
            ref={instrumentalPlayerRef}
            onPlay={() => playing.current?.instrumentalWaveSurfer.play()}
            aria-describedby="music-description"
          />
          {/* biome-ignore lint/a11y/useMediaCaption: <explanation> */}
          <audio
            ref={vocalPlayerRef}
            onPlay={() => playing.current?.vocalWaveSurfer?.play()}
            aria-describedby="music-description"
          />
          <p id="music-description" className="sr-only">
            {playing.current?.track.info.title || "Unknown track"} -
            {playing.current?.track.info.artist || "Unknown artist"}
          </p>

          <div className="mt-2">
            <div className="flex space-x-2">
              <img src="/images/bpm.svg" height={26} width={26} alt="BPM" />
              <p>
                {/* flashbang */}
                {(typeof playing.current?.track.info.tempo === 'number'
                  ? playing.current.track.info.tempo.toFixed(0)
                  : Number.parseFloat(playing.current?.track.info.tempo ?? '0').toFixed(0)) || ""}
              </p>
              <img
                src="/images/track-key.svg"
                height={24}
                width={24}
                alt="Track Key"
              />
              <p>{playing.current?.track.info.key || ""}</p>
            </div>

            {/* Waveform */}
            <div className="waveform-container">
              <div className="waveform-background" />
              <div className="waveform-content">
                <div
                  ref={vocalSeekAreaRef}
                  className="cursor-pointer w-full px-4"
                />
                <div
                  ref={instrumentalSeekAreaRef}
                  className="cursor-pointer w-full px-4"
                />
              </div>
            </div>
          </div>
        </div>
        {/* Footer */}
        <Footer />
      </main>
    </div>
  );
}
