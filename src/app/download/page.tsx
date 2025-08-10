
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { doc, onSnapshot, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader } from '@/components/loader';

interface DownloadPageSettings extends DocumentData {
    downloadPageImage?: {
        imageUrl: string;
    };
}

export default function DownloadPage() {
  const [settings, setSettings] = useState<DownloadPageSettings>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const settingsDocRef = doc(db, 'settings', 'app-settings');
    const unsubscribe = onSnapshot(settingsDocRef, (docSnap) => {
        if (docSnap.exists()) {
            setSettings(docSnap.data() as DownloadPageSettings);
        }
        setLoading(false);
    });
    return () => unsubscribe();
  }, []);
  
  const handleDownload = () => {
    window.open('https://files.appsgeyser.com/Matka%20King_19002963.apk', '_blank');
  };

  return (
    <div className="min-h-screen bg-[#E0F7FA] text-black font-sans">
      <main className="flex flex-col items-center">
        <div className="w-full text-center py-4 bg-[#E0F7FA]">
           <h1 className="text-5xl font-bold text-blue-800">
            MATKA <span className="text-white bg-gradient-to-r from-orange-500 to-red-600 px-3 rounded-lg shadow-md">KING</span>
          </h1>
        </div>
        
        <div className="relative w-full max-w-md mt-4">
            {loading ? (
                <div className="w-full aspect-[600/800] flex items-center justify-center bg-gray-200">
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
                    unoptimized
                />
            )}
        </div>

        <div className="w-full max-w-md p-4 bg-[#E0F7FA]">
          <Button
            className="w-full h-16 bg-gradient-to-b from-yellow-400 to-orange-500 text-white text-3xl font-bold py-8 px-16 rounded-full shadow-lg border-4 border-white/50 transform hover:scale-105 transition-transform"
            onClick={handleDownload}
          >
            Download Now
          </Button>
        </div>

        <div className="w-full max-w-2xl p-4 bg-white mt-4">
          <h2 className="text-xl font-semibold">Ratings and reviews</h2>
          <div className="flex items-center mt-2">
            <span className="text-4xl font-bold mr-4">4.8</span>
            <div className="flex flex-col">
                <div className="flex text-yellow-500">
                    <Star fill="currentColor" className="w-5 h-5" />
                    <Star fill="currentColor" className="w-5 h-5" />
                    <Star fill="currentColor" className="w-5 h-5" />
                    <Star fill="currentColor" className="w-5 h-5" />
                    <Star className="w-5 h-5 text-gray-300" />
                </div>
                <span className="text-sm text-gray-500">1.2M reviews</span>
            </div>
          </div>
          <Separator className="my-4" />
          <p className="text-gray-600">
            Ratings and reviews are verified and are from people who use the same type of device that you use.
          </p>
        </div>
      </main>
    </div>
  );
}
