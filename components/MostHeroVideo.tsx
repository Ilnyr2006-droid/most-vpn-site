"use client";

import { useEffect, useState } from "react";
import { RouteField } from "@/components/RouteField";

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
      <div className="most-hero-video__fallback"><RouteField /></div>
    </div>
  );
}
