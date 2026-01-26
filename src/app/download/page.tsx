'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Star, ArrowUpCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { doc, getDoc, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader } from '@/components/loader';
import { useToast } from '@/hooks/use-toast';

interface DownloadPageSettings extends DocumentData {
    downloadPageImage?: {
        imageUrl: string;
    };
    appDownloadLink?: string;
}

export default function DownloadPage() {
  const [settings, setSettings] = useState<DownloadPageSettings>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchSettings = async () => {
        try {
            const settingsDocRef = doc(db, 'settings', 'app-settings');
            const docSnap = await getDoc(settingsDocRef);
            if (docSnap.exists()) {
                setSettings(docSnap.data() as DownloadPageSettings);
            }
        } catch (error) {
            console.error("Error fetching settings for download page:", error);
        } finally {
            setLoading(false);
        }
    };
    
    fetchSettings();
  }, []);
  

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
        <header className="w-full p-4 bg-black text-white flex justify-between items-center">
             <h1 className="text-2xl font-bold">Matka King</h1>
             <div className="flex flex-col items-center">
                 <Image src="https://placehold.co/40x40.png" alt="Matka King Logo" width={32} height={32} data-ai-hint="crown logo" />
                 <span className="text-xs">MATKA KING</span>
             </div>
        </header>

      <main className="flex flex-col items-center">
        <div className="w-full text-center py-4 bg-[#E0F7FA]">
           <h1 className="text-5xl font-bold text-blue-800">
            MATKA <span className="text-white bg-gradient-to-r from-orange-500 to-red-600 px-3 rounded-lg shadow-md">KING</span>
          </h1>
        </div>
        
        <div className="relative w-full max-w-md mt-4 bg-gray-200">
            {loading ? (
                <div className="w-full aspect-[3/4] flex items-center justify-center">
                    <Loader className="h-10 w-10 text-primary" />
                </div>
            ) : (
                <Image
                    src={settings.downloadPageImage?.imageUrl || "https://placehold.co/600x800.png"}
                    alt="Matka King App"
                    width={600}
                    height={800}
                    className="w-full h-auto"
                    data-ai-hint="woman orange sari cards"
                    
                />
            )}
        </div>

        <div className="w-full max-w-md p-4 bg-background">
          <a
            href={settings.appDownloadLink || "https://drive.usercontent.google.com/download?id=10kcuzCuNZkV7Mbv1IZVIanf-S1CZfYh-&export=download&authuser=0"}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full"
          >
            <Button
              className="w-full h-16 bg-green-500 hover:bg-green-600 text-white text-xl font-bold rounded-lg shadow-lg"
            >
              <ArrowUpCircle className="mr-3 h-8 w-8" />
              Update Now
            </Button>
          </a>
        </div>

        <div className="w-full max-w-2xl p-4 bg-card mt-4">
          <h2 className="text-xl font-semibold">Ratings and reviews</h2>
          <div className="flex items-center mt-2">
            <span className="text-4xl font-bold mr-4">4.8</span>
            <div className="flex flex-col">
                <div className="flex text-yellow-500">
                    <Star fill="currentColor" className="w-5 h-5" />
                    <Star fill="currentColor" className="w-5 h-5" />
                    <Star fill="currentColor" className="w-5 h-5" />
                    <Star fill="currentColor" className="w-5 h-5" />
                    <Star className="w-5 h-5 text-gray-500" />
                </div>
                <span className="text-sm text-muted-foreground">1.2M reviews</span>
            </div>
          </div>
          <Separator className="my-4" />
          <p className="text-muted-foreground">
            Ratings and reviews are verified and are from people who use the same type of device that you use.
          </p>
        </div>
      </main>
    </div>
  );
}
