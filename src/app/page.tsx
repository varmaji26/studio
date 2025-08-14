
'use client';

import { useEffect, useState, useRef, Suspense, memo, useMemo } from 'react';
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
  Gem,
  Sun,
  Moon,
  Download,
  BellRing,
  X,
  Gift,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import Autoplay from "embla-carousel-autoplay"
import { formatTime, cn, isBettingClosed, formatGameResult } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { updateProfile } from 'firebase/auth';
import { BottomNavbar } from '@/components/bottom-navbar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { motion } from 'framer-motion';


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

interface Notification extends DocumentData {
    id: string;
    title: string;
    message: string;
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
        },
        logoSize?: number;
        titleSize?: number;
        textSize?: number;
    };
    noticeText?: string;
    bonusPopup?: {
        enabled: boolean;
        imageUrl: string;
        link: string;
    }
}

interface UserProfile extends DocumentData {
  balance?: number;
  bonusBalance?: number;
}

// Memoized Game Card Component for performance optimization
const GameCard = memo(function GameCard({
    game
}: {
    game: Game
}) {
    const bettingClosed = isBettingClosed(game.closeTime);

    const PlayButton = () => (
        <Button
            className={cn(
                "w-full h-12 text-lg font-bold text-white rounded-lg shadow-md transition-transform active:scale-95",
                bettingClosed ? "bg-gray-600 cursor-not-allowed" : "bg-orange-600 hover:bg-orange-700"
            )}
            disabled={bettingClosed}
        >
            Play Now
        </Button>
    );

    return (
        <div id={game.id} className="bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-slate-700 rounded-2xl p-4 space-y-3 shadow-lg shadow-white/10 animate-breathe">
            <h3 className="text-xl font-bold text-white text-center">{game.name}</h3>
            
            <div className="bg-yellow-400 rounded-full flex items-center justify-between p-1">
                <Link href={`/games/${game.id}/jodi-chart`}>
                    <Button variant="default" className="bg-orange-500 text-white rounded-full text-xs h-8 shadow-md hover:bg-orange-600">Jodi</Button>
                </Link>
                <span className="text-black font-bold text-lg tracking-wider">{formatGameResult(game)}</span>
                <Link href={`/games/${game.id}/panel-chart`}>
                     <Button variant="default" className="bg-orange-500 text-white rounded-full text-xs h-8 shadow-md hover:bg-orange-600">Panel</Button>
                </Link>
            </div>
            
            <div className="h-8 flex items-center justify-center">
                <p className={cn(
                    "text-center font-semibold rounded-md text-base",
                    bettingClosed ? 'text-red-400' : (game.status.toLowerCase().includes('open') ? 'text-green-400' : 'text-red-400')
                )}>
                    {bettingClosed ? 'Betting Closed' : game.status}
                </p>
            </div>
            
            <Link href={bettingClosed ? `/#${game.id}` : `/games/${game.id}`} className={cn(bettingClosed && "pointer-events-none")}>
                <PlayButton />
            </Link>

            <div className="flex items-center justify-center text-xs font-semibold text-white bg-slate-800 p-2 rounded-lg gap-2">
                <Clock className="h-4 w-4" />
                <span>Open: {formatTime(game.openTime)} | Close: {formatTime(game.closeTime)}</span>
            </div>
        </div>
    );
});


