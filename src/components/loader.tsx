import { cn } from '@/lib/utils';

export function Loader({ className }: { className?: string }) {
  return (
    <div className={cn("flex justify-center items-center", className)}>
        <div className="loader">
            <span></span>
            <span></span>
            <span></span>
        </div>
    </div>
  );
}
