export function NetworkMap() {
  return (
    <div className="network-map" aria-label="Демонстрационная карта серверов">
      <svg viewBox="0 100 1000 330" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <g>
          <path id="network-route" className="network-route" d="M50 310 H250 C390 310 415 220 540 220 C660 220 675 330 780 330 C875 330 890 195 950 195" />
          <use href="#network-route" className="network-route network-route-copy" transform="translate(0 -82)" />
          <use href="#network-route" className="network-route network-route-copy" transform="translate(0 82)" />
          <g className="map-node" transform="translate(50 228)"><circle r="5"/><text x="14" y="4">ГЕРМАНИЯ</text></g>
          <g className="map-node" transform="translate(50 310)"><circle r="5"/><text x="14" y="4">ПОЛЬША</text></g>
          <g className="map-node" transform="translate(50 392)"><circle r="5"/><text x="14" y="4">НИДЕРЛАНДЫ</text></g>
          <circle className="map-pulse" r="4"><animateMotion dur="4.5s" repeatCount="indefinite" rotate="0"><mpath href="#network-route" /></animateMotion></circle>
          <g transform="translate(0 -82)"><circle className="map-pulse" r="4"><animateMotion dur="4.5s" begin="-1.5s" repeatCount="indefinite" rotate="0"><mpath href="#network-route" /></animateMotion></circle></g>
          <g transform="translate(0 82)"><circle className="map-pulse" r="4"><animateMotion dur="4.5s" begin="-3s" repeatCount="indefinite" rotate="0"><mpath href="#network-route" /></animateMotion></circle></g>
        </g>
      </svg>
      <div className="network-stats">
        <div><span>03</span><small>ЛОКАЦИИ</small></div>
        <div><span><i className="status-dot" /> ONLINE</span><small>СТАТУС</small></div>
      </div>
    </div>
  );
}
