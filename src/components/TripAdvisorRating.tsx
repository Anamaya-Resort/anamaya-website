// TripAdvisor's signature 5-dot ("bubble") rating, rendered as inline SVG.
// Filled bubbles = the rating value. Default: 5/5.

type Props = {
  rating?: number;           // 0-5, fractional supported
  className?: string;
  showLogo?: boolean;
};

function Bubble({ fill }: { fill: number }) {
  // fill: 0-1
  const id = `bubble-${Math.random().toString(36).slice(2, 8)}`;
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
      <defs>
        <linearGradient id={id}>
          <stop offset={`${fill * 100}%`} stopColor="#00AA6C" />
          <stop offset={`${fill * 100}%`} stopColor="#e5e7eb" />
        </linearGradient>
      </defs>
      <circle cx={10} cy={10} r={9} fill={`url(#${id})`} stroke="#00AA6C" strokeWidth={1} />
    </svg>
  );
}

export function TripAdvisorRating({ rating = 5, className = "", showLogo = true }: Props) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showLogo && <TripAdvisorLogo />}
      <div className="flex items-center gap-0.5">
        {[0, 1, 2, 3, 4].map((i) => {
          const fill = Math.max(0, Math.min(1, rating - i));
          return <Bubble key={i} fill={fill} />;
        })}
      </div>
    </div>
  );
}

// Simplified TripAdvisor wordmark — the owl eyes + "Tripadvisor" text look.
// Not the official logo, but recognizable and avoids any image hosting.
function TripAdvisorLogo() {
  return (
    <svg viewBox="0 0 120 20" className="h-4" aria-label="TripAdvisor">
      <g>
        {/* two owl-eye circles (left) */}
        <circle cx={10} cy={10} r={9} fill="#00AA6C" />
        <circle cx={10} cy={10} r={4} fill="#fff" />
        <circle cx={10} cy={10} r={2} fill="#000" />
      </g>
      <text
        x={26}
        y={15}
        fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif"
        fontSize="12"
        fontWeight="700"
        fill="#000"
      >
        Tripadvisor
      </text>
    </svg>
  );
}
