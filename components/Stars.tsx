/** Fractional star rating, ported from the prototype. Pure render. */
export function Stars({ value, size = 13 }: { value: number; size?: number }) {
  return (
    <span className="stars">
      {[0, 1, 2, 3, 4].map((i) => {
        const f = Math.max(0, Math.min(1, value - i));
        const id = `st${i}-${size}-${Math.round(f * 100)}`;
        return (
          <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
            <defs>
              <linearGradient id={id}>
                <stop offset={`${f * 100}%`} stopColor="var(--star)" />
                <stop offset={`${f * 100}%`} stopColor="var(--line-2)" />
              </linearGradient>
            </defs>
            <path
              d="M12 3.2l2.7 5.5 6 .9-4.35 4.2 1 6-5.35-2.8-5.35 2.8 1-6L3.3 9.6l6-.9L12 3.2Z"
              fill={`url(#${id})`}
            />
          </svg>
        );
      })}
    </span>
  );
}
