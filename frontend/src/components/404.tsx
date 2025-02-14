import React, { useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';

const NotFound = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [needsInteraction, setNeedsInteraction] = useState(true);

  const handleInteraction = () => {
    if (videoRef.current) {
      videoRef.current.volume = 0.75;
      videoRef.current.play().catch(console.error);
      setNeedsInteraction(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="max-w-sm w-full relative">
        <div className="w-full aspect-[9/16] bg-zinc-900 rounded-lg overflow-hidden relative">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            loop
            playsInline
            controls={false}
          >
            <source src="vw.mp4" type="video/mp4" />
          </video>

          {needsInteraction && (
            <div
              onClick={handleInteraction}
              className="absolute inset-0 bg-black/80 flex items-center justify-center cursor-pointer hover:bg-black/70 transition-colors"
            >
              <div className="text-white text-center space-y-2">
                <p className="text-lg font-medium">Your Phaeton awaits</p>
                <p className="text-sm text-zinc-400">Click anywhere to experience glory</p>
              </div>
            </div>
          )}
        </div>

        <div className="absolute inset-0 flex flex-col items-center justify-start p-6 bg-gradient-to-b from-black/80 via-black/30 to-transparent pointer-events-none">
          <span className="text-zinc-500 text-lg font-medium mb-2">
            404
          </span>
          <p className="text-white/90 text-center text-sm">
            i couldn't find the page you requested,
            <br />
            but I have a volkswagen phaeton edit for you
          </p>
        </div>

        <div className="mt-6 text-center">
          <Link
            to="/"
            className="text-zinc-500 text-sm hover:text-white transition-colors"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;