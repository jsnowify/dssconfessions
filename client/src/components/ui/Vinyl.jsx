// Decorative only. Playback stays in the existing Spotify details player.
export default function Vinyl({ size, label, idle = false, spinning = false, className = "" }) {
  return (
    <span aria-hidden="true" className={`vinyl ${idle ? "vinyl--idle" : ""} ${spinning ? "is-spinning" : ""} ${className}`}
      style={{ ...(size ? { "--size": size } : {}), ...(label ? { "--vinyl-label": label } : {}) }}>
      <span className="vinyl__label"><span className="vinyl__hole" /></span>
    </span>
  );
}
