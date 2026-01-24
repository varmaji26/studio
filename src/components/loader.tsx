import { cn } from '@/lib/utils';

export function Loader({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn("animate-spinner", className)}
    >
      <title>Loading...</title>
      <g>
        <rect x="11" y="2" width="2" height="5" rx="1" opacity="1" transform="rotate(0 12 12)" />
        <rect x="11" y="2" width="2" height="5" rx="1" opacity="0.91" transform="rotate(30 12 12)" />
        <rect x="11" y="2" width="2" height="5" rx="1" opacity="0.83" transform="rotate(60 12 12)" />
        <rect x="11" y="2" width="2" height="5" rx="1" opacity="0.75" transform="rotate(90 12 12)" />
        <rect x="11" y="2" width="2" height="5" rx="1" opacity="0.66" transform="rotate(120 12 12)" />
        <rect x="11" y="2" width="2" height="5" rx="1" opacity="0.58" transform="rotate(150 12 12)" />
        <rect x="11" y="2" width="2" height="5" rx="1" opacity="0.50" transform="rotate(180 12 12)" />
        <rect x="11" y="2" width="2" height="5" rx="1" opacity="0.41" transform="rotate(210 12 12)" />
        <rect x="11" y="2" width="2" height="5" rx="1" opacity="0.33" transform="rotate(240 12 12)" />
        <rect x="11" y="2" width="2" height="5" rx="1" opacity="0.25" transform="rotate(270 12 12)" />
        <rect x="11" y="2" width="2" height="5" rx="1" opacity="0.16" transform="rotate(300 12 12)" />
        <rect x="11" y="2" width="2" height="5" rx="1" opacity="0.08" transform="rotate(330 12 12)" />
      </g>
    </svg>
  );
}
