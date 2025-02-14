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
    <div className="h-screen bg-black overflow-hidden">
      <div className="h-full w-full grid grid-cols-1 lg:grid-cols-[1fr_2fr_1fr] items-center gap-2 p-2">
        <div className="hidden lg:block h-screen">
          <div className="relative h-full">
            <img
              src="/vw_back.jpg"
              alt=""
              className="object-cover h-full w-full opacity-40 hover:opacity-60 transition-opacity duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black via-transparent to-transparent" />
          </div>
        </div>

        <div className="w-full flex flex-col items-center justify-center gap-2">
          <div className="text-zinc-500 text-lg font-medium">404</div>

          <p className="text-white/90 text-center text-sm mb-2">
            i couldn't find the page you requested,
            <br />
            but we have a volkswagen phaeton edit
          </p>

          <div className="w-full max-w-2xl aspect-[16/9] bg-zinc-900 rounded-lg overflow-hidden relative">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              loop
              playsInline
              controls={false}
            >
              <source src="/vw.mp4" type="video/mp4" />
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

          <Link
            to="/"
            className="text-zinc-500 text-sm hover:text-white transition-colors mt-2"
          >
            Back to home
          </Link>
        </div>

        <div className="hidden lg:block h-screen">
          <div className="relative h-full">
            <img
              src="/vw.jpg"
              alt=""
              className="object-cover h-full w-full opacity-40 hover:opacity-60 transition-opacity duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-l from-black via-transparent to-transparent" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;