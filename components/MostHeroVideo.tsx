"use client";

import { useEffect, useState } from "react";
import { RouteField } from "@/components/RouteField";

const heroRoute = "M30 310 H260 C350 310 355 165 475 165 C595 165 590 270 695 270 C800 270 835 120 955 120";

export function MostHeroVideo() {
  const [canLoadVideo, setCanLoadVideo] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setCanLoadVideo(!media.matches);
      if (media.matches) setIsReady(false);
    };

    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return (
    <div className={`most-hero-video${isReady ? " is-ready" : ""}`}>
      {canLoadVideo && !hasError && <video className="most-hero-video__media" autoPlay muted loop playsInline preload="metadata" onCanPlay={() => setIsReady(true)} onError={() => { setHasError(true); setIsReady(false); }} aria-hidden="true"><source src="/most-hero.webm" type="video/webm" /></video>}
      <div className="most-hero-video__veil" aria-hidden="true" />
      <svg className="most-hero-video__route" viewBox="0 0 1000 430" preserveAspectRatio="none" aria-hidden="true">
        <g transform="translate(150 0) scale(.7 1)">
          <path className="most-hero-video__route-glow" d={heroRoute} />
          <path id="hero-video-route" className="most-hero-video__route-line" d={heroRoute} />
          <circle className="most-hero-video__route-signal" r="3.5"><animateMotion dur="4.5s" repeatCount="indefinite" rotate="0"><mpath href="#hero-video-route" /></animateMotion></circle>
        </g>
      </svg>
      <div className="most-hero-video__fallback"><RouteField /></div>
    </div>
  );
}
