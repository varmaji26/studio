
'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/loader';
import { auth, db } from '@/lib/firebase';
import { collection, query, onSnapshot, orderBy, DocumentData, where, doc, getDoc } from 'firebase/firestore';
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
} from 'lucide-react';
import Link from 'next/link';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import Autoplay from "embla-carousel-autoplay"
import { formatTime, cn } from '@/lib/utils';
import { AddPointsDialog } from '@/components/add-points-dialog';
import { WithdrawFundsDialog } from '@/components/withdraw-funds-dialog';

interface Game extends DocumentData {
  id: string;
  name: string;
  result: string;
  openResult?: string;
  closeResult?: string;
  status: string;
  openTime: string;
  closeTime: string;
}

interface Banner extends DocumentData {
    id: string;
    imageUrl: string;
}

interface AppSettings extends DocumentData {
    whatsappNumber?: string;
    callSupportNumber?: string;
}

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [games, setGames] = useState<Game[]>([]);
  const [gamesLoading, setGamesLoading] = useState(true);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [bannersLoading, setBannersLoading] = useState(true);
  const [settings, setSettings] = useState<AppSettings>({});
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const autoplayPlugin = useRef(Autoplay({ delay: 3000, stopOnInteraction: true }));
  const [animatingGameId, setAnimatingGameId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    
    const gamesQuery = query(collection(db, 'games'), where('active', '==', true));
    const unsubscribeGames = onSnapshot(gamesQuery, (querySnapshot) => {
      const gamesData: Game[] = [];
      querySnapshot.forEach((doc) => {
        gamesData.push({ id: doc.id, ...doc.data() } as Game);
      });
      setGames(gamesData);
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
    };
  }, [user]);

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

  const isAdmin = user && user.email === '8080601370@authcanvas.dev';
  const mobileNumber = user.email?.split('@')[0];

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
                    <div className="p-3 bg-primary/20 rounded-full">
                        <UserIcon className="h-10 w-10 text-primary" />
                    </div>
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
                    <Link href="/profile" onClick={handleLinkClick} className="flex items-center gap-3 p-3 rounded-md hover:bg-primary/10 transition-colors">
                        <UserIcon className="h-5 w-5 text-primary" />
                        <span>Profile</span>
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
                    <Link href="/profile" onClick={handleLinkClick} className="flex items-center gap-3 p-3 rounded-md hover:bg-primary/10 transition-colors">
                        <Wallet className="h-5 w-5 text-primary" />
                        <span>Point Funds</span>
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
          {isAdmin && (
            <Link href="/admin">
              <Button size="icon" aria-label="Admin Panel" className="bg-green-500 text-white hover:bg-green-600">
                <ShieldCheck className="h-6 w-6" strokeWidth={2.5} />
              </Button>
            </Link>
          )}
        </div>
      </header>
      <main className="flex flex-col gap-4 p-4">
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
          <CardContent className="p-6 text-center">
            <h1 className="text-3xl font-bold animate-pulse">
              Welcome to <span className="text-primary">MATKA KING</span>
            </h1>
            <p className="text-muted-foreground mt-2">Get the latest game reviews, breaking news, in-depth guides, and join a thriving community of gamers!</p>
            <Button className="mt-6 w-full max-w-xs bg-primary text-primary-foreground font-bold text-lg h-12 rounded-lg">Explore Latest Articles</Button>
          </CardContent>
        </Card>

        <Card className="bg-card/80 border-white/10 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-2 sm:gap-4">
             <AddPointsDialog user={user}>
                <Button className="h-16 flex-col gap-1 bg-primary text-primary-foreground hover:bg-primary/90">
                    <Banknote className="h-6 w-6" />
                    <span className="text-xs">Deposit Funds</span>
                </Button>
             </AddPointsDialog>
            <Button 
                className="h-16 flex-col gap-1 bg-green-500 text-white hover:bg-green-600"
                onClick={handleWhatsAppSupport}
                disabled={!settings.whatsappNumber}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-6 w-6"
                    >
                    <path
                        d="M16.75 13.96c.25.13.42.2.46.28.05.09.04.28-.12.58-.12.24-.71.82-1.02.99-.28.16-.58.2-.88.13-.3-.07-1.25-.47-2.38-1.42s-1.8-2.1-1.88-2.2-.08-.12,0-.2.2-.24.28-.32.16-.18.24-.28.04-.16,0-.32c-.04-.16-1.02-2.44-1.4-3.22-.38-.78-.76-.67-.98-.68-.2-.01-.43,0-.65,0s-.58.08-.88.42-.99 1.18-.99 2.89,1.02 3.36,1.18 3.59.86 1.39,2.89 2.58c2.14 1.28,2.98 1.1,3.59.99.58-.12,1.02-.47,1.18-.91.16-.42.16-.78.12-.86s-.16-.13-.32-.24Z"
                    />
                    <path
                        fillRule="evenodd"
                        d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2ZM5.93 16.51l.39.23c1.48.88,3.13 1.36,4.86 1.36h.02c3.99 0,7.24-3.25,7.24-7.24 0-3.99-3.25-7.24-7.24-7.24a7.12 7.12,0,0,0,-6.3,10.23l-1.33,4.01,4.13-1.36Z"
                        clipRule="evenodd"
                    />
                </svg>
              <span className="text-xs">WhatsApp</span>
            </Button>
            <Button 
              className="h-16 flex-col gap-1 bg-red-500 text-white hover:bg-red-600"
              onClick={handleCallSupport}
              disabled={!settings.callSupportNumber}
            >
              <Phone className="h-6 w-6" />
              <span className="text-xs">Call Support</span>
            </Button>
          </CardContent>
        </Card>

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
                       <span className="text-sm font-bold text-primary">{game.result || `${game.openResult || '***'}-**-${game.closeResult || '**'}`}</span>
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
              games.map((game) => (
                <div
                    key={game.id}
                    className={cn(
                        "rounded-lg p-4 text-center space-y-3 animated-border",
                        animatingGameId === game.id && "animate-pulse-once"
                    )}
                >
                    <div className="relative z-10 space-y-3">
                        <h3 className="text-xl font-bold text-white">{game.name}</h3>
                        <div className="bg-yellow-400 text-black font-bold text-lg rounded-lg py-2 shadow-lg">
                           {game.result || `${game.openResult || '***'}-**-${game.closeResult || '**'}`}
                        </div>
                        <p className="text-sm text-yellow-300">{game.status}</p>
                        <Button 
                            onClick={(e) => handlePlayNowClick(e, game.id)}
                            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold text-lg h-12 rounded-lg shadow-lg">
                            <span>Play Now</span>
                        </Button>
                        <div className="flex items-center justify-center text-xs text-muted-foreground mt-2">
                        <Clock className="h-4 w-4 mr-2" />
                        <span>Open: {formatTime(game.openTime)} | Close: {formatTime(game.closeTime)}</span>
                        </div>
                    </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground">No games available right now.</p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
