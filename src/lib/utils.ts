import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTime(timeString: string | undefined | null): string {
  if (!timeString || !/^\d{2}:\d{2}$/.test(timeString)) {
    return "N/A";
  }

  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours, 10);
  
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const formattedHour = hour % 12 || 12; // Convert hour to 12-hour format (0 -> 12)
  const paddedHour = formattedHour < 10 ? `0${formattedHour}` : formattedHour;

  return `${paddedHour}:${minutes} ${ampm}`;
}
