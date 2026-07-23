/**
 * Inline SVG icon set (Lucide-style paths), ported from the prototype's `ICONS`
 * map. Pure render — usable from server or client components.
 */
import type { CSSProperties } from 'react';

export const ICONS: Record<string, string> = {
  search: 'M11 11m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0 M21 21l-4.3-4.3',
  cart: 'M5 7h14l-1.2 9.6a2 2 0 0 1-2 1.75H8.2a2 2 0 0 1-2-1.75L5 7Z M5 7 4 4H2 M9 21h.01 M16 21h.01',
  heart: 'M19.5 5.5a5 5 0 0 0-7 0l-.5.5-.5-.5a5 5 0 1 0-7 7l8 8 8-8a5 5 0 0 0 0-7Z',
  user: 'M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0 M4 21a8 8 0 0 1 16 0',
  menu: 'M3 6h18 M3 12h18 M3 18h18',
  x: 'M18 6 6 18 M6 6l12 12',
  plus: 'M12 5v14 M5 12h14',
  minus: 'M5 12h14',
  trash: 'M4 7h16 M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2 M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12',
  chevR: 'M9 6l6 6-6 6',
  chevD: 'M6 9l6 6 6-6',
  chevL: 'M15 6l-6 6 6 6',
  arrowR: 'M5 12h14 M13 6l6 6-6 6',
  check: 'M5 12l5 5L20 7',
  truck: 'M3 6h11v9H3z M14 9h4l3 3v3h-7 M7 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z M17 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3Z M9 12l2 2 4-4',
  refresh: 'M21 12a9 9 0 1 1-2.6-6.3 M21 4v5h-5',
  filter: 'M4 5h16 M7 12h10 M10 19h4',
  sliders: 'M4 6h10 M18 6h2 M4 12h2 M10 12h10 M4 18h8 M16 18h4 M14 4v4 M6 10v4 M12 16v4',
  spark: 'M12 3v4 M12 17v4 M3 12h4 M17 12h4 M6 6l2.5 2.5 M15.5 15.5 18 18 M18 6l-2.5 2.5 M8.5 15.5 6 18',
  pkg: 'M21 8l-9-5-9 5 9 5 9-5Z M3 8v8l9 5 9-5V8 M12 13v8',
  pin: 'M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z M12 10m-2.5 0a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0',
  card: 'M3 7h18v10H3z M3 10h18',
  tag: 'M3 12V4h8l9 9-7 7-9-9Z M7.5 7.5h.01',
  lock: 'M6 11h12v9H6z M9 11V8a3 3 0 0 1 6 0v3',
  store: 'M4 9l1-5h14l1 5 M4 9h16v11H4z M4 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0 M9 20v-6h6v6',
  clock: 'M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0 M12 7v5l3 2',
  headset: 'M4 13v-1a8 8 0 0 1 16 0v1 M4 13a2 2 0 0 0 2 2h1v-5H6a2 2 0 0 0-2 2 M20 13a2 2 0 0 1-2 2h-1v-5h1a2 2 0 0 1 2 2 M18 15v1a3 3 0 0 1-3 3h-3',
  leaf: 'M5 21c0-9 5-14 14-14 0 9-5 14-14 14Z M5 21c2-5 5-8 9-10',
  globe: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M3 12h18 M12 3c2.5 2.5 2.5 15 0 18 M12 3c-2.5 2.5-2.5 15 0 18',
  zap: 'M13 2 4 14h7l-1 8 9-12h-7l1-8Z',
  percent: 'M19 5 5 19 M7.5 6.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z M19.5 17.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z',
  phone: 'M7 4h10v16H7z M11 18h2',
  grid: 'M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z',
  gift: 'M20 12v9H4v-9 M2 8h20v4H2z M12 8v13 M12 8S10.5 4 8 4a2 2 0 0 0 0 4h4 M12 8s1.5-4 4-4a2 2 0 0 1 0 4h-4',
  chat: 'M21 12a8 8 0 0 1-11.3 7.3L3 21l1.7-6.7A8 8 0 1 1 21 12Z',
};

export interface IconProps {
  name: string;
  size?: number;
  sw?: number;
  fill?: 'none' | 'current';
  style?: CSSProperties;
  className?: string;
}

export function Icon({ name, size = 20, sw = 1.7, fill = 'none', style, className }: IconProps) {
  const d = ICONS[name] || '';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill === 'current' ? 'currentColor' : 'none'}
      stroke={fill === 'current' ? 'none' : 'currentColor'}
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      className={className}
      aria-hidden="true"
    >
      {d.split(' M').map((seg, i) => (
        <path key={i} d={(i ? 'M' : '') + seg} />
      ))}
    </svg>
  );
}
