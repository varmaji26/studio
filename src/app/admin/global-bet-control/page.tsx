'use client';

import { useState, useEffect } from 'react';
import { doc, onSnapshot, updateDoc, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader } from '@/components/loader';
import { ShieldOff, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

const betTypes = [
  { id: 'singleDigit', label: 'Single Digit' },
  { id: 'jodiDigit', label: 'Jodi Digit' },
  { id: 'singlePana', label: 'Single Pana' },
  { id: 'singlePanaBulk', label: 'Single Pana Bulk' },
  { id: 'doublePana', label: 'Double Pana' },
  { id: 'doublePanaBulk', label: 'Double Pana Bulk' },
  { id: 'triplePana', label: 'Triple Pana' },
  { id: 'halfSangam', label: 'Half Sangam' },
  { id: 'fullSangam', label: 'Full Sangam' },
  { id: 'spDpTp', label: 'SP DP TP' },
  { id: 'spMotor', label: 'SP Motor' },
  { id: 'dpMotor', label: 'DP Motor' },
];

export default function GlobalBetControlPage() {
  const [settings, setSettings] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const docRef = doc(db, 'settings', 'app-settings');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setSettings(docSnap.data());
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleToggle = async (betTypeId: string, currentStatus: boolean) => {
    const docRef = doc(db, 'settings', 'app-settings');
    try {
      await updateDoc(docRef, {
        [`globalBetControl.${betTypeId}`]: !currentStatus,
      });
      toast({
        title: 'Status Updated',
        description: `${betTypes.find(b => b.id === betTypeId)?.label} is now ${!currentStatus ? 'Enabled' : 'Disabled'} globally.`,
      });
    } catch (error) {
      console.error('Error updating global bet control:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update setting.',
      });
    }
  };

  if (loading) return <div className="flex justify-center p-10"><Loader className="h-10 w-10 text-primary" /></div>;

  const control = settings?.globalBetControl || {};

  return (
    <div className="flex-1 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Global Bet Control</h1>
        <p className="text-muted-foreground">Enable or disable specific bet types across all games instantly.</p>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {betTypes.map((bet) => {
          const isEnabled = control[bet.id] !== false; // Default to true if not set
          return (
            <Card key={bet.id} className={cn("transition-all duration-300", !isEnabled && "opacity-80 grayscale")}>
              <CardContent className="flex items-center justify-between p-6">
                <div className="flex items-center gap-3">
                  {isEnabled ? <ShieldCheck className="h-6 w-6 text-green-500" /> : <ShieldOff className="h-6 w-6 text-destructive" />}
                  <div>
                    <Label htmlFor={bet.id} className="text-base font-semibold block">{bet.label}</Label>
                    <p className="text-xs text-muted-foreground">{isEnabled ? 'Active' : 'Closed Globally'}</p>
                  </div>
                </div>
                <Switch
                  id={bet.id}
                  checked={isEnabled}
                  onCheckedChange={() => handleToggle(bet.id, isEnabled)}
                />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
