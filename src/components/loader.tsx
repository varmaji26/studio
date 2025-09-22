import { cn } from '@/lib/utils';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'dotlottie-wc': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        src: string;
        autoplay?: boolean;
        loop?: boolean;
      }, HTMLElement>;
    }
  }
}

export function Loader({ className }: { className?: string }) {
  return (
    <div className={cn("flex justify-center items-center", className)}>
        <dotlottie-wc 
            src="https://lottie.host/0df14788-d445-40bb-b7e6-413e847a169e/x9kAYkhru6.lottie"
            autoplay 
            loop
            style={{ width: '300px', height: '300px' }}>
        </dotlottie-wc>
    </div>
  );
}