export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [games, setGames] = useState<Game[]>([]);
  const [gamesLoading, setGamesLoading] = useState(true);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [bannersLoading, setBannersLoading] = useState(true);
  const [settings, setSettings] = useState<AppSettings>({});
  const [userProfile, setUserProfile] = useState<UserProfile>({ balance: 0, bonusBalance: 0 });
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const autoplayPlugin = useRef(Autoplay({ delay: 3000, stopOnInteraction: true }));
  const [animatingButton, setAnimatingButton] = useState<string | null>(null);
  const [latestNotification, setLatestNotification] = useState<Notification | null>(null);
  const [showNotification, setShowNotification] = useState(false);
  const [showBonusPopup, setShowBonusPopup] = useState(false);
  
  const currentDay = useMemo(() => new Date().toLocaleString('en-US', { weekday: 'long' }), []);

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
            const appSettings = docSnap.data() as AppSettings;
            setSettings(appSettings);
            
            // Bonus Popup Logic
            if (appSettings.bonusPopup?.enabled && appSettings.bonusPopup.imageUrl) {
                setShowBonusPopup(true);
            }
        }
    });

    // Fetch latest notification
    const notificationsQuery = query(collection(db, "notifications"), orderBy("createdAt", "desc"), where("createdAt", "!=", null));
    const unsubscribeNotifications = onSnapshot(notificationsQuery, (snapshot) => {
        if (!snapshot.empty) {
            const latestNotif = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Notification;
            const lastSeenNotifId = localStorage.getItem('lastSeenNotificationId');
            if (latestNotif.id !== lastSeenNotifId) {
                 setLatestNotification(latestNotif);
                 setShowNotification(true);
            }
        }
    });

    return () => {
        unsubscribeGames();
        unsubscribeBanners();
        unsubscribeSettings();
        unsubscribeUserProfile();
        unsubscribeNotifications();
    };
  }, [user, currentDay]);

  const handleDismissNotification = () => {
    if (latestNotification) {
        localStorage.setItem('lastSeenNotificationId', latestNotification.id);
        setShowNotification(false);
    }
  };
  
  const handleBonusPopupClose = () => {
    setShowBonusPopup(false);
  };

  const handleClaimBonus = () => {
    if (settings.bonusPopup?.link) {
        router.push(settings.bonusPopup.link);
        handleBonusPopupClose();
    }
  };


  const handleLinkClick = () => {
    setIsSheetOpen(false);
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
  
  const marqueeRepetitions = settings.marquee?.text ? 3 : 0;
  const marqueeItems = Array(marqueeRepetitions).fill(settings.marquee);

  const MarqueeItem = ({ settings }: { settings: AppSettings['marquee'] }) => {
    const title = settings?.title || 'MATKA KING';
    const text = settings?.text || '';
    const textColor = settings?.textColor || '#FFFFFF';
    const logoUrl = settings?.logo?.imageUrl;
    const logoSize = settings?.logoSize || 24;
    const titleSize = settings?.titleSize || 20;
    const textSize = settings?.textSize || 12;

    return (
        <div className="flex items-center mx-4" style={{ color: textColor }}>
            {logoUrl ? (
                <Image src={logoUrl} alt="Marquee Logo" width={logoSize} height={logoSize} className="mr-2" style={{ width: `${logoSize}px`, height: `${logoSize}px`}} unoptimized/>
            ) : (
                <Trophy className="text-yellow-400 mr-2" style={{ width: `${logoSize}px`, height: `${logoSize}px`}} />
            )}
            <div className="flex flex-col items-center">
                <span className="font-bold tracking-wider" style={{ fontSize: `${titleSize}px` }}>{title}</span>
                <span style={{ fontSize: `${textSize}px`}}>{text}</span>
            </div>
        </div>
    );
};

  const MarqueeContent = () => (
    <div className="flex">
        {marqueeItems.map((item, index) => (
            <MarqueeItem key={index} settings={item} />
        ))}
    </div>
  );
  
  const totalBalance = (userProfile?.balance || 0) + (userProfile?.bonusBalance || 0);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex items-center justify-between p-4 bg-card/80 backdrop-blur-sm sticky top-0 z-50 border-b border-white/10">
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-8 w-8 text-green-500" strokeWidth={3} />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="bg-card border-r-0 text-foreground flex flex-col p-0">
             <div className="flex-1 overflow-y-auto">
                <SheetHeader className="p-6 flex flex-row justify-between items-center">
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
                    <Link href="/download" onClick={handleLinkClick} className="flex items-center gap-3 p-3 rounded-md hover:bg-primary/10 transition-colors">
                        <Download className="h-5 w-5 text-primary" />
                        <span>Download App</span>
                    </Link>
                     <Link href="/golden-ank" onClick={handleLinkClick} className="flex items-center gap-3 p-3 rounded-md hover:bg-primary/10 transition-colors">
                        <Gem className="h-5 w-5 text-primary" />
                        <span>Golden Ank</span>
                    </Link>
                    <Link href="/rate-card" onClick={handleLinkClick} className="flex items-center gap-3 p-3 rounded-md hover:bg-primary/10 transition-colors">
                        <Star className="h-5 w-5 text-primary" />
                        <span>Rate Card</span>
                    </Link>
                    <Link href="#" onClick={handleLinkClick} className="flex items-center gap-3 p-3 rounded-md hover:bg-primary/10 transition-colors">
                        <BarChart2 className="h-5 w-5 text-primary" />
                        <span>Chart</span>
                    </Link>
                </nav>
            </div>
            <div className="p-4 border-t border-white/10">
                 {user.isAdmin && (
                    <Link href="/admin">
                        <Button variant="secondary" className="w-full">
                            <ShieldCheck className="mr-2 h-5 w-5" />
                            Admin Panel
                        </Button>
                    </Link>
                 )}
            </div>
          </SheetContent>
        </Sheet>
        <div className="flex items-center gap-2 rounded-lg bg-black/30 px-2 py-1 border border-white/10">
          <Crown className="h-5 w-5 text-primary" />
          <span className="font-bold text-xl text-foreground">
            MATKA <span className="text-primary">KING</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
            <div className="flex flex-col items-end">
                <div className="flex items-center gap-2 bg-card/90 border border-white/10 rounded-full px-3 py-1">
                    <Wallet className="h-5 w-5 text-green-400" />
                    <span className="font-bold text-md text-white">₹{totalBalance.toFixed(0) ?? '0'}</span>
                </div>
            </div>
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
      
      <main className="flex flex-col gap-4 p-4 pb-28">
         {showNotification && latestNotification && (
            <Alert variant="default" className="bg-primary/10 border-primary/20 relative animate-shake">
                 <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6" onClick={handleDismissNotification}>
                    <X className="h-4 w-4" />
                 </Button>
                <BellRing className="h-4 w-4" />
                <AlertTitle className="font-bold">{latestNotification.title}</AlertTitle>
                <AlertDescription>
                    {latestNotification.message}
                </AlertDescription>
            </Alert>
        )}
        
        {/* Bonus Popup Dialog */}
        <Dialog open={showBonusPopup} onOpenChange={(isOpen) => !isOpen && handleBonusPopupClose()}>
            <DialogContent className="p-0 border-0 bg-transparent max-w-[280px] shadow-none" onInteractOutside={handleBonusPopupClose}>
                <DialogHeader>
                    <DialogTitle className="sr-only">Bonus Offer</DialogTitle>
                </DialogHeader>
                <div className="relative">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ 
                            scale: 1, 
                            opacity: 1,
                            rotate: [0, -1, 1, -1, 1, 0],
                        }}
                        transition={{ 
                            duration: 0.5, 
                            type: 'spring',
                            rotate: {
                                repeat: Infinity,
                                repeatDelay: 1,
                                duration: 0.4
                            }
                        }}
                        className="shadow-2xl shadow-primary/30 rounded-lg overflow-hidden"
                    >
                        <Image 
                            src={settings.bonusPopup?.imageUrl || ''} 
                            alt="Bonus Offer" 
                            width={400} 
                            height={400} 
                            className="w-full h-auto"
                            data-ai-hint="casino bonus"
                            unoptimized
                        />
                        <div className="p-4 bg-background">
                            <motion.div whileTap={{ scale: 0.95 }}>
                                <Button className="w-full h-12 text-lg font-bold bg-gradient-to-r from-orange-400 to-yellow-500 text-white shadow-lg" onClick={handleClaimBonus}>
                                    Claim Bonus Now
                                </Button>
                            </motion.div>
                        </div>
                    </motion.div>
                </div>
            </DialogContent>
        </Dialog>


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
                        priority
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
              <div className="grid grid-cols-2 gap-3">
                {games.map((game) => (
                  <div key={game.id} className="flex flex-col items-center justify-center bg-[#34a387] p-2 rounded-lg border border-black text-center">
                    <span className="text-xs font-medium text-white [text-shadow:1px_1px_2px_#000]">{game.name}</span>
                    <div className="flex flex-wrap items-baseline justify-center gap-x-1">
                        <span className="text-xs font-bold text-black">{formatGameResult(game, true)}</span>
                        <span className="text-xs text-black/70">({formatTime(game.closeTime)})</span>
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
                <p className="text-muted-foreground">{settings.noticeText || 'Welcome to MATKA KING! Play responsibly and enjoy your gaming experience.'}</p>
            </CardContent>
        </Card>

        <Card className="bg-card/80 border-white/10 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl text-center">Matka Games</CardTitle>
          </CardHeader>
          <CardContent>
            {gamesLoading ? (
              <div className="flex justify-center items-center h-24">
                <Loader className="h-8 w-8 text-primary" />
              </div>
            ) : games.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                    {games.map((game) => (
                        <GameCard 
                            key={game.id}
                            game={game}
                        />
                    ))}
                </div>
            ) : (
              <p className="text-center text-muted-foreground">No games available right now.</p>
            )}
          </CardContent>
        </Card>
      </main>
      
      <BottomNavbar settings={settings} />
    </div>
  );
}
