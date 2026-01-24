'use client';

import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { requestForToken } from '@/lib/firebase-messaging';
import { useAuth } from '@/hooks/use-auth';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const { user } = useAuth();
  const notificationTokenRequested = useRef(false);

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
  }, [user?.uid]);

  useEffect(() => {
    // Prevent zoom
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
    // Set default theme to dark for the user panel
    if (!pathname.startsWith('/admin')) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [pathname]);


  return (
    <html lang="en">
      <head>
        <title>Auth Canvas</title>
        <meta name="description" content="Authentication with Firebase and Canvas" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"></link>
        <script src="https://unpkg.com/@lottiefiles/dotlottie-wc@latest/dist/dotlottie-wc.js" type="module"></script>
      </head>
      <body className="font-body antialiased">
        <main>
            {children}
        </main>
        <Toaster />
      </body>
    </html>
  );
}
