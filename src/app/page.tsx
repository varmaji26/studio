
'use client';

import { useEffect, useState, useRef, Suspense, memo, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/loader';
import { auth, db, storage } from '@/lib/firebase';
import { collection, query, onSnapshot, orderBy, DocumentData, where, doc, getDoc, updateDoc, getDocs, limit } from 'firebase/firestore';
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
  IndianRupee,
  XCircle,
  Copy,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { formatTime, cn, isBettingClosed, formatGameResult } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { updateProfile } from 'firebase/auth';
import { BottomNavbar } from '@/components/bottom-navbar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogDescription } from '@/components/ui/dialog';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel"
import Autoplay from "embla-carousel-react"
import { Skeleton } from '@/components/ui/skeleton';


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
        },
        logoSize?: number;
        titleSize?: number;
        textSize?: number;
    };
    notice?: {
        text: string;
        enabled: boolean;
    };
    bonusPopup?: {
        enabled: boolean;
        imageUrl: string;
        link: string;
    }
}

interface UserProfile extends DocumentData {
  balance?: number;
  bonusBalance?: number;
  referralCode?: string;
}

// Memoized Game Card Component for performance optimization
const GameCard = memo(function GameCard({
    game,
    onBettingClosedClick,
    isActive
}: {
    game: Game;
    onBettingClosedClick: (game: Game) => void;
    isActive: boolean;
}) {
    const bettingClosed = isBettingClosed(game.closeTime);
    const isPlayable = isActive && !bettingClosed;

    return (
        <div id={game.id} className="bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700 rounded-lg p-3 shadow-lg shadow-black/30">
            <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                    <h3 className="text-lg font-bold text-white truncate">{game.name}</h3>
                    <div className="text-[10px] text-muted-foreground">
                        <span>Open: {formatTime(game.openTime)} | Close: {formatTime(game.closeTime)}</span>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-lg font-bold text-yellow-400">{formatGameResult(game)}</p>
                    <p className={cn(
                        "text-xs font-semibold",
                        !isPlayable ? 'text-red-400' : (game.status.toLowerCase().includes('open') ? 'text-green-400' : 'text-red-400')
                    )}>
                        {!isActive ? 'Market Off' : !isPlayable ? 'Market is Close' : game.status}
                    </p>
                </div>
            </div>
            <div className="border-t border-white/20 pt-2">
                <div className="relative mt-2 h-12">
                    {/* Main Playable Button or Disabled Button */}
                    {isPlayable ? (
                        <Link href={`/games/${game.id}`} className="block h-full">
                            <div className="w-full h-full flex items-center justify-center bg-orange-600 text-white font-bold rounded-full text-lg shadow-lg">
                                Play Now
                            </div>
                        </Link>
                    ) : (
                        <div 
                            onClick={() => onBettingClosedClick(game)}
                            className="w-full h-full flex items-center justify-center bg-gray-600 text-white font-bold rounded-full text-lg shadow-lg cursor-not-allowed"
                        >
                            Play Now
                        </div>
                    )}

                    {/* Jodi Button positioned over the main button */}
                    <Link href={`/games/${game.id}/jodi-chart`} className="absolute top-1/2 left-1 -translate-y-1/2 z-10">
                        <div className="h-10 w-10 flex items-center justify-center p-0 rounded-full bg-yellow-400 hover:bg-yellow-500 text-black text-xs font-bold shadow-md">
                            Jodi
                        </div>
                    </Link>

                    {/* Panel Button positioned over the main button */}
                    <Link href={`/games/${game.id}/panel-chart`} className="absolute top-1/2 right-1 -translate-y-1/2 z-10">
                        <div className="h-10 w-10 flex items-center justify-center p-0 rounded-full bg-yellow-400 hover:bg-yellow-500 text-black text-xs font-bold shadow-md">
                            Panel
                        </div>
                    </Link>
                </div>
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
  const [settings, setSettings] = useState<AppSettings>({});
  const [userProfile, setUserProfile] = useState<UserProfile>({ balance: 0, bonusBalance: 0 });
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [animatingButton, setAnimatingButton] = useState<string | null>(null);
  const [showBonusPopup, setShowBonusPopup] = useState(false);
  const [closedGameInfo, setClosedGameInfo] = useState<Game | null>(null);
  
  const currentDay = useMemo(() => new Date().toLocaleString('en-US', { weekday: 'long' }), []);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user?.uid) return;

    let userUnsubscribe: () => void;
    let gamesUnsubscribe: () => void;
    let bannersUnsubscribe: () => void;
    let settingsUnsubscribe: () => void;

    const userDocRef = doc(db, 'users', user.uid);
    userUnsubscribe = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
            setUserProfile(doc.data() as UserProfile);
        }
    });

    const gamesQuery = query(collection(db, 'games'));
    gamesUnsubscribe = onSnapshot(gamesQuery, (querySnapshot) => {
      const gamesData: Game[] = [];
      querySnapshot.forEach((doc) => {
        gamesData.push({ id: doc.id, ...doc.data() } as Game);
      });
      
      // Sort games: active & open games on top, inactive/closed at the bottom
        gamesData.sort((a, b) => {
            const isAActiveToday = a.active && (!a.activeDays || a.activeDays.length === 0 || a.activeDays.includes(currentDay));
            const isBActiveToday = b.active && (!b.activeDays || b.activeDays.length === 0 || b.activeDays.includes(currentDay));

            const isAClosed = isBettingClosed(a.closeTime);
            const isBClosed = isBettingClosed(b.closeTime);
            
            const isAPlayable = isAActiveToday && !isAClosed;
            const isBPlayable = isBActiveToday && !isBClosed;

            if (isAPlayable && !isBPlayable) {
                return -1; // a (playable) comes before b (not playable)
            }
            if (!isAPlayable && isBPlayable) {
                return 1; // b (playable) comes after a (not playable)
            }

            // If both have the same playability, sort by openTime
            return a.openTime.localeCompare(b.openTime);
        });

      setGames(gamesData);
      setGamesLoading(false);
    }, (error) => {
        console.error("Error fetching games:", error);
        setGamesLoading(false);
    });

    const bannersQuery = query(collection(db, "banners"), orderBy("createdAt", "desc"));
    bannersUnsubscribe = onSnapshot(bannersQuery, (querySnapshot) => {
        const bannersData: Banner[] = [];
        querySnapshot.forEach((doc) => {
            bannersData.push({ id: doc.id, ...doc.data() } as Banner);
        });
        setBanners(bannersData);
    });
    
    const settingsDocRef = doc(db, 'settings', 'app-settings');
    settingsUnsubscribe = onSnapshot(settingsDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const appSettings = docSnap.data() as AppSettings;
            setSettings(appSettings);
            
            if (appSettings.bonusPopup?.enabled && appSettings.bonusPopup.imageUrl) {
                setShowBonusPopup(true);
            }
        }
    });

    return () => {
        userUnsubscribe?.();
        gamesUnsubscribe?.();
        bannersUnsubscribe?.();
        settingsUnsubscribe?.();
    };
  }, [user?.uid, currentDay]);
  
  useEffect(() => {
    if (!gamesLoading) {
      setTimeout(() => {
        const hash = decodeURIComponent(window.location.hash.substring(1));
        if (hash) {
          const element = document.getElementById(hash);
          if (element) {
            element.scrollIntoView({ behavior: "instant", block: "center" });
          }
        }
      }, 300); // Small delay to ensure elements are rendered
    }
  }, [gamesLoading]);
  
  const handleCopyToClipboard = () => {
    if (userProfile.referralCode) {
        navigator.clipboard.writeText(userProfile.referralCode).then(() => {
            toast({
                title: 'Copied!',
                description: 'Referral code has been copied to clipboard.',
            });
        }, (err) => {
            console.error('Could not copy text: ', err);
             toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to copy referral code.',
            });
        });
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
                <Image src={logoUrl} alt="Marquee Logo" width={logoSize} height={logoSize} className="mr-2" style={{ width: `${logoSize}px`, height: `${logoSize}px`}} />
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
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="bg-card/80 backdrop-blur-sm sticky top-0 z-50 border-b border-white/10 p-4 space-y-4">
        <div className="flex items-center justify-between">
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
                         <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <span>Referral: {userProfile.referralCode || 'N/A'}</span>
                            {userProfile.referralCode && (
                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleCopyToClipboard}>
                                    <Copy className="h-3 w-3" />
                                </Button>
                            )}
                        </div>
                    </div>
                    </div>
                    <Separator className="bg-white/10 my-2" />
                    <nav className="flex flex-col gap-2 p-4">
                        <button onClick={handleLogout} className="flex items-center gap-3 p-3 rounded-md hover:bg-primary/10 transition-colors text-left w-full">
                            <div className="h-8 w-8 rounded-full bg-teal-700 flex items-center justify-center text-white"><LogOut className="h-5 w-5" /></div>
                            <span>Logout</span>
                        </button>
                        <Link href="/" onClick={handleLinkClick} className="flex items-center gap-3 p-3 rounded-md hover:bg-primary/10 transition-colors">
                            <div className="h-8 w-8 rounded-full bg-teal-700 flex items-center justify-center text-white"><HomeIcon className="h-5 w-5" /></div>
                            <span>Home</span>
                        </Link>
                        <Link href="/profile" onClick={handleLinkClick} className="flex items-center gap-3 p-3 rounded-md hover:bg-primary/10 transition-colors">
                           <div className="h-8 w-8 rounded-full bg-teal-700 flex items-center justify-center text-white"><UserIcon className="h-5 w-5" /></div>
                            <span>Profile</span>
                        </Link>
                        <Link href="/time-table" onClick={handleLinkClick} className="flex items-center gap-3 p-3 rounded-md hover:bg-primary/10 transition-colors">
                            <div className="h-8 w-8 rounded-full bg-teal-700 flex items-center justify-center text-white"><Clock className="h-5 w-5" /></div>
                            <span>Time Table</span>
                        </Link>
                        <Link href="/contact" onClick={handleLinkClick} className="flex items-center gap-3 p-3 rounded-md hover:bg-primary/10 transition-colors">
                            <div className="h-8 w-8 rounded-full bg-teal-700 flex items-center justify-center text-white"><BookUser className="h-5 w-5" /></div>
                            <span>Contact</span>
                        </Link>
                        <Link href="/download" onClick={handleLinkClick} className="flex items-center gap-3 p-3 rounded-md hover:bg-primary/10 transition-colors">
                            <div className="h-8 w-8 rounded-full bg-teal-700 flex items-center justify-center text-white"><Download className="h-5 w-5" /></div>
                            <span>Download App</span>
                        </Link>
                        <Link href="/rate-card" onClick={handleLinkClick} className="flex items-center gap-3 p-3 rounded-md hover:bg-primary/10 transition-colors">
                            <div className="h-8 w-8 rounded-full bg-teal-700 flex items-center justify-center text-white"><Star className="h-5 w-5" /></div>
                            <span>Rate Card</span>
                        </Link>
                        <Link href="#" onClick={handleLinkClick} className="flex items-center gap-3 p-3 rounded-md hover:bg-primary/10 transition-colors">
                            <div className="h-8 w-8 rounded-full bg-teal-700 flex items-center justify-center text-white"><BarChart2 className="h-5 w-5" /></div>
                            <span>Chart</span>
                        </Link>
                    </nav>
                </div>
                <div className="p-4 border-t border-white/10">
                     {user.isAdmin && (
                        <Link href="/admin">
                            <Button className="w-full bg-[#34a387] hover:bg-[#34a387]/90 text-white">
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
              <span className="font-bold text-lg text-foreground">
                MATKA KING
              </span>
            </div>
            <div className="flex items-center gap-2">
                <div className="flex flex-col items-end">
                    <div className="flex items-center gap-2 bg-card/90 border border-white/10 rounded-full px-3 py-1">
                        <Wallet className="h-5 w-5 text-green-400" />
                        <span className="font-bold text-sm text-white">₹{totalBalance.toFixed(0) ?? '0'}</span>
                    </div>
                </div>
            </div>
        </div>
         <div className="flex justify-center items-center gap-4">
            <Link href="/add-fund" className="flex-1">
                <Button className="w-full h-10 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg shadow-lg">
                    <div className="bg-white/90 rounded-full p-1 mr-2">
                        <IndianRupee className="h-4 w-4 text-green-600" />
                    </div>
                    ADD MONEY
                </Button>
            </Link>
             <Link href="/withdrawal" className="flex-1">
                <Button className="w-full h-10 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg shadow-lg">
                     <div className="bg-white/90 rounded-full p-1 mr-2">
                        <Landmark className="h-4 w-4 text-red-600" />
                    </div>
                    WITHDRAW
                </Button>
            </Link>
        </div>
      </header>
      
      {settings.marquee?.text && (
        <div 
            className="relative flex overflow-x-hidden text-white py-2" 
            style={{ backgroundColor: settings.marquee?.backgroundColor || '#b91c1c' }}
        >
            <div className="animate-marquee whitespace-nowrap flex">
                <MarqueeContent />
                <MarqueeContent />
            </div>
        </div>
      )}
      
      <main className="flex-1 flex flex-col gap-4 p-2 pb-28 overflow-y-auto">
        
        {/* Bonus Popup Dialog */}
        <Dialog open={showBonusPopup} onOpenChange={(isOpen) => !isOpen && handleBonusPopupClose()}>
            <DialogContent className="p-0 border-0 bg-transparent max-w-[280px] shadow-none" onInteractOutside={handleBonusPopupClose}>
                <DialogHeader>
                    <DialogTitle className="sr-only">Bonus Offer</DialogTitle>
                    <DialogDescription className="sr-only">A special bonus offer is available. Click the button to claim it.</DialogDescription>
                </DialogHeader>
                <div className="relative">
                    <div
                        className="shadow-2xl shadow-primary/30 rounded-lg overflow-hidden"
                    >
                        <Image 
                            src={settings.bonusPopup?.imageUrl || ''} 
                            alt="Bonus Offer" 
                            width={400} 
                            height={400} 
                            className="w-full h-auto"
                            data-ai-hint="casino bonus"
                            
                        />
                        <div className="p-4 bg-background">
                            <div>
                                <Button className="w-full h-12 text-lg font-bold bg-gradient-to-r from-orange-400 to-yellow-500 text-white shadow-lg" onClick={handleClaimBonus}>
                                    Claim Bonus Now
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>

        {/* Betting Closed Dialog */}
         <Dialog open={!!closedGameInfo} onOpenChange={() => setClosedGameInfo(null)}>
            <DialogContent className="bg-white text-black p-0 max-w-xs rounded-lg">
                <DialogHeader className="sr-only">
                    <DialogTitle>Betting Closed</DialogTitle>
                    <DialogDescription>The betting market for this game is currently closed.</DialogDescription>
                </DialogHeader>
                <div className="flex flex-col items-center text-center p-6 space-y-4">
                    <XCircle className="h-16 w-16 text-red-500" />
                    <h2 className="text-xl font-bold text-red-600">Betting Is Closed For Today</h2>
                    <p className="text-lg font-bold text-black">{closedGameInfo?.name}</p>
                    <div className="text-left w-full space-y-2 text-sm">
                        <div className="flex justify-between"><span>Open Result Time :</span> <span>{formatTime(closedGameInfo?.openTime)}</span></div>
                        <div className="flex justify-between"><span>Open Bid Last Time :</span> <span>{formatTime(closedGameInfo?.openTime)}</span></div>
                        <div className="flex justify-between"><span>Close Result Time :</span> <span>{formatTime(closedGameInfo?.closeTime)}</span></div>
                        <div className="flex justify-between"><span>Close Bid Last Time :</span> <span>{formatTime(closedGameInfo?.closeTime)}</span></div>
                    </div>
                    <DialogClose asChild>
                        <Button className="w-full bg-red-600 hover:bg-red-700 text-white font-bold">OK</Button>
                    </DialogClose>
                </div>
            </DialogContent>
        </Dialog>

        {settings.welcomeBanner?.imageUrl && (
            <Card className="bg-card/80 border-white/10 shadow-lg overflow-hidden">
                <CardContent className="p-0">
                    <img
                        src={settings.welcomeBanner.imageUrl}
                        alt="Welcome Banner"
                        className="w-full h-auto max-h-[250px] object-cover"
                    />
                </CardContent>
            </Card>
        )}

        {banners.length > 0 && (
          <Card className="bg-card/80 border-white/10 shadow-lg overflow-hidden">
            <CardContent className="p-0">
              <Carousel
                className="w-full"
                plugins={[
                  Autoplay({
                    delay: 3000,
                    stopOnInteraction: false,
                    stopOnMouseEnter: true,
                  }),
                ]}
              >
                <CarouselContent>
                  {banners.map((banner) => (
                    <CarouselItem key={banner.id}>
                      <img
                        src={banner.imageUrl}
                        alt="Banner"
                        className="w-full h-auto max-h-[250px] object-cover"
                      />
                    </CarouselItem>
                  ))}
                </CarouselContent>
              </Carousel>
            </CardContent>
          </Card>
        )}
        
        <Card className="bg-card/80 border-white/10 shadow-lg">
          <CardHeader className="p-4">
            <CardTitle className="text-xl text-center font-bold">Latest Results</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            {gamesLoading ? (
              <div className="grid grid-cols-4 gap-1">
                <Skeleton className="h-9 w-full bg-slate-700/50" />
                <Skeleton className="h-9 w-full bg-slate-700/50" />
                <Skeleton className="h-9 w-full bg-slate-700/50" />
                <Skeleton className="h-9 w-full bg-slate-700/50" />
                <Skeleton className="h-9 w-full bg-slate-700/50" />
                <Skeleton className="h-9 w-full bg-slate-700/50" />
                <Skeleton className="h-9 w-full bg-slate-700/50" />
                <Skeleton className="h-9 w-full bg-slate-700/50" />
              </div>
            ) : games.length > 0 ? (
              <div className="grid grid-cols-4 gap-1">
                {games.map((game) => (
                  <div key={game.id} className="flex flex-col items-center justify-center bg-gradient-to-b from-slate-800 to-slate-900 p-1 rounded-md border border-slate-700 text-center">
                    <span className="text-[10px] font-medium text-white truncate w-full">{game.name}</span>
                    <span className="text-[11px] font-bold text-yellow-400">{formatGameResult(game, true)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground">No results available right now.</p>
            )}
          </CardContent>
        </Card>
        
        {settings.notice?.enabled && settings.notice.text && (
            <Card className="bg-card/80 border-white/10 shadow-lg animate-won-glow">
                <CardHeader className="p-4">
                    <CardTitle className="text-xl text-white">Notice</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                    <p 
                    className="text-white font-bold" 
                    style={{ whiteSpace: 'pre-wrap' }}
                    >
                    {settings.notice.text}
                    </p>
                </CardContent>
            </Card>
        )}

        <Card className="bg-card/80 border-white/10 shadow-lg">
          <CardHeader className="p-4">
            <CardTitle className="text-xl text-center font-bold">Matka Games</CardTitle>
          </CardHeader>
          <CardContent className="p-2 pt-0">
            {gamesLoading ? (
               <div className="space-y-4">
                    <Skeleton className="h-28 w-full rounded-lg bg-slate-700/50" />
                    <Skeleton className="h-28 w-full rounded-lg bg-slate-700/50" />
                    <Skeleton className="h-28 w-full rounded-lg bg-slate-700/50" />
                    <Skeleton className="h-28 w-full rounded-lg bg-slate-700/50" />
                </div>
            ) : games.length > 0 ? (
                <div className="space-y-4">
                    {games.map((game) => {
                      const isActiveToday = (() => {
                          if (!game.active) return false; // Master switch is off
                          if (!game.activeDays || game.activeDays.length === 0) return true; // if no days are set, assume it runs everyday
                          return game.activeDays.includes(currentDay);
                      })();

                      return (
                        <GameCard 
                            key={game.id} 
                            game={game} 
                            onBettingClosedClick={setClosedGameInfo}
                            isActive={isActiveToday}
                        />
                      )
                    })}
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
