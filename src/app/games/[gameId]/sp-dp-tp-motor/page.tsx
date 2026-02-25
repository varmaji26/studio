'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { CalendarIcon, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { collection, runTransaction, doc, serverTimestamp, increment, DocumentData, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useGame } from '@/hooks/use-game';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader } from '@/components/loader';

// Pana lists from other files
const allSinglePanas: Record<string, string[]> = {
    '1': ['128', '137', '146', '236', '245', '290', '380', '470', '489', '560', '678', '579'],
    '2': ['129', '138', '147', '156', '237', '246', '345', '390', '480', '570', '589', '679'],
    '3': ['120', '139', '148', '157', '238', '247', '256', '346', '490', '580', '670', '689'],
    '4': ['130', '149', '158', '167', '239', '248', '257', '347', '356', '590', '680', '789'],
    '5': ['140', '159', '168', '230', '249', '258', '267', '348', '357', '459', '690', '780'],
    '6': ['123', '150', '169', '178', '240', '259', '268', '349', '358', '367', '450', '790'],
    '7': ['124', '160', '179', '250', '269', '278', '340', '359', '368', '458', '467', '890'],
    '8': ['125', '134', '170', '189', '260', '279', '350', '369', '378', '459', '468', '567'],
    '9': ['126', '135', '180', '234', '270', '289', '360', '379', '450', '469', '478', '568'],
    '0': ['127', '136', '145', '190', '235', '280', '370', '389', '460', '479', '569', '578'],
};
const allDoublePanas: Record<string, string[]> = {
    '1': ['100', '119', '155', '227', '335', '344', '399', '588', '669'],
    '2': ['110', '200', '228', '255', '336', '499', '660', '688', '778'],
    '3': ['166', '229', '300', '337', '355', '445', '599', '779', '788'],
    '4': ['112', '220', '266', '338', '400', '446', '455', '699', '770'],
    '5': ['113', '122', '177', '339', '366', '447', '500', '799', '889'],
    '6': ['114', '277', '330', '448', '466', '556', '600', '880', '899'],
    '7': ['115', '133', '188', '223', '377', '449', '557', '566', '700'],
    '8': ['116', '224', '233', '288', '440', '477', '558', '800', '990'],
    '9': ['117', '144', '199', '225', '388', '559', '577', '667', '900'],
    '0': ['118', '226', '244', '299', '334', '488', '550', '668', '677'],
};
const tpCustomMapping: Record<string, string> = {
    '1': '777', '2': '444', '3': '111', '4': '888', '5': '555',
    '6': '222', '7': '999', '8': '666', '9': '333', '0': '000',
};


const panaTypes = [
  { id: 'sp', label: 'SP' },
  { id: 'dp', label: 'DP' },
  { id: 'tp', label: 'TP' },
] as const;


const formSchema = z.object({
    session: z.enum(['Open', 'Close']),
    panaTypes: z.array(z.string()).refine((value) => value.some((item) => item), {
        message: "You have to select at least one pana type.",
    }),
    number: z.string().length(1, "Please enter a single digit."),
    points: z.coerce.number().min(10, "Minimum points is 10."),
});

type FormValues = z.infer<typeof formSchema>;

type BidItem = {
    number: string;
    amount: number;
    type: 'SP' | 'DP' | 'TP';
};

