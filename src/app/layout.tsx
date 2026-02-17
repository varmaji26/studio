'use client';

import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { requestForToken } from '@/lib/firebase-messaging';
import { AuthProvider } from '@/components/auth-provider';
import { useAuth } from '@/hooks/use-auth';
import { BottomNavbar } from '@/components/bottom-navbar';
import { doc, onSnapshot, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Inter } from 'next/font/google';
import { Loader } from '@/components/loader';

const inter = Inter({ subsets: ['latin'] });

function LayoutContent({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, loading } = useAuth();
    const notificationTokenRequested = useRef(false);
    const [settings, setSettings] = useState<any>({});
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
      setIsClient(true);
    }, []);

    useEffect(() => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker
          .register('/firebase-messaging-sw.js')
          .then((registration) => {
            console.log('Service Worker registration successful, scope is:', registration.scope);
          })
          .catch((err) => {
            console.log('Service Worker registration failed, error:', err);
          });
      }
    }, []);

    useEffect(() => {
      if (typeof window !== 'undefined' && 'Notification' in window && user && !notificationTokenRequested.current) {
          requestForToken(user.uid);
          notificationTokenRequested.current = true;
      }
    }, [user]);

    useEffect(() => {
      const preventZoom = (e: TouchEvent) => {
        if (e.touches.length > 1) {
          e.preventDefault();
        }
      };
      document.addEventListener('touchmove', preventZoom, { passive: false });
      return () => {
        document.removeEventListener('touchmove', preventZoom);
      };
    }, []);

    useEffect(() => {
      if (!pathname.startsWith('/admin')) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }, [pathname]);

    useEffect(() => {
      const settingsDocRef = doc(db, 'settings', 'app-settings');
      const unsubscribeSettings = onSnapshot(settingsDocRef, (docSnap) => {
          if (docSnap.exists()) {
              setSettings(docSnap.data() as DocumentData);
          }
      });
      return () => {
          unsubscribeSettings();
      };
    }, []);

    const isPublicPage = 
      pathname === '/login' || 
      pathname === '/signup' || 
      pathname === '/forgot-password' ||
      pathname === '/download';
      
    const isAdminPage = pathname.startsWith('/admin');

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader className="h-10 w-10 text-primary" />
            </div>
        );
    }

    if (!isAdminPage) {
        if (!user && !isPublicPage) {
            router.replace('/login');
            return (
                <div className="flex h-screen w-full items-center justify-center bg-background">
                    <Loader className="h-10 w-10 text-primary" />
                </div>
            );
        }

        if (user && isPublicPage) {
            router.replace('/');
            return (
                <div className="flex h-screen w-full items-center justify-center bg-background">
                    <Loader className="h-10 w-10 text-primary" />
                </div>
            );
        }
    }
    
    const showBottomNav = !isAdminPage && !isPublicPage && !pathname.startsWith('/games');

    return (
      <>
        <main>
            {children}
        </main>
        {isClient && showBottomNav && <BottomNavbar settings={settings} />}
        <Toaster />
      </>
    );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <title>Auth Canvas</title>
        <meta name="description" content="Authentication with Firebase and Canvas" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </head>
      <body className={`${inter.className} font-body antialiased`}>
        <AuthProvider>
          <LayoutContent>{children}</LayoutContent>
        </AuthProvider>
      </body>
    </html>
  );
}
