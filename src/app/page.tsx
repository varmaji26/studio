
'use client';

import { useEffect, useState, useRef, Suspense, memo, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/loader';
import { auth, db, storage } from '@/lib/firebase';
import { collection, query, onSnapshot, orderBy, DocumentData, where, doc, getDoc, updateDoc, getDocs, limit } from 'firebase/firestore';
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
  IndianRupee,
  XCircle,
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';


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
}

// Memoized Game Card Component for performance optimization
const GameCard = memo(function GameCard({
    game,
    onBettingClosedClick
}: {
    game: Game;
    onBettingClosedClick: (game: Game) => void;
}) {
    const bettingClosed = isBettingClosed(game.closeTime);

    const PlayButton = () => (
        <Button
            onClick={bettingClosed ? () => onBettingClosedClick(game) : undefined}
            className={cn(
                "w-full h-10 text-base font-bold text-white rounded-lg shadow-md transition-transform active:scale-95",
                bettingClosed ? "bg-gray-600 hover:bg-gray-700" : "bg-orange-600 hover:bg-orange-700"
            )}
        >
            Play Now
        </Button>
    );

    return (
        <div id={game.id} className="bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-slate-700 rounded-2xl p-3 space-y-2 shadow-2xl shadow-black/50 animate-breathe">
            <h3 className="text-lg font-bold text-white text-center">{game.name}</h3>
            
            <div className="bg-yellow-400 rounded-full flex items-center justify-between p-1">
                <Link href={`/games/${game.id}/jodi-chart`}>
                    <Button variant="default" className="bg-orange-500 text-white rounded-full text-xs h-8 shadow-md hover:bg-orange-600">Jodi</Button>
                </Link>
                <span className="text-black font-bold text-base tracking-wider">{formatGameResult(game)}</span>
                <Link href={`/games/${game.id}/panel-chart`}>
                     <Button variant="default" className="bg-orange-500 text-white rounded-full text-xs h-8 shadow-md hover:bg-orange-600">Panel</Button>
                </Link>
            </div>
            
            <div className="h-7 flex items-center justify-center">
                <p className={cn(
                    "text-center font-semibold rounded-md text-base",
                    bettingClosed ? 'text-red-400' : (game.status.toLowerCase().includes('open') ? 'text-green-400' : 'text-red-400')
                )}>
                    {bettingClosed ? 'Market is Close' : game.status}
                </p>
            </div>
            
            {bettingClosed ? (
                 <PlayButton />
            ) : (
                <Link href={`/games/${game.id}`} className="block">
                    <PlayButton />
                </Link>
            )}

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
    });

    const bannersQuery = query(collection(db, "banners"), orderBy("createdAt", "desc"), limit(1));
    const unsubscribeBanners = onSnapshot(bannersQuery, (querySnapshot) => {
        const bannersData: Banner[] = [];
        querySnapshot.forEach((doc) => {
            bannersData.push({ id: doc.id, ...doc.data() } as Banner);
        });
        setBanners(bannersData);
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

    return () => {
        unsubscribeGames();
        unsubscribeBanners();
        unsubscribeSettings();
        unsubscribeUserProfile();
    };
  }, [user, currentDay]);

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
        <Loader className="h-20 w-20 text-primary" />
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
  
  const totalBalance = Number(userProfile?.balance || 0) + Number(userProfile?.bonusBalance || 0);

  return (
    <div className="min-h-screen bg-background text-foreground">
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
      
      <main className="flex flex-col gap-4 p-4 pb-28">
        
        {/* Bonus Popup Dialog */}
        <Dialog open={showBonusPopup} onOpenChange={(isOpen) => !isOpen && handleBonusPopupClose()}>
            <DialogContent className="p-0 border-0 bg-transparent max-w-[280px] shadow-none" onInteractOutside={handleBonusPopupClose}>
                <DialogHeader>
                    <DialogTitle className="sr-only">Bonus Offer</DialogTitle>
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
            <Card className="bg-card/80 border-white/10 shadow-lg shadow-white/10">
                <CardContent className="p-0">
                    <Image
                        src={settings.welcomeBanner.imageUrl}
                        alt="Welcome Banner"
                        width={1200}
                        height={400}
                        className="w-full h-auto object-cover rounded-lg"
                        data-ai-hint="king"
                        priority
                    />
                </CardContent>
            </Card>
        )}
        
        {banners.length > 0 && (
            <Card className="bg-card/80 border-white/10 shadow-lg overflow-hidden">
                <CardContent className="p-0">
                    <img
                        src={banners[0].imageUrl}
                        alt="Banner"
                        className="w-full h-auto max-h-[250px] object-cover"
                    />
                </CardContent>
            </Card>
        )}
        
        <Card className="bg-card/80 border-white/10 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl text-center font-bold">Latest Results</CardTitle>
          </CardHeader>
          <CardContent>
            {games.length > 0 ? (
              <div className="grid grid-cols-2 gap-1">
                {games.map((game) => (
                  <div key={game.id} className="flex flex-col items-center justify-center bg-[#34a387] p-0.5 rounded-lg border border-black text-center">
                    <span className="text-xs font-medium text-white [text-shadow:1px_1px_2px_#000]">{game.name}</span>
                    <span className="text-xs font-bold text-black">{formatGameResult(game, true)}</span>
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
                <CardHeader>
                    <CardTitle className="text-xl text-white">Notice</CardTitle>
                </CardHeader>
                <CardContent>
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
          <CardHeader>
            <CardTitle className="text-xl text-center">Matka Games</CardTitle>
          </CardHeader>
          <CardContent>
            {games.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                    {games.map((game) => (
                        <GameCard key={game.id} game={game} onBettingClosedClick={setClosedGameInfo} />
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
