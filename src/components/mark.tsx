interface MarkProps {
  size?: number;
  className?: string;
}

export function Mark({ size = 32, className = '' }: MarkProps) {
  return (
    <div
      style={{ width: size, height: size }}
      className={`relative flex items-center justify-center shrink-0 select-none ${className}`}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="luminaBg" x1="2" y1="1" x2="30" y2="31" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#6ee7b7" />
            <stop offset="46%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>
          <linearGradient id="luminaGlass" x1="10" y1="8" x2="22" y2="24" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#d1fae5" />
          </linearGradient>
        </defs>

        <rect width="32" height="32" rx="9" fill="url(#luminaBg)" />
        <rect
          x="0.75"
          y="0.75"
          width="30.5"
          height="30.5"
          rx="8.25"
          stroke="#ffffff"
          strokeOpacity="0.32"
          strokeWidth="1.5"
        />

        <circle cx="16" cy="16" r="8.1" stroke="url(#luminaGlass)" strokeWidth="1.6" />
        <path
          d="M16 8.7L20.15 13.05L16 16L11.85 13.05L16 8.7Z"
          fill="#ffffff"
        />
        <path
          d="M23.3 16L18.95 20.15L16 16L18.95 11.85L23.3 16Z"
          fill="#ffffff"
          fillOpacity="0.92"
        />
        <path
          d="M16 23.3L11.85 18.95L16 16L20.15 18.95L16 23.3Z"
          fill="#ecfdf5"
          fillOpacity="0.88"
        />
        <path
          d="M8.7 16L13.05 11.85L16 16L13.05 20.15L8.7 16Z"
          fill="#ffffff"
          fillOpacity="0.78"
        />
        <circle cx="16" cy="16" r="2.05" fill="#064e3b" />
      </svg>
    </div>
  );
}
