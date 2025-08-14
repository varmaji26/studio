import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { type DocumentData } from "firebase/firestore";

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

export function isBettingClosed(closeTimeStr: string): boolean {
  if (!closeTimeStr || !/^\d{2}:\d{2}$/.test(closeTimeStr)) {
    return true; // If time is invalid, assume closed
  }
  const now = new Date();
  const [hours, minutes] = closeTimeStr.split(':').map(Number);
  const closeTime = new Date();
  closeTime.setHours(hours, minutes, 0, 0);

  return now > closeTime;
}

const calculateJodiDigit = (pana: string): string => {
    if (!pana || pana.length !== 3 || !/^\d+$/.test(pana) || pana.includes('*')) return '';
    return (pana.split('').reduce((acc, digit) => acc + parseInt(digit, 10), 0) % 10).toString();
};

export function formatGameResult(game: DocumentData, compact: boolean = false): string {
    const { openResult, closeResult } = game;

    const isOpenValid = openResult && /^\d{3}$/.test(openResult);
    const isCloseValid = closeResult && /^\d{3}$/.test(closeResult);

    const openPana = isOpenValid ? openResult : '***';
    const closePana = isCloseValid ? closeResult : (compact ? '***' : 'XXX');

    const openJodi = calculateJodiDigit(openPana) || '*';
    const closeJodi = calculateJodiDigit(closePana) || (compact ? '*' : 'X');

    if (isOpenValid && isCloseValid) {
        // Both results are in, show full result
        return `${openPana}-${openJodi}${closeJodi}-${closePana}`;
    }

    if (isOpenValid) {
        // Only open result is in, show partial result with placeholders
         return `${openPana}-${openJodi}${closeJodi}-${closePana}`;
    }
    
    // Default placeholder if no results are in
     return `***-${openJodi}${closeJodi}-***`;
}
