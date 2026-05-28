"use client";

// Infinity-symbol loader. A single SVG path traces an infinity (lemniscate)
// shape; CSS stroke-dasharray + stroke-dashoffset animates it like a light
// running around the loop. No external deps.

export default function InfinityLoader({
  label = "Loading",
  size = 88,
}: {
  label?: string;
  size?: number;
}) {
  return (
    <div className="inf-loader" role="status" aria-live="polite">
      <svg
        viewBox="0 0 120 60"
        width={size}
        height={(size * 60) / 120}
        className="inf-loader-svg"
        aria-hidden="true"
      >
        <path
          d="M 30,30 C 30,10 60,10 60,30 C 60,50 90,50 90,30 C 90,10 60,10 60,30 C 60,50 30,50 30,30 Z"
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          className="inf-loader-path"
        />
      </svg>
      <div className="inf-loader-label">{label}</div>
    </div>
  );
}
