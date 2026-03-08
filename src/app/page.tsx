'use client';

import React, { useEffect, useState, useRef, Suspense, memo, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/loader';
import { auth, db, storage } from '@/lib/firebase';
import { collection, query, onSnapshot, orderBy, DocumentData, where, doc, getDoc, updateDoc, getDocs, limit, Timestamp } from 'firebase/firestore';
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
  ArrowUpCircle,
  KeyRound,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { formatTime, cn, isBettingClosed, formatGameResult } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { updateProfile } from 'firebase/auth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogDescription } from '@/components/ui/dialog';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel"
import Autoplay from "embla-carousel-autoplay"
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


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
    body: string;
    createdAt: Timestamp;
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
        speed?: number;
    };
    notice?: {
        text: string;
        enabled: boolean;
    };
    bonusPopup?: {
        enabled: boolean;
        imageUrl: string;
        link: string;
    },
    promoPopup?: {
        enabled: boolean;
        imageUrl: string;
        link: string;
    };
    globalMarketOpenTime?: string;
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
    isActive,
    isMarketOpenGlobally
}: {
    game: Game;
    onBettingClosedClick: (game: Game) => void;
    isActive: boolean;
    isMarketOpenGlobally: boolean;
}) {
    const bettingClosed = isBettingClosed(game.closeTime);
    const isPlayable = isActive && !bettingClosed && isMarketOpenGlobally;
    const gamePageHref = `/games/${game.id}`;

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
                        {!isMarketOpenGlobally ? 'Market is close' : !isActive ? 'Market is close' : !isPlayable ? 'Market is close' : game.status}
                    </p>
                </div>
            </div>
            <div className="border-t border-white/20 pt-2">
                <div className="relative mt-2 h-9">
                    {/* Main Playable Button or Disabled Button */}
                    {isPlayable ? (
                        <Link 
                            href={`/games/${game.id}`} 
                            className="block h-full transition-transform active:scale-95"
                            onContextMenu={(e) => e.preventDefault()}
                        >
                            <div className="w-full h-full flex items-center justify-center bg-orange-600 text-white font-bold rounded-full text-lg shadow-lg">
                                Play Now
                            </div>
                        </Link>
                    ) : (
                        <div 
                            onClick={() => onBettingClosedClick(game)}
                            onContextMenu={(e) => e.preventDefault()}
                            className="w-full h-full flex items-center justify-center bg-gray-600 text-white font-bold rounded-full text-lg shadow-lg cursor-not-allowed"
                        >
                            Play Now
                        </div>
                    )}

                    {/* Jodi Button positioned over the main button */}
                    <Link 
                        href={`/jodi-chart/${game.id}`} 
                        className="absolute top-1/2 left-1 -translate-y-1/2 z-10 transition-transform hover:scale-105 active:scale-95"
                        onContextMenu={(e) => e.preventDefault()}
                    >
                        <div className="bg-yellow-400 rounded-full p-0.5 shadow-md">
                            <div className="bg-orange-600 text-white text-xs font-bold rounded-full px-3 py-1">
                                Jodi
                            </div>
                        </div>
                    </Link>

                    {/* Panel Button positioned over the main button */}
                    <Link 
                        href={`/panel-chart/${game.id}`} 
                        className="absolute top-1/2 right-1 -translate-y-1/2 z-10 transition-transform hover:scale-105 active:scale-95"
                        onContextMenu={(e) => e.preventDefault()}
                    >
                        <div className="bg-yellow-400 rounded-full p-0.5 shadow-md">
                            <div className="bg-orange-600 text-white text-xs font-bold rounded-full px-3 py-1">
                                Panel
                            </div>
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
  const [showPromoPopup, setShowPromoPopup] = useState(false);
  const [closedGameInfo, setClosedGameInfo] = useState<Game | null>(null);
  const [isMarketOpenGlobally, setIsMarketOpenGlobally] = useState(true);
  const [now, setNow] = useState(new Date());

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const currentDay = useMemo(() => new Date().toLocaleString('en-US', { weekday: 'long' }), []);

  useEffect(() => {
    const timerId = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timerId);
  }, []);

  useEffect(() => {
    if (!loading && user?.uid) {
        let userUnsubscribe: () => void;
        let gamesUnsubscribe: () => void;
        let bannersUnsubscribe: () => void;
        let settingsUnsubscribe: () => void;
        let notificationsUnsubscribe: () => void;


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
          
            gamesData.sort((a, b) => {
                const isAActiveToday = a.active && (!a.activeDays || a.activeDays.length === 0 || a.activeDays.includes(currentDay));
                const isBActiveToday = b.active && (!b.activeDays || b.activeDays.length === 0 || b.activeDays.includes(currentDay));

                const isAClosed = isBettingClosed(a.closeTime);
                const isBClosed = isBettingClosed(b.closeTime);
                
                const isAPlayable = isAActiveToday && !isAClosed;
                const isBPlayable = isBActiveToday && !isBClosed;

                if (isAPlayable && !isBPlayable) return -1;
                if (!isAPlayable && isBPlayable) return 1;

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
                if (appSettings.promoPopup?.enabled && appSettings.promoPopup.imageUrl) {
                    setShowPromoPopup(true);
                }
            }
        });
        
        const notificationsQuery = query(collection(db, "notifications"), orderBy("createdAt", "desc"));
        notificationsUnsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
            const fetchedNotifications: Notification[] = [];
            snapshot.forEach((doc) => {
                fetchedNotifications.push({ id: doc.id, ...doc.data() } as Notification);
            });
            setNotifications(fetchedNotifications);

            const deletedIds = JSON.parse(localStorage.getItem('deletedNotificationIds') || '[]');
            const newUnreadCount = fetchedNotifications.filter(n => !deletedIds.includes(n.id)).length;
            setUnreadCount(newUnreadCount);
        });


        return () => {
            userUnsubscribe?.();
            gamesUnsubscribe?.();
            bannersUnsubscribe?.();
            settingsUnsubscribe?.();
            notificationsUnsubscribe?.();
        };
    }
  }, [user, loading, currentDay]);
  
  useEffect(() => {
    const handleStorageChange = () => {
      const deletedIds = JSON.parse(localStorage.getItem('deletedNotificationIds') || '[]');
      const newUnreadCount = notifications.filter(n => !deletedIds.includes(n.id)).length;
      setUnreadCount(newUnreadCount);
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [notifications]);

  useEffect(() => {
    if (settings.globalMarketOpenTime) {
      const [hours, minutes] = settings.globalMarketOpenTime.split(':').map(Number);
      const marketOpenTime = new Date(now);
      marketOpenTime.setHours(hours, minutes, 0, 0);
      setIsMarketOpenGlobally(now >= marketOpenTime);
    } else {
      setIsMarketOpenGlobally(true);
    }
  }, [now, settings.globalMarketOpenTime]);
  
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
        router.replace(settings.bonusPopup.link);
        handleBonusPopupClose();
    }
  };

  const handlePromoPopupClose = () => {
    setShowPromoPopup(false);
  };

  const handlePromoAction = () => {
    if (settings.promoPopup?.link) {
        router.push(settings.promoPopup.link);
        handlePromoPopupClose();
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

  if (!user) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <Loader className="h-10 w-10 text-primary" />
        </div>
    );
  }

  const mobileNumber = user.email?.split('@')[0];
  
  const MarqueeContent = React.memo(() => {
    if (!settings.marquee?.text) return null;

    return (
        <div className="flex items-center mx-4" style={{ color: settings.marquee.textColor || '#FFFFFF' }}>
            <span className="inline-block" style={{ fontSize: `${settings.marquee.textSize || 12}px` }}>
              {settings.marquee.text}
            </span>
        </div>
    );
  });
  MarqueeContent.displayName = 'MarqueeContent';

  const GameMarqueeContent = React.memo(() => {
    return (
      <div className="flex flex-shrink-0 items-center justify-around">
        {games.map((game) => (
          <div key={game.id} className="flex items-center justify-center text-center mx-4 gap-2">
            <span className="text-sm font-medium text-white/80">{game.name}</span>
            <span className="text-base font-bold text-amber-400 tracking-wider">{formatGameResult(game, true)}</span>
          </div>
        ))}
      </div>
    );
  });
  GameMarqueeContent.displayName = 'GameMarqueeContent';

  const totalBalance = (userProfile?.balance || 0) + (userProfile?.bonusBalance || 0);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="bg-background/80 backdrop-blur-sm sticky top-0 z-50 border-b border-white/10 p-4 space-y-4">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetTrigger asChild>
                    <Button variant="ghost" size="icon">
                    <Menu className="h-8 w-8 text-green-500" strokeWidth={3} />
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="bg-background/80 border-r-0 text-foreground flex flex-col p-0">
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
                            <Link href="/" onClick={handleLinkClick} className="flex items-center gap-3 p-3 rounded-md hover:bg-primary/10 transition-colors" onContextMenu={(e) => e.preventDefault()}>
                                <div className="h-8 w-8 rounded-full bg-teal-700 flex items-center justify-center text-white"><HomeIcon className="h-5 w-5" /></div>
                                <span>Home</span>
                            </Link>
                            <Link href="/profile" onClick={handleLinkClick} className="flex items-center gap-3 p-3 rounded-md hover:bg-primary/10 transition-colors" onContextMenu={(e) => e.preventDefault()}>
                            <div className="h-8 w-8 rounded-full bg-teal-700 flex items-center justify-center text-white"><UserIcon className="h-5 w-5" /></div>
                                <span>Profile</span>
                            </Link>
                            <Link href="/forgot-password" onClick={handleLinkClick} className="flex items-center gap-3 p-3 rounded-md hover:bg-primary/10 transition-colors" onContextMenu={(e) => e.preventDefault()}>
                                <div className="h-8 w-8 rounded-full bg-teal-700 flex items-center justify-center text-white"><KeyRound className="h-5 w-5" /></div>
                                <span>Change Password</span>
                            </Link>
                            <Link href="/time-table" onClick={handleLinkClick} className="flex items-center gap-3 p-3 rounded-md hover:bg-primary/10 transition-colors" onContextMenu={(e) => e.preventDefault()}>
                                <div className="h-8 w-8 rounded-full bg-teal-700 flex items-center justify-center text-white"><Clock className="h-5 w-5" /></div>
                                <span>Time Table</span>
                            </Link>
                            <Link href="/contact" onClick={handleLinkClick} className="flex items-center gap-3 p-3 rounded-md hover:bg-primary/10 transition-colors" onContextMenu={(e) => e.preventDefault()}>
                                <div className="h-8 w-8 rounded-full bg-teal-700 flex items-center justify-center text-white"><BookUser className="h-5 w-5" /></div>
                                <span>Contact</span>
                            </Link>
                            <Link href="/download" onClick={handleLinkClick} className="flex items-center gap-3 p-3 rounded-md hover:bg-primary/10 transition-colors" onContextMenu={(e) => e.preventDefault()}>
                                <div className="h-8 w-8 rounded-full bg-teal-700 flex items-center justify-center text-white"><ArrowUpCircle className="h-5 w-5" /></div>
                                <span>Update App</span>
                            </Link>
                            <Link href="/rate-card" onClick={handleLinkClick} className="flex items-center gap-3 p-3 rounded-md hover:bg-primary/10 transition-colors" onContextMenu={(e) => e.preventDefault()}>
                                <div className="h-8 w-8 rounded-full bg-teal-700 flex items-center justify-center text-white"><Star className="h-5 w-5" /></div>
                                <span>Rate Card</span>
                            </Link>
                            <Link href="#" onClick={handleLinkClick} className="flex items-center gap-3 p-3 rounded-md hover:bg-primary/10 transition-colors" onContextMenu={(e) => e.preventDefault()}>
                                <div className="h-8 w-8 rounded-full bg-teal-700 flex items-center justify-center text-white"><BarChart2 className="h-5 w-5" /></div>
                                <span>Chart</span>
                            </Link>
                        </nav>
                    </div>
                    <div className="p-4 border-t border-white/10">
                        {user.isAdmin && (
                            <Link href="/admin" onContextMenu={(e) => e.preventDefault()}>
                                <Button className="w-full bg-[#34a387] hover:bg-[#34a387]/90 text-white">
                                    <ShieldCheck className="mr-2 h-5 w-5" />
                                    Admin Panel
                                </Button>
                            </Link>
                        )}
                    </div>
                </SheetContent>
                </Sheet>
                <div className="flex items-center gap-1">
                    <Crown className="h-4 w-4 text-primary" />
                    <span className="font-bold text-base text-foreground">
                        MATKA KING
                    </span>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <Link href="/notifications">
                    <Button variant="ghost" size="icon" className="relative h-12 w-12">
                        <BellRing className="h-8 w-8 text-yellow-400" />
                        {unreadCount > 0 && (
                            <span className="absolute top-1 right-1 h-5 w-5 rounded-full bg-red-500 text-xs text-white flex items-center justify-center">
                                {unreadCount}
                            </span>
                        )}
                    </Button>
                </Link>
                <div className="flex flex-col items-end">
                    <div className="flex items-center gap-2 bg-card/90 border border-white/10 rounded-full px-3 py-1">
                        <Wallet className="h-5 w-5 text-green-400" />
                        <span className="font-bold text-sm text-white">₹{totalBalance.toFixed(0) ?? '0'}</span>
                    </div>
                </div>
            </div>
        </div>
         <div className="flex justify-center items-center gap-4">
            <Link href="/add-fund" className="flex-1" onContextMenu={(e) => e.preventDefault()}>
                <Button className="w-full h-9 bg-green-500 hover:bg-green-600 text-white font-bold text-sm rounded-lg shadow-lg">
                    <div className="bg-white/90 rounded-full p-1 mr-2">
                        <IndianRupee className="h-4 w-4 text-green-600" />
                    </div>
                    ADD MONEY
                </Button>
            </Link>
             <Link href="/withdrawal" className="flex-1" onContextMenu={(e) => e.preventDefault()}>
                <Button className="w-full h-9 bg-red-500 hover:bg-red-600 text-white font-bold text-sm rounded-lg shadow-lg">
                     <div className="bg-white/90 rounded-full p-1 mr-2">
                        <Landmark className="h-4 w-4 text-red-600" />
                    </div>
                    WITHDRAW
                </Button>
            </Link>
        </div>
        {settings.marquee?.text && (
             <div className="relative flex overflow-x-hidden text-white py-1 -mx-4">
                <div 
                    className="flex animate-marquee-slow whitespace-nowrap"
                    style={{ '--marquee-duration': `${settings.marquee.speed || 40}s` } as React.CSSProperties}
                >
                    <MarqueeContent />
                    <MarqueeContent />
                </div>
             </div>
        )}
      </header>
      
      <main className="flex-1 flex flex-col gap-4 p-2 pb-28 overflow-y-auto">
        
        {!isMarketOpenGlobally && settings.globalMarketOpenTime && (
            <Alert variant="destructive" className="bg-yellow-600/20 border-yellow-500/30 text-yellow-300 p-2">
                <p className="text-yellow-300/90 text-xs text-center">
                   Markets are closed. Bidding opens at {formatTime(settings.globalMarketOpenTime)}.
                </p>
            </Alert>
        )}

        {/* Bonus Popup Dialog */}
        <Dialog open={showBonusPopup} onOpenChange={(isOpen) => !isOpen && handleBonusPopupClose()}>
            <DialogContent className="p-0 border-0 bg-transparent max-w-[280px] shadow-none" onInteractOutside={handleBonusPopupClose}>
                <DialogHeader>
                    <DialogTitle className="sr-only">Bonus Offer</DialogTitle>
                    <DialogDescription className="sr-only">A special bonus offer is available. Click the button to claim it.</DialogDescription>
                </DialogHeader>
                <div className="relative">
                    <DialogClose asChild>
                        <button className="absolute -top-2 -right-2 z-10 bg-background/50 backdrop-blur-sm rounded-full p-1 text-white">
                            <X className="h-4 w-4" />
                        </button>
                    </DialogClose>
                    <div className="shadow-2xl shadow-primary/30 rounded-lg overflow-hidden">
                        <div className="aspect-square w-full bg-background/10">
                            <img
                                src={settings.bonusPopup?.imageUrl || ''}
                                alt="Bonus Offer"
                                className="w-full h-full object-cover"
                            />
                        </div>
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

        {/* Promotional Popup Dialog */}
        <Dialog open={showPromoPopup} onOpenChange={(isOpen) => !isOpen && handlePromoPopupClose()}>
            <DialogContent className="p-0 border-0 bg-transparent max-w-[250px] shadow-none" onInteractOutside={handlePromoPopupClose}>
                <DialogHeader>
                    <DialogTitle className="sr-only">Promotion</DialogTitle>
                    <DialogDescription className="sr-only">A special promotion is available.</DialogDescription>
                </DialogHeader>
                <div className="relative">
                    <DialogClose asChild>
                        <button className="absolute -top-2 -right-2 z-10 bg-background/50 backdrop-blur-sm rounded-full p-1 text-white">
                            <X className="h-4 w-4" />
                        </button>
                    </DialogClose>
                    <div className="shadow-2xl shadow-primary/30 rounded-lg overflow-hidden">
                        <div className="aspect-square w-full bg-background/10">
                            <Image
                                src={settings.promoPopup?.imageUrl || ''}
                                alt="Promotional Offer"
                                width={250}
                                height={250}
                                className="w-full h-auto object-contain"
                            />
                        </div>
                        {settings.promoPopup?.link && (
                            <div>
                                <Button className="w-full h-10 rounded-none text-base font-bold bg-gradient-to-r from-orange-400 to-yellow-500 text-white shadow-lg" onClick={handlePromoAction}>
                                    Check it out!
                                </Button>
                            </div>
                        )}
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
                     <Image
                        src={settings.welcomeBanner.imageUrl}
                        alt="Welcome Banner"
                        width={1200}
                        height={300}
                        className="w-full h-auto max-h-[250px] object-cover"
                        priority
                        sizes="100vw"
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
                  }) as any,
                ]}
              >
                <CarouselContent>
                  {banners.map((banner, index) => (
                    <CarouselItem key={banner.id}>
                      <Image
                        src={banner.imageUrl}
                        alt="Banner"
                        width={1200}
                        height={300}
                        className="w-full h-auto max-h-[250px] object-cover"
                        priority={index === 0}
                        sizes="100vw"
                      />
                    </CarouselItem>
                  ))}
                </CarouselContent>
              </Carousel>
            </CardContent>
          </Card>
        )}
        
        <Card className="bg-slate-900/50 border border-slate-700 rounded-lg shadow-lg">
            <CardContent className="p-2">
                {gamesLoading ? (
                <div className="h-9 flex items-center justify-center">
                    <Loader className="h-6 w-6" />
                </div>
                ) : games.length > 0 ? (
                <div className="relative flex overflow-hidden group">
                    <div className="animate-marquee-slow flex whitespace-nowrap group-hover:[animation-play-state:paused]">
                        <GameMarqueeContent />
                        <GameMarqueeContent />
                    </div>
                </div>
                ) : (
                <p className="text-center text-muted-foreground py-2">No results available right now.</p>
                )}
            </CardContent>
        </Card>
        
        {settings.notice?.enabled && settings.notice.text && (
            <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-b from-slate-800 to-slate-900 p-5 shadow-xl border border-slate-700">
                {/* Crown Watermark */}
                <div className="absolute top-0 right-0 opacity-10 pointer-events-none translate-x-1/4 -translate-y-1/4">
                    <Crown className="h-48 w-48 text-white" />
                </div>
                
                <div className="relative z-10 space-y-3">
                    <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full bg-[#fbbf24] animate-pulse shadow-[0_0_8px_#fbbf24]" />
                        <h2 className="text-[10px] font-black tracking-widest text-[#fbbf24] uppercase">
                            Official Announcement
                        </h2>
                    </div>
                    
                    <p className="text-[14px] font-bold text-white leading-relaxed" style={{ whiteSpace: 'pre-wrap' }}>
                        {settings.notice.text}
                    </p>
                </div>
            </div>
        )}

        <div>
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
                            isMarketOpenGlobally={isMarketOpenGlobally}
                        />
                      )
                    })}
                </div>
            ) : (
              <p className="text-center text-muted-foreground">No games available right now.</p>
            )}
        </div>
      </main>
    </div>
  );
}