export default function SpDpTpMotorPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { game, now } = useGame();
  const [profile, setProfile] = useState<DocumentData>({});
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedBids, setSubmittedBids] = useState<BidItem[]>([]);
  
  const { openTime, closeTime } = useMemo(() => {
    if (!game) return { openTime: new Date(), closeTime: new Date() };
    const [openHours, openMinutes] = game.openTime.split(':').map(Number);
    const openTime = new Date(now);
    openTime.setHours(openHours, openMinutes, 0, 0);

    const [closeHours, closeMinutes] = game.closeTime.split(':').map(Number);
    const closeTime = new Date(now);
    closeTime.setHours(closeHours, closeMinutes, 0, 0);
    
    return { openTime, closeTime };
  }, [game, now]);
  
  const defaultSession = useMemo(() => {
    return now.getTime() >= openTime.getTime() ? 'Close' : 'Open';
  }, [now, openTime]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      session: defaultSession,
      panaTypes: [],
      number: '',
      points: undefined
    },
    mode: "onChange"
  });

  const session = form.watch('session');

  const { isBettingDisabled, isOpenSessionAllowed, isCloseSessionAllowed } = useMemo(() => {
    const openAllowed = now.getTime() < openTime.getTime();
    const closeAllowed = now.getTime() >= openTime.getTime() && now.getTime() < closeTime.getTime();
    const bettingDisabled = (session === 'Open' && !openAllowed) || (session === 'Close' && !closeAllowed);

    return { isBettingDisabled: bettingDisabled, isOpenSessionAllowed: openAllowed, isCloseSessionAllowed: closeAllowed };
  }, [now, openTime, closeTime, session]);
  
  useEffect(() => {
     form.setValue('session', defaultSession);
  }, [defaultSession, form]);
  
  useEffect(() => {
    if (!user) return;
    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
            setProfile(doc.data());
        }
    });
    return () => unsubscribe();
  }, [user]);

  const totalAmount = useMemo(() => {
    return submittedBids.reduce((acc, bid) => acc + Number(bid.amount), 0);
  }, [submittedBids]);

  const handleGenerate = (data: FormValues) => {
    const { number, points, panaTypes } = data;
    let generatedPanas: BidItem[] = [];

    if (panaTypes.includes('sp')) {
        const panas = allSinglePanas[number] || [];
        generatedPanas.push(...panas.map(p => ({ number: p, amount: points, type: 'SP' as const })));
    }
    if (panaTypes.includes('dp')) {
        const panas = allDoublePanas[number] || [];
        generatedPanas.push(...panas.map(p => ({ number: p, amount: points, type: 'DP' as const })));
    }
    if (panaTypes.includes('tp')) {
        const pana = tpCustomMapping[number];
        if (pana) {
            generatedPanas.push({ number: pana, amount: points, type: 'TP' as const });
        }
    }

    if (generatedPanas.length === 0) {
        toast({ title: "No Panas Generated", description: "Please select at least one valid pana type for the given digit.", variant: "destructive" });
        return;
    }

    setSubmittedBids(prev => [...prev, ...generatedPanas].sort((a, b) => a.number.localeCompare(b.number)));
    toast({ title: "Bids Generated", description: `${generatedPanas.length} bids have been added to your list.` });
  };

  const removeBid = (index: number) => {
    setSubmittedBids(prev => prev.filter((_, i) => i !== index));
  };
  
  const handleFinalSubmit = async () => {
    if (submittedBids.length === 0) {
      toast({ title: 'No Bids to Submit', description: 'Please generate some bids first.', variant: 'destructive' });
      return;
    }

    if (!user) {
        toast({ title: 'Error', description: 'User not found.', variant: 'destructive' });
        return;
    }

    if (totalAmount > ((profile.balance ?? 0) + (profile.bonusBalance ?? 0))) {
        toast({
            title: 'Insufficient Balance',
            description: `You need ${totalAmount} points, but your total balance is ${((profile.balance ?? 0) + (profile.bonusBalance ?? 0)).toFixed(2)}.`,
            variant: 'destructive',
        });
        return;
    }
    
    setIsSubmitting(true);
    const currentSession = form.getValues('session');
    
    try {
        await runTransaction(db, async (transaction) => {
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await transaction.get(userDocRef);
            if (!userDoc.exists()) {
              throw new Error("User not found.");
            }

            const userData = userDoc.data();
            const realBalance = userData.balance || 0;
            const bonusBalance = userData.bonusBalance || 0;

            if (totalAmount > (realBalance + bonusBalance)) {
                throw new Error("Insufficient total balance.");
            }
            
            let realAmountToDeduct = Math.min(totalAmount, realBalance);
            let bonusAmountToDeduct = totalAmount - realAmountToDeduct;

            transaction.update(userDocRef, {
                balance: increment(-realAmountToDeduct),
                bonusBalance: increment(-bonusAmountToDeduct)
            });
            
            const groupedBids: { [key: string]: { numbers: string[]; amount: number; type: 'SP' | 'DP' | 'TP' } } = {};
            submittedBids.forEach(bid => {
                const key = `${bid.type}-${bid.amount}`;
                if (!groupedBids[key]) {
                    groupedBids[key] = { numbers: [], amount: bid.amount, type: bid.type };
                }
                groupedBids[key].numbers.push(bid.number);
            });

            for (const key in groupedBids) {
                const group = groupedBids[key];
                const totalGroupAmount = group.amount * group.numbers.length;
                
                let betTypeForDb: 'Single Pana' | 'Double Pana' | 'Triple Pana' = 'Single Pana';
                if (group.type === 'DP') betTypeForDb = 'Double Pana';
                if (group.type === 'TP') betTypeForDb = 'Triple Pana';

                const bidData = {
                    userId: user.uid,
                    displayName: user.displayName,
                    mobile: userData.mobile,
                    gameId: game?.id,
                    gameName: game?.name,
                    betType: betTypeForDb,
                    session: currentSession,
                    numbers: group.numbers,
                    totalAmount: totalGroupAmount,
                    amountPerBet: group.amount,
                    status: 'running',
                };
                const newBidRef = doc(collection(db, "bids"));
                transaction.set(newBidRef, { ...bidData, createdAt: serverTimestamp() });
            }
        });

        toast({
            title: 'Bids Submitted!',
            description: `Your bids have been submitted. ${totalAmount} points deducted.`,
            className: 'bg-green-600 text-white',
        });
        
        form.reset();
        setSubmittedBids([]);

    } catch (error: any) {
        console.error("Error submitting bid: ", error);
        toast({
            title: 'Submission Failed',
            description: error.message || 'There was an error submitting your bids. Please try again.',
            variant: 'destructive',
        });
    } finally {
        setIsSubmitting(false);
    }
  };

    if (!game) {
      return <Loader />
    }
  
  const isBettingFinalDisabled = isBettingDisabled;

  return (
    <Form {...form}>
      <form className="space-y-6">
        <Card className="bg-background/80 border-white/10">
          <CardContent className="p-4 space-y-4 pb-40">
            <p className="text-center text-sm font-medium">{game.name}</p>
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-3 flex items-center gap-3">
              <CalendarIcon className="h-4 w-4" />
              <p className="text-sm font-medium">{format(new Date(), "EEEE, dd MMMM yyyy")}</p>
            </div>
            
            <div>
              <FormLabel className="text-xs font-medium">Choose Session</FormLabel>
              <Controller
                control={form.control}
                name="session"
                render={({ field }) => (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <Button type="button" variant={field.value === 'Open' ? 'default' : 'outline'} onClick={() => field.onChange('Open')} disabled={!isOpenSessionAllowed} className={cn("w-full h-9 text-sm", field.value === 'Open' ? "bg-primary text-white shadow-lg" : 'text-foreground hover:bg-accent')}>Open</Button>
                    <Button type="button" variant={field.value === 'Close' ? 'default' : 'outline'} onClick={() => field.onChange('Close')} disabled={!isCloseSessionAllowed} className={cn("w-full h-9 text-sm", field.value === 'Close' ? "bg-primary text-white shadow-lg" : 'text-foreground hover:bg-accent')}>Close</Button>
                  </div>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="panaTypes"
              render={() => (
                <FormItem>
                  <div className="flex justify-around items-center pt-2">
                    {panaTypes.map((item) => (
                      <FormField
                        key={item.id}
                        control={form.control}
                        name="panaTypes"
                        render={({ field }) => (
                          <FormItem key={item.id} className="flex flex-row items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(item.id)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...field.value, item.id])
                                    : field.onChange(field.value?.filter((value) => value !== item.id));
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-medium">{item.label}</FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                   <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="number"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input placeholder="Number" {...field} maxLength={1} className="text-center h-11 text-base"/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="points"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input type="number" placeholder="Enter Point" {...field} value={field.value ?? ''} className="text-center h-11 text-base"/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button type="button" onClick={form.handleSubmit(handleGenerate)} className="w-full h-12 text-base bg-orange-600 hover:bg-orange-700">
              Generate
            </Button>
            
            {submittedBids.length > 0 && (
                <div className="space-y-2 pt-4">
                    <h4 className="text-xs font-medium text-center text-muted-foreground">Generated Bids</h4>
                    <div className="border rounded-lg p-1 space-y-1 max-h-48 overflow-y-auto bg-slate-900 border-slate-700">
                        {submittedBids.map((bid, index) => (
                            <div key={index} className="flex justify-between items-center bg-slate-800 p-1 px-2 rounded-md animate-in fade-in-0">
                                <p className="text-xs">Pana: <span className="font-bold">{bid.number}</span> ({bid.type})</p>
                                <p className="text-xs">Amount: <span className="font-bold">₹{bid.amount}</span></p>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeBid(index)}>
                                    <Trash2 className="h-3 w-3 text-destructive"/>
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
          </CardContent>
          <CardFooter className="fixed bottom-0 left-0 right-0 max-w-2xl mx-auto bg-background/80 backdrop-blur-sm border-t border-border p-4 flex items-center justify-between gap-4 z-10">
            <div className="flex flex-col text-left">
              <span className="text-xs text-muted-foreground">Total Amount</span>
              <span className="font-bold text-lg">₹{totalAmount}</span>
            </div>
            <Button type="button" onClick={handleFinalSubmit} size="lg" className="w-2/3 text-sm bg-green-600 hover:bg-green-700" disabled={isSubmitting || submittedBids.length === 0 || isBettingFinalDisabled}>
              {isSubmitting ? <Loader className="mr-2" /> : null}
              {isBettingFinalDisabled ? 'Bidding Closed' : 'Submit Bids'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
