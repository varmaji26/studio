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
  let hour = parseInt(hours, 10);
  
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  hour = hour ? hour : 12; // the hour '0' should be '12'
  const formattedHour = hour < 10 ? `0${hour}` : hour;

  return `${formattedHour}:${minutes} ${ampm}`;
}
