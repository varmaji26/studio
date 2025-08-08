
'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/loader';
import { auth, db, storage } from '@/lib/firebase';
import { collection, query, onSnapshot, orderBy, DocumentData, where, doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Menu,
  Crown,
  Banknote,
  Phone,
  Clock,
  ShieldCheck,
  Home as HomeIcon,
  BookUser,
  Star,
  User as UserIcon,
  Trophy,
  History,
  BarChart2,
  Wallet,
  Landmark,
  CreditCard,
  LogOut,
  MessageSquare,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import Autoplay from "embla-carousel-autoplay"
import { formatTime, cn, isBettingClosed, formatGameResult } from '@/lib/utils';
import { AddPointsDialog } from '@/components/add-points-dialog';
import { WithdrawFundsDialog } from '@/components/withdraw-funds-dialog';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { updateProfile } from 'firebase/auth';


interface Game extends DocumentData {
  id: string;
  name: string;
  result: string;
  openResult?: string;
  closeResult?: string;
  status: string;
  openTime: string;
  closeTime: string;
  active: boolean;
  activeDays?: string[];
}

interface Banner extends DocumentData {
    id: string;
    imageUrl: string;
}

interface AppSettings extends DocumentData {
    whatsappNumber?: string;
    callSupportNumber?: string;
    telegramLink?: string;
    welcomeBanner?: {
        imageUrl: string;
    };
    marquee?: {
        title: string;
        text: string;
        backgroundColor: string;
        textColor: string;
        logo?: {
            imageUrl: string;
        }
    }
}

interface UserProfile extends DocumentData {
  balance?: number;
}

const MarqueeItem = ({ settings }: { settings: AppSettings['marquee'] }) => {
    const title = settings?.title || 'MATKA KING';
    const text = settings?.text || '';
    const textColor = settings?.textColor || '#FFFFFF';
    const logoUrl = settings?.logo?.imageUrl;

    return (
        <div className="flex items-center mx-4" style={{ color: textColor }}>
            {logoUrl ? (
                <Image src={logoUrl} alt="Marquee Logo" width={24} height={24} className="h-6 w-6 mr-2" unoptimized/>
            ) : (
                <Trophy className="h-6 w-6 text-yellow-400 mr-2" />
            )}
            <div className="flex flex-col items-center">
                <span className="text-xl font-bold tracking-wider">{title}</span>
                <span className="text-xs">{text}</span>
            </div>
        </div>
    );
};


export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [games, setGames] = useState<Game[]>([]);
  const [gamesLoading, setGamesLoading] = useState(true);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [bannersLoading, setBannersLoading] = useState(true);
  const [settings, setSettings] = useState<AppSettings>({});
  const [userProfile, setUserProfile] = useState<UserProfile>({ balance: 0 });
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const autoplayPlugin = useRef(Autoplay({ delay: 3000, stopOnInteraction: true }));
  const [animatingGameId, setAnimatingGameId] = useState<string | null>(null);
  const [animatingButton, setAnimatingButton] = useState<string | null>(null);
  
  const currentDay = new Date().toLocaleString('en-US', { weekday: 'long' });

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const id = window.location.hash.substring(1);
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 500); // Delay to ensure content has rendered
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribeUserProfile = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
            setUserProfile(doc.data() as UserProfile);
        }
    });
    
    const gamesQuery = query(collection(db, 'games'));
    const unsubscribeGames = onSnapshot(gamesQuery, (querySnapshot) => {
      const gamesData: Game[] = [];
      querySnapshot.forEach((doc) => {
        gamesData.push({ id: doc.id, ...doc.data() } as Game);
      });
      
      const filteredGames = gamesData.filter(game => {
          if (!game.active) return false;
          if (!game.activeDays || game.activeDays.length === 0) return true;
          return game.activeDays.includes(currentDay);
      });

      filteredGames.sort((a, b) => {
          return a.openTime.localeCompare(b.openTime);
      });

      setGames(filteredGames);
      setGamesLoading(false);
    });

    const bannersQuery = query(collection(db, "banners"), orderBy("createdAt", "desc"));
    const unsubscribeBanners = onSnapshot(bannersQuery, (querySnapshot) => {
        const bannersData: Banner[] = [];
        querySnapshot.forEach((doc) => {
            bannersData.push({ id: doc.id, ...doc.data() } as Banner);
        });
        setBanners(bannersData);
        setBannersLoading(false);
    });
    
    const settingsDocRef = doc(db, 'settings', 'app-settings');
    const unsubscribeSettings = onSnapshot(settingsDocRef, (docSnap) => {
        if (docSnap.exists()) {
            setSettings(docSnap.data() as AppSettings);
        }
    });


    return () => {
        unsubscribeGames();
        unsubscribeBanners();
        unsubscribeSettings();
        unsubscribeUserProfile();
    };
  }, [user, currentDay]);

  const handleWhatsAppSupport = () => {
    if (settings.whatsappNumber) {
        window.open(`https://wa.me/${settings.whatsappNumber}`, '_blank');
    }
  };

  const handleCallSupport = () => {
    if (settings.callSupportNumber) {
        window.location.href = `tel:${settings.callSupportNumber}`;
    }
  };

  const handleTelegramSupport = () => {
    if (settings.telegramLink) {
        window.open(settings.telegramLink, '_blank');
    }
  };

  const handleLinkClick = () => {
    setIsSheetOpen(false);
  };
  
  const handlePlayNowClick = (e: React.MouseEvent<HTMLButtonElement>, gameId: string) => {
    e.preventDefault();
    setAnimatingGameId(gameId);
    setTimeout(() => {
        router.push(`/games/${gameId}`);
    }, 500); // Animation duration
  };

  const handleChartLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, gameId: string, type: 'jodi' | 'panel') => {
    e.preventDefault();
    const animationKey = `${gameId}-${type}`;
    setAnimatingButton(animationKey);
    setTimeout(() => {
        router.push(`/games/${gameId}/${type}-chart`);
        setAnimatingButton(null);
    }, 500); // Animation duration
  };


  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.replace('/login');
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader className="h-10 w-10 text-primary" />
      </div>
    );
  }

  const mobileNumber = user.email?.split('@')[0];
  const isAdmin = user.email === '8080601370@authcanvas.dev';
  
  const marqueeRepetitions = settings.marquee?.text ? 3 : 0;
  const marqueeItems = Array(marqueeRepetitions).fill(settings.marquee);

  const MarqueeContent = () => (
    <div className="flex">
        {marqueeItems.map((item, index) => (
            <MarqueeItem key={index} settings={item} />
        ))}
    </div>
  );

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <header className="flex items-center justify-between p-4 bg-card/80 backdrop-blur-sm sticky top-0 z-50 border-b border-white/10">
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-8 w-8 text-green-500" strokeWidth={3} />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="bg-card border-r-0 text-foreground flex flex-col p-0">
             <div className="flex-1 overflow-y-auto">
                <SheetHeader className="p-6">
                <SheetTitle className="text-primary text-2xl flex items-center gap-2">
                    <Crown className="h-7 w-7" />
                    MATKA KING
                </SheetTitle>
                </SheetHeader>
                <div className="py-4">
                <div className="flex flex-col items-center space-y-2">
                     <Avatar className="h-20 w-20">
                        <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User'} />
                        <AvatarFallback>{user.displayName?.charAt(0) ?? 'U'}</AvatarFallback>
                    </Avatar>
                    <p className="font-bold text-lg">{user.displayName}</p>
                    <p className="text-muted-foreground">+91 {mobileNumber}</p>
                </div>
                </div>
                <Separator className="bg-white/10 my-2" />
                <nav className="flex flex-col gap-2 p-4">
                    <button onClick={handleLogout} className="flex items-center gap-3 p-3 rounded-md hover:bg-primary/10 transition-colors text-left w-full">
                        <LogOut className="h-5 w-5 text-primary" />
                        <span>Logout</span>
                    </button>
                    <Link href="/" onClick={handleLinkClick} className="flex items-center gap-3 p-3 rounded-md hover:bg-primary/10 transition-colors">
                        <HomeIcon className="h-5 w-5 text-primary" />
                        <span>Home</span>
                    </Link>
                    <Link href="/profile" onClick={handleLinkClick} className="flex items-center gap-3 p-3 rounded-md hover:bg-primary/10 transition-colors">
                        <UserIcon className="h-5 w-5 text-primary" />
                        <span>Profile</span>
                    </Link>
                    <Link href="/contact" onClick={handleLinkClick} className="flex items-center gap-3 p-3 rounded-md hover:bg-primary/10 transition-colors">
                        <BookUser className="h-5 w-5 text-primary" />
                        <span>Contact</span>
                    </Link>
                    <WithdrawFundsDialog user={user}>
                        <button className="flex items-center gap-3 p-3 rounded-md hover:bg-primary/10 transition-colors text-left w-full">
                            <Landmark className="h-5 w-5 text-primary" />
                            <span>Withdraw Funds</span>
                        </button>
                    </WithdrawFundsDialog>
                    <Link href="/payment-history" onClick={handleLinkClick} className="flex items-center gap-3 p-3 rounded-md hover:bg-primary/10 transition-colors">
                        <CreditCard className="h-5 w-5 text-primary" />
                        <span>Payment History</span>
                    </Link>
                    <Link href="/rate-card" onClick={handleLinkClick} className="flex items-center gap-3 p-3 rounded-md hover:bg-primary/10 transition-colors">
                        <Star className="h-5 w-5 text-primary" />
                        <span>Rate Card</span>
                    </Link>
                    <Link href="/win-history" onClick={handleLinkClick} className="flex items-center gap-3 p-3 rounded-md hover:bg-primary/10 transition-colors">
                        <Trophy className="h-5 w-5 text-primary" />
                        <span>Win History</span>
                    </Link>
                    <Link href="/bids-history" onClick={handleLinkClick} className="flex items-center gap-3 p-3 rounded-md hover:bg-primary/10 transition-colors">
                        <History className="h-5 w-5 text-primary" />
                        <span>Bids History</span>
                    </Link>
                    <Link href="#" onClick={handleLinkClick} className="flex items-center gap-3 p-3 rounded-md hover:bg-primary/10 transition-colors">
                        <BarChart2 className="h-5 w-5 text-primary" />
                        <span>Chart</span>
                    </Link>
                </nav>
            </div>
            <div className="p-4 border-t border-white/10">
            </div>
          </SheetContent>
        </Sheet>
        <div className="flex items-center gap-2 rounded-lg bg-black/30 px-3 py-1.5 border border-white/10">
          <Crown className="h-6 w-6 text-primary" />
          <span className="font-bold text-2xl text-white">
            MATKA <span className="text-primary">KING</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-card/90 border border-white/10 rounded-full px-3 py-1">
                <Wallet className="h-6 w-6 text-green-400" />
                <span className="font-bold text-lg text-white">₹{userProfile?.balance?.toFixed(0) ?? '0'}</span>
            </div>
          {isAdmin && (
            <Link href="/admin">
              <Button size="icon" aria-label="Admin Panel" className="bg-green-500 text-white hover:bg-green-600">
                <ShieldCheck className="h-6 w-6" strokeWidth={2.5} />
              </Button>
            </Link>
          )}
        </div>
      </header>
      
      {settings.marquee?.text && (
        <div 
            className="relative flex overflow-x-hidden text-white py-2" 
            style={{ backgroundColor: settings.marquee.backgroundColor || '#b91c1c' }}
        >
            <div className="animate-marquee whitespace-nowrap flex">
                <MarqueeContent />
                <MarqueeContent />
            </div>
        </div>
      )}
      
      <main className="flex flex-col gap-4 p-4 pb-24">
        {settings.welcomeBanner?.imageUrl && (
             <Card className="bg-card/80 border-white/10 shadow-lg">
                <CardContent className="p-0">
                    <Image
                        src={settings.welcomeBanner.imageUrl}
                        alt="Welcome Banner"
                        width={1200}
                        height={400}
                        className="w-full h-auto object-cover rounded-lg"
                        data-ai-hint="king"
                        unoptimized
                    />
                </CardContent>
            </Card>
        )}
        
        {bannersLoading ? (
            <Card className="bg-card/80 border-white/10 shadow-lg flex items-center justify-center h-[200px]">
                <Loader />
            </Card>
        ) : banners.length > 0 && (
            <Carousel 
                plugins={[autoplayPlugin.current]}
                className="w-full"
                onMouseEnter={autoplayPlugin.current.stop}
                onMouseLeave={autoplayPlugin.current.reset}
            >
                <CarouselContent>
                    {banners.map((banner) => (
                        <CarouselItem key={banner.id}>
                        <Card className="bg-card/80 border-white/10 shadow-lg overflow-hidden">
                            <CardContent className="p-0">
                                <img
                                    src={banner.imageUrl}
                                    alt="Banner"
                                    className="w-full h-auto max-h-[250px] object-cover"
                                />
                            </CardContent>
                        </Card>
                        </CarouselItem>
                    ))}
                </CarouselContent>
                <CarouselPrevious className="left-4" />
                <CarouselNext className="right-4" />
            </Carousel>
        )}

        <Card className="bg-card/80 border-white/10 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl text-center font-bold">Latest Results</CardTitle>
          </CardHeader>
          <CardContent>
            {gamesLoading ? (
              <div className="flex justify-center items-center h-24">
                <Loader className="h-8 w-8 text-primary" />
              </div>
            ) : games.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {games.map((game) => (
                  <div key={game.id} className="flex justify-between items-center bg-slate-800/80 p-3 rounded-lg border border-slate-700">
                    <span className="text-sm font-medium text-white">{game.name}</span>
                    <div className="text-right">
                       <span className="text-sm font-bold text-primary">{formatGameResult(game)}</span>
                      <span className="text-xs text-muted-foreground ml-2">({formatTime(game.closeTime)})</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground">No results available right now.</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/80 border-white/10 shadow-lg">
            <CardHeader>
                <CardTitle className="text-xl">Notice</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">Welcome to MATKA KING! Play responsibly and enjoy your gaming experience.</p>
            </CardContent>
        </Card>

        <Card className="bg-card/80 border-white/10 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl text-center">Matka Games</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {gamesLoading ? (
              <div className="flex justify-center items-center h-24">
                <Loader className="h-8 w-8 text-primary" />
              </div>
            ) : games.length > 0 ? (
              games.map((game) => {
                const bettingClosed = isBettingClosed(game.closeTime);
                return (
                    <div
                        key={game.id}
                        id={game.id}
                        className={cn(
                            "rounded-lg p-4 text-center space-y-3 animated-border",
                            animatingGameId === game.id && "animate-pulse-once"
                        )}
                    >
                        <div className="relative z-10 space-y-3">
                            <h3 className="text-xl font-bold text-white">{game.name}</h3>
                            <div className="bg-yellow-400 text-black font-bold text-lg rounded-lg py-2 shadow-lg flex items-center justify-between px-2">
                                <Link
                                    href={`/games/${game.id}/jodi-chart`}
                                    onClick={(e) => handleChartLinkClick(e, game.id, 'jodi')}
                                    className={cn(
                                        "bg-orange-500 text-white px-3 py-1 rounded-md text-sm font-bold shadow-md",
                                        animatingButton === `${game.id}-jodi` && "animate-pulse-once"
                                    )}
                                >
                                    Jodi
                                </Link>
                                <span>{formatGameResult(game)}</span>
                                <Link
                                    href={`/games/${game.id}/panel-chart`}
                                    onClick={(e) => handleChartLinkClick(e, game.id, 'panel')}
                                    className={cn(
                                        "bg-orange-500 text-white px-3 py-1 rounded-md text-sm font-bold shadow-md",
                                        animatingButton === `${game.id}-panel` && "animate-pulse-once"
                                    )}
                                >
                                    Panel
                                </Link>
                            </div>
                            <p className={cn(
                                "text-sm font-bold",
                                bettingClosed ? "text-red-500" : "text-green-500"
                            )}>
                                {bettingClosed ? 'Betting Closed' : game.status}
                            </p>
                            <Button 
                                onClick={(e) => handlePlayNowClick(e, game.id)}
                                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold text-lg h-12 rounded-lg shadow-lg [text-shadow:2px_2px_4px_#000]"
                                disabled={bettingClosed}
                            >
                                Play Now
                            </Button>
                            <div className="flex items-center justify-center text-sm font-bold text-white mt-2 whitespace-nowrap">
                                <Clock className="h-4 w-4 mr-2" />
                                <span>Open: {formatTime(game.openTime)} | Close: {formatTime(game.closeTime)}</span>
                            </div>
                        </div>
                    </div>
                )
              })
            ) : (
              <p className="text-center text-muted-foreground">No games available right now.</p>
            )}
          </CardContent>
        </Card>
      </main>

       <footer className="fixed bottom-0 left-0 right-0 bg-card border-t border-white/10 p-2 z-50">
          <div className="grid grid-cols-4 gap-2">
            <AddPointsDialog user={user}>
                <button className="flex flex-col items-center justify-center text-white text-xs gap-1 p-1 rounded-md bg-amber-500 hover:bg-amber-600">
                    <Banknote className="h-6 w-6 [filter:drop-shadow(1px_1px_1px_rgba(0,0,0,0.7))]" />
                    <span className="font-bold [text-shadow:1px_1px_2px_black]">Deposit</span>
                </button>
            </AddPointsDialog>
             <button
              onClick={handleWhatsAppSupport}
              disabled={!settings.whatsappNumber}
              className="flex flex-col items-center justify-center text-white text-xs gap-1 disabled:opacity-50 bg-green-500 hover:bg-green-600 p-1 rounded-md"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 [filter:drop-shadow(1px_1px_1px_rgba(0,0,0,0.7))]"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.886-.001 2.269.655 4.357 1.846 6.166l-1.138 4.162 4.277-1.122z" /></svg>
              <span className="font-bold [text-shadow:1px_1px_2px_black]">WhatsApp</span>
            </button>
            <button
              onClick={handleTelegramSupport}
              disabled={!settings.telegramLink}
              className="flex flex-col items-center justify-center text-white text-xs gap-1 disabled:opacity-50 bg-blue-500 hover:bg-blue-600 p-1 rounded-md"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 [filter:drop-shadow(1px_1px_1px_rgba(0,0,0,0.7))]"><path d="M9.78 18.65l.28-4.23l7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3L3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.57c-.28 1.1-.86 1.32-1.74.84l-4.97-3.6-2.44 2.34c-.27.27-.5.4-.85.4z" /></svg>
              <span className="font-bold [text-shadow:1px_1px_2px_black]">Telegram</span>
            </button>
            <button
              onClick={handleCallSupport}
              disabled={!settings.callSupportNumber}
              className="flex flex-col items-center justify-center text-white text-xs gap-1 disabled:opacity-50 bg-red-500 hover:bg-red-600 p-1 rounded-md"
            >
              <Phone className="h-6 w-6 [filter:drop-shadow(1px_1px_1px_rgba(0,0,0,0.7))]" />
              <span className="font-bold [text-shadow:1px_1px_2px_black]">Call Support</span>
            </button>
          </div>
        </footer>
    </div>
  );
}
