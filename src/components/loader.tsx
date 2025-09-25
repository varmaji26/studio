import { cn } from '@/lib/utils';

export function Loader({ className }: { className?: string }) {
  return (
    <div className={cn("flex justify-center items-center", className)}>
        <span className="loader"></span>
    </div>
  );
}
