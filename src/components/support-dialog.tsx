
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import { Phone } from 'lucide-react';

interface SupportDialogProps {
  children: React.ReactNode;
  callNumber?: string;
  whatsappNumber?: string;
}

export function SupportDialog({ children, callNumber, whatsappNumber }: SupportDialogProps) {
  
  const handleCall = () => {
    if (callNumber) {
        window.location.href = `tel:${callNumber}`;
    }
  };

  const handleWhatsApp = () => {
    if (whatsappNumber) {
        window.open(`https://wa.me/${whatsappNumber}`, '_blank');
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Support</DialogTitle>
          <DialogDescription className="sr-only">Contact support through phone call or WhatsApp.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
            <Button
                className="h-12 bg-blue-500 hover:bg-blue-600 text-white"
                onClick={handleCall}
                disabled={!callNumber}
            >
                <Phone className="mr-2 h-5 w-5" /> Call Us
            </Button>
            <Button
                className="h-12 bg-green-500 hover:bg-green-600 text-white"
                onClick={handleWhatsApp}
                disabled={!whatsappNumber}
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="mr-2"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.886-.001 2.269.655 4.357 1.846 6.166l-1.138 4.162 4.277-1.122z"/></svg>
                Whatsapp
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

    