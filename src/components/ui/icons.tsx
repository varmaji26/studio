import { cn } from "@/lib/utils";
import React from "react";

export const Icons = {
    // Add other icons here if needed
};

export const NavBarClipper = ({ className, ...props }: React.SVGProps<SVGSVGElement>) => (
    <svg 
        viewBox="0 0 100 20" 
        preserveAspectRatio="none" 
        className={cn("w-full h-full", className)}
        {...props}
    >
        <path 
            d="M 0,20 L 0,2 L 40,2 C 45,2 48,10 50,10 C 52,10 55,2 60,2 L 100,2 L 100,20 Z" 
            fill="currentColor"
            stroke="none"
        />
    </svg>
);
