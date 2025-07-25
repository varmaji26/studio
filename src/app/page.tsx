
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/loader';
import { auth, db } from '@/lib/firebase';
import { collection, query, onSnapshot, orderBy, DocumentData, limit } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut, Menu, Crown, Banknote, MessageSquare, Phone, Clock, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

interface Game extends DocumentData {
    id: string;
    name: string;
    result: string;
    status: string;
    openTime: string;
    closeTime: string;
}

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [games, setGames] = useState<Game[]>([]);
  const [gamesLoading, setGamesLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const q = query(collection(db, "games"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const gamesData: Game[] = [];
      querySnapshot.forEach((doc) => {
        gamesData.push({ id: doc.id, ...doc.data() } as Game);
      });
      setGames(gamesData);
      setGamesLoading(false);
    });

    return () => unsubscribe();
  }, []);

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

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <header className="flex items-center justify-between p-4 bg-card/80 backdrop-blur-sm sticky top-0 z-50 border-b border-white/10">
        <Button variant="ghost" size="icon">
          <Menu className="h-6 w-6" />
        </Button>
        <div className="flex items-center gap-2 rounded-lg bg-black/30 px-3 py-1.5 border border-white/10">
            <Crown className="h-5 w-5 text-primary" />
            <span className="font-bold text-lg text-white">MATKA <span className="text-primary">KING</span></span>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Link href="/admin">
              <Button variant="ghost" size="icon" aria-label="Admin Panel">
                  <ShieldCheck className="h-6 w-6" />
              </Button>
            </Link>
          )}
          <Button onClick={handleLogout} variant="ghost" size="icon" aria-label="Logout">
              <LogOut className="h-6 w-6" />
          </Button>
        </div>
      </header>
      <main className="flex flex-col gap-4 p-4">
        <Card className="bg-card/80 border-white/10 shadow-lg">
            <CardContent className="p-6 text-center">
                <h1 className="text-3xl font-bold animate-pulse">Welcome to <span className="text-primary">MATKA KING</span></h1>
                <p className="text-muted-foreground mt-2">Get the latest game reviews, breaking news, in-depth guides, and join a thriving community of gamers!</p>
                <Button className="mt-6 w-full max-w-xs bg-primary text-primary-foreground font-bold text-lg h-12 rounded-lg shadow-[0_4px_20px_theme(colors.primary/40%)]">Explore Latest Articles</Button>
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
                                  <span className="text-sm font-bold text-primary">{game.result}</span>
                                  <span className="text-xs text-muted-foreground ml-2">({game.closeTime})</span>
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
                <CardTitle className="text-xl">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-2 sm:gap-4">
                <Button className="h-16 flex-col gap-1 bg-primary text-primary-foreground hover:bg-primary/90">
                    <Banknote className="h-6 w-6" />
                    <span className="text-xs">Deposit Funds</span>
                </Button>
                <Button className="h-16 flex-col gap-1 bg-green-500 text-white hover:bg-green-600">
                    <MessageSquare className="h-6 w-6" />
                    <span className="text-xs">WhatsApp Support</span>
                </Button>
                <Button className="h-16 flex-col gap-1 bg-red-500 text-white hover:bg-red-600">
                    <Phone className="h-6 w-6" />
                    <span className="text-xs">Call Support</span>
                </Button>
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
                        <div key={game.id} className="rounded-lg bg-slate-800/80 p-4 text-center space-y-3">
                            <h3 className="text-xl font-bold text-white">{game.name}</h3>
                            <div className="bg-yellow-400 text-black font-bold text-lg rounded-lg py-2 shadow-lg">{game.result}</div>
                            <p className="text-sm text-yellow-300">{game.status}</p>
                            <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold text-lg h-12 rounded-lg shadow-lg">
                                Play Now
                            </Button>
                            <div className="flex items-center justify-center text-xs text-muted-foreground mt-2">
                                <Clock className="h-4 w-4 mr-2" />
                                <span>Open: {game.openTime} | Close: {game.closeTime}</span>
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
