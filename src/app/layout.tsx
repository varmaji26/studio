'use client';

import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AuthProvider } from '@/components/auth-provider';
import { useAuth } from '@/hooks/use-auth';
import { BottomNavbar } from '@/components/bottom-navbar';
import { doc, onSnapshot, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Inter } from 'next/font/google';
import { Loader } from '@/components/loader';
import { XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const inter = Inter({ subsets: ['latin'] });

function LayoutContent({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, loading } = useAuth();
    const [settings, setSettings] = useState<any>({});
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
      setIsClient(true);
    }, []);

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
      pathname === '/forgot-password';
      
    const isAdminPage = pathname.startsWith('/admin');
    const isSettingsPage = pathname === '/admin/settings';

    // Maintenance Mode Check
    const isAppClosed = settings.appEnabled === false;

    useEffect(() => {
        if (loading || isAdminPage) {
            return;
        }
        
        const isProtectedRoute = !isPublicPage && pathname !== '/download';

        if (!user && isProtectedRoute) {
            router.replace('/login');
        }

        if (user && isPublicPage) {
            router.replace('/');
        }
    }, [user, loading, pathname, router, isAdminPage, isPublicPage]);

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader className="h-10 w-10 text-primary" />
            </div>
        );
    }

    // Maintenance Mode Overlay (Allows only admin/settings)
    if (isAppClosed && !isSettingsPage) {
        return (
            <div className="flex h-screen w-full flex-col items-center justify-center bg-background p-6 text-center text-foreground">
                <div className="bg-red-500/10 p-8 rounded-full mb-6">
                    <XCircle className="h-24 w-24 text-red-500 animate-pulse" />
                </div>
                <h1 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">
                    Application Temporarily Unavailable
                </h1>
                <p className="text-muted-foreground text-base max-w-sm mb-8 font-medium">
                    The app is currently offline due to technical maintenance and guideline updates. We apologize for the inconvenience and will be back online shortly.
                </p>
                {user?.isAdmin && (
                    <Link href="/admin/settings">
                        <Button className="bg-red-600 hover:bg-red-700 text-white font-bold px-8 rounded-full shadow-lg shadow-red-600/20">
                            Admin: Access Settings
                        </Button>
                    </Link>
                )}
            </div>
        );
    }

    const isProtectedRoute = !isPublicPage && pathname !== '/download';
    if (!isAdminPage && ((!user && isProtectedRoute) || (user && isPublicPage))) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader className="h-10 w-10 text-primary" />
            </div>
        );
    }
    
    const showBottomNav = 
      !isAdminPage && 
      !isPublicPage && 
      !pathname.startsWith('/games') &&
      !pathname.startsWith('/jodi-chart') &&
      !pathname.startsWith('/panel-chart') &&
      pathname !== '/download';

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
        <title>MKING</title>
        <meta name="description" content="MKING App" />
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
