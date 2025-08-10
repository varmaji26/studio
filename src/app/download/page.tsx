
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Star, Download, Share2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { doc, getDoc, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader } from '@/components/loader';
import { useToast } from '@/hooks/use-toast';

interface DownloadPageSettings extends DocumentData {
    downloadPageImage?: {
        imageUrl: string;
    };
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
  
  const handleDownload = () => {
    window.open('https://files.appsgeyser.com/Matka%20King_19002963.apk', '_blank');
  };

  const handleShare = async () => {
    const shareData = {
      title: 'Matka King App',
      text: 'Download the Matka King app now!',
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback for browsers that don't support Web Share API
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: 'Link Copied!',
          description: 'Download link has been copied to your clipboard.',
        });
      }
    } catch (err) {
      console.error('Error sharing:', err);
      // Fallback for when sharing fails or is cancelled
      await navigator.clipboard.writeText(window.location.href);
      toast({
        title: 'Link Copied!',
        description: 'Sharing failed, but the link is copied to your clipboard.',
      });
    }
  };

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
                    unoptimized
                />
            )}
        </div>

        <div className="w-full max-w-md p-4 bg-background">
          <div className="flex gap-4">
            <Button
              className="w-full h-16 bg-green-500 hover:bg-green-600 text-white text-xl font-bold rounded-lg shadow-lg"
              onClick={handleDownload}
            >
              <Download className="mr-3 h-8 w-8" />
              Download
            </Button>
            <Button
              className="w-full h-16 bg-blue-500 hover:bg-blue-600 text-white text-xl font-bold rounded-lg shadow-lg"
              onClick={handleShare}
            >
              <Share2 className="mr-3 h-7 w-7" />
              Share
            </Button>
          </div>
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
