"use client";

import { useEffect, useRef } from "react";

const route = "M30 310 H260 C350 310 355 165 475 165 C595 165 590 270 695 270 C800 270 835 120 955 120";

export function RouteField() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onMove = (event: PointerEvent) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${((event.clientX - r.left) / r.width - 0.5) * 16}px`);
      el.style.setProperty("--my", `${((event.clientY - r.top) / r.height - 0.5) * 12}px`);
    };
    const onLeave = () => {
      el.style.setProperty("--mx", "0px");
      el.style.setProperty("--my", "0px");
    };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div className="route-field" ref={ref} aria-label="Абстрактная схема маршрута подключения">
      <svg viewBox="0 0 1000 430" preserveAspectRatio="none" role="img" aria-hidden="true">
        <g transform="translate(150 0) scale(.7 1)">
          <path className="route-shadow" d={route} />
          <path id="route" className="route-main" d={route} />
          <g className="route-svg-node route-svg-node-1" transform="translate(30 310)"><circle r="5"/><text x="14" y="-14">УСТРОЙСТВО</text></g>
          <g className="route-svg-node route-svg-node-2" transform="translate(260 310)"><circle r="5"/><text x="14" y="24">ПОДКЛЮЧЕНИЕ</text></g>
          <g className="route-svg-node route-svg-node-3" transform="translate(475 165)"><circle r="5"/><text x="14" y="-14">ГЕРМАНИЯ</text></g>
          <g className="route-svg-node route-svg-node-5" transform="translate(955 120)"><circle r="5"/><text x="14" y="24">ГОТОВО</text></g>
          <circle className="signal" r="3.5">
            <animateMotion dur="4.5s" repeatCount="indefinite" rotate="0"><mpath href="#route" /></animateMotion>
          </circle>
        </g>
      </svg>
      <div className="route-caption mono">АВТОМАТИЧЕСКИЙ ВЫБОР СЕРВЕРА</div>
    </div>
  );
}
