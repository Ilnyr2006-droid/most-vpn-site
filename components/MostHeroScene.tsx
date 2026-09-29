"use client";

import { useEffect, useRef, useState } from "react";
import { RouteField } from "@/components/RouteField";

const runtimeUrl = "https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v2.3.0/dist/unicornStudio.umd.js";

type UnicornScene = { destroy: () => void };
type UnicornRuntime = {
  addScene: (options: {
    element: HTMLDivElement;
    projectId: string;
    fps: number;
    scale: number;
    dpi: number;
    lazyLoad: boolean;
    production: boolean;
    altText: string;
    ariaLabel: string;
    interactivity: { mouse: { disableMobile: boolean } };
  }) => Promise<UnicornScene>;
};

declare global {
  interface Window { UnicornStudio?: UnicornRuntime }
}

let runtimePromise: Promise<UnicornRuntime> | null = null;

function loadRuntime() {
  if (window.UnicornStudio) return Promise.resolve(window.UnicornStudio);
  if (runtimePromise) return runtimePromise;

  runtimePromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-most-unicorn-runtime]");
    const script = existing ?? document.createElement("script");
    const finish = () => window.UnicornStudio ? resolve(window.UnicornStudio) : reject(new Error("Unicorn Studio runtime is unavailable"));

    script.addEventListener("load", finish, { once: true });
    script.addEventListener("error", () => reject(new Error("Unicorn Studio runtime could not load")), { once: true });

    if (!existing) {
      script.src = runtimeUrl;
      script.async = true;
      script.dataset.mostUnicornRuntime = "true";
      document.head.appendChild(script);
    }
  });

  return runtimePromise;
}

export function MostHeroScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  const projectId = process.env.NEXT_PUBLIC_UNICORN_PROJECT_ID?.trim();

  useEffect(() => {
    const container = containerRef.current;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!container || !projectId || reducedMotion) return;

    let scene: UnicornScene | null = null;
    let cancelled = false;
    const isMobile = window.matchMedia("(max-width: 900px)").matches;

    loadRuntime()
      .then(runtime => runtime.addScene({
        element: container,
        projectId,
        lazyLoad: true,
        production: true,
        scale: isMobile ? 0.45 : 0.7,
        dpi: 1,
        fps: isMobile ? 24 : 30,
        altText: "Интерактивная схема сети MOST",
        ariaLabel: "Интерактивная схема сети MOST",
        interactivity: { mouse: { disableMobile: true } },
      }))
      .then(initializedScene => {
        if (cancelled) {
          initializedScene.destroy();
          return;
        }
        scene = initializedScene;
        setIsReady(true);
      })
      .catch(() => {
        // The SVG fallback remains visible when the scene or runtime is unavailable.
      });

    return () => {
      cancelled = true;
      scene?.destroy();
      container.replaceChildren();
    };
  }, [projectId]);

  return (
    <div className={`most-hero-scene${isReady ? " is-ready" : ""}`}>
      <div className="most-hero-scene__runtime" ref={containerRef} aria-hidden="true" />
      <div className="most-hero-scene__veil" aria-hidden="true" />
      <div className="most-hero-scene__fallback"><RouteField /></div>
    </div>
  );
}
