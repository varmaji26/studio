'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { doc, runTransaction, collection, serverTimestamp, increment, onSnapshot, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader } from '@/components/loader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { CalendarIcon, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useGame } from '@/hooks/use-game';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

// Pana lists
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

interface BidItem {
    number: string;
    amount: number;
    type: 'SP' | 'DP' | 'TP';
}

const formSchema = z.object({
    session: z.enum(['Open', 'Close']),
    selectedTypes: z.array(z.string()).refine((value) => value.some((item) => item), {
        message: "Select at least one type.",
    }),
    number: z.string().length(1, "Enter a single digit.").regex(/^\d+$/, "Digits only."),
    points: z.coerce.number().min(10, "Min points is 10."),
});

type FormValues = z.infer<typeof formSchema>;

export default function SpDpTpPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { game, now } = useGame();
  const [profile, setProfile] = useState<DocumentData>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedBids, setSubmittedBids] = useState<BidItem[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (user?.uid) {
        const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (doc) => {
            if (doc.exists()) setProfile(doc.data());
        });
        return () => unsubscribe();
    }
  }, [user]);

  const { openTime, closeTime } = useMemo(() => {
    if (!game || !isMounted) return { openTime: new Date(), closeTime: new Date(), isBettingDisabled: true };
    const [oh, om] = game.openTime.split(':').map(Number);
    const [ch, cm] = game.closeTime.split(':').map(Number);
    const ot = new Date(now); ot.setHours(oh, om, 0, 0);
    const ct = new Date(now); ct.setHours(ch, cm, 0, 0);
    return { openTime: ot, closeTime: ct };
  }, [game, now, isMounted]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      session: now < openTime ? 'Open' : 'Close',
      selectedTypes: [],
      number: '',
      points: undefined,
    },
  });

  const session = form.watch('session');
  const sessionAllowed = session === 'Open' ? now < openTime : now < closeTime;

  const handleGenerate = (data: FormValues) => {
    const { number, points, selectedTypes } = data;
    let generated: BidItem[] = [];

    if (selectedTypes.includes('sp')) {
        generated.push(...(allSinglePanas[number] || []).map(p => ({ number: p, amount: points, type: 'SP' as const })));
    }
    if (selectedTypes.includes('dp')) {
        generated.push(...(allDoublePanas[number] || []).map(p => ({ number: p, amount: points, type: 'DP' as const })));
    }
    if (selectedTypes.includes('tp')) {
        const p = tpCustomMapping[number];
        if (p) generated.push({ number: p, amount: points, type: 'TP' as const });
    }

    if (generated.length === 0) {
        toast({ variant: 'destructive', title: "No Panas", description: "Could not generate any panas." });
        return;
    }

    setSubmittedBids(prev => [...prev, ...generated].sort((a,b) => a.number.localeCompare(b.number)));
    form.reset({ ...form.getValues(), number: '', points: undefined });
  };

  const totalAmount = useMemo(() => submittedBids.reduce((acc, b) => acc + b.amount, 0), [submittedBids]);

  const handleFinalSubmit = async () => {
    if (!user || !game || submittedBids.length === 0) return;
    const balance = (profile.balance || 0) + (profile.bonusBalance || 0);
    if (totalAmount > balance) {
        toast({ variant: 'destructive', title: 'Insufficient Balance' });
        return;
    }

    setIsSubmitting(true);
    try {
        await runTransaction(db, async (tx) => {
            const userRef = doc(db, 'users', user.uid);
            const userDoc = await tx.get(userRef);
            const userData = userDoc.data();
            const real = userData?.balance || 0;
            const bonus = userData?.bonusBalance || 0;

            let deductReal = Math.min(totalAmount, real);
            let deductBonus = totalAmount - deductReal;

            tx.update(userRef, { balance: increment(-deductReal), bonusBalance: increment(-deductBonus) });

            const grouped: Record<string, { numbers: string[]; amount: number; type: string }> = {};
            submittedBids.forEach(b => {
                const key = `${b.type}-${b.amount}`;
                if (!grouped[key]) grouped[key] = { numbers: [], amount: b.amount, type: b.type };
                grouped[key].numbers.push(b.number);
            });

            Object.values(grouped).forEach(g => {
                const betType = g.type === 'DP' ? 'Double Pana' : g.type === 'TP' ? 'Triple Pana' : 'Single Pana';
                tx.set(doc(collection(db, 'bids')), {
                    userId: user.uid, displayName: user.displayName, mobile: profile.mobile,
                    gameId: game.id, gameName: game.name, betType, session,
                    numbers: g.numbers, amountPerBet: g.amount, totalAmount: g.amount * g.numbers.length,
                    status: 'running', createdAt: serverTimestamp()
                });
            });
        });
        toast({ title: 'Bids Submitted!', className: 'bg-green-600 text-white' });
        setSubmittedBids([]);
    } catch (e) {
        console.error(e);
        toast({ variant: 'destructive', title: 'Error' });
    } finally {
        setIsSubmitting(false);
    }
  };

  if (!isMounted || !game) return <div className="flex h-screen items-center justify-center"><Loader className="h-10 w-10 text-primary" /></div>;

  return (
    <div className="space-y-4">
        <Card className="bg-gradient-to-b from-slate-800 to-slate-900 border-white/10">
            <CardContent className="p-4 space-y-4 pb-20">
                <p className="text-center font-bold text-lg text-primary">{game.name}</p>
                <div className="rounded-lg border bg-card p-3 flex items-center justify-center gap-3">
                    <CalendarIcon className="h-4 w-4" />
                    <p className="text-sm font-medium">{format(new Date(), "EEEE, dd MMMM yyyy")}</p>
                </div>

                <Form {...form}>
                    <form className="space-y-4">
                        <div className="grid grid-cols-2 gap-2">
                            <Button type="button" variant={session === 'Open' ? 'default' : 'outline'} onClick={() => form.setValue('session', 'Open')} disabled={now >= openTime} className="h-10">Open</Button>
                            <Button type="button" variant={session === 'Close' ? 'default' : 'outline'} onClick={() => form.setValue('session', 'Close')} disabled={now >= closeTime} className="h-10">Close</Button>
                        </div>

                        <div className="flex justify-around items-center py-2 border rounded-lg bg-card/50">
                            {panaTypes.map((t) => (
                                <FormField key={t.id} control={form.control} name="selectedTypes" render={({ field }) => (
                                    <FormItem className="flex items-center space-x-2 space-y-0">
                                        <FormControl>
                                            <Checkbox checked={field.value.includes(t.id)} onCheckedChange={(c) => c ? field.onChange([...field.value, t.id]) : field.onChange(field.value.filter(v => v !== t.id))} />
                                        </FormControl>
                                        <FormLabel className="font-bold cursor-pointer">{t.label}</FormLabel>
                                    </FormItem>
                                )} />
                            ))}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <FormField control={form.control} name="number" render={({ field }) => (
                                <FormItem><FormControl><Input placeholder="Digit (0-9)" {...field} maxLength={1} className="text-center h-12 text-lg font-bold" /></FormControl></FormItem>
                            )} />
                            <FormField control={form.control} name="points" render={({ field }) => (
                                <FormItem><FormControl><Input type="number" placeholder="Points" {...field} value={field.value ?? ''} className="text-center h-12 text-lg font-bold" /></FormControl></FormItem>
                            )} />
                        </div>

                        <Button type="button" onClick={form.handleSubmit(handleGenerate)} className="w-full h-12 bg-orange-600 hover:bg-orange-700 font-bold" disabled={!sessionAllowed}>Generate</Button>
                    </form>
                </Form>

                {submittedBids.length > 0 && (
                    <div className="space-y-2">
                        <div className="flex justify-between items-center px-1">
                            <h4 className="text-[10px] font-bold text-muted-foreground uppercase text-center w-full">GENERATED BIDS ({submittedBids.length})</h4>
                        </div>
                        <div className="border rounded-lg p-1 border-white/5 bg-slate-950/50">
                            <ScrollArea className="h-28">
                                <div className="space-y-1 p-1">
                                    {submittedBids.map((b, i) => (
                                        <div key={i} className="flex justify-between items-center bg-slate-800/80 p-1 px-3 rounded-md border border-white/5 text-[10px]">
                                            <p className="font-bold"><span className="text-primary">{b.type}:</span> {b.number}</p>
                                            <div className="flex items-center gap-3">
                                                <p className="font-bold text-green-400">₹{b.amount}</p>
                                                <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => setSubmittedBids(prev => prev.filter((_, idx) => idx !== i))}><Trash2 className="h-3 w-3"/></Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    </div>
                )}
            </CardContent>
            <CardFooter className="fixed bottom-0 left-0 right-0 max-w-2xl mx-auto bg-background/95 backdrop-blur-sm border-t p-4 flex items-center justify-between gap-4 z-50">
                <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground font-bold uppercase">Total Amount</span>
                    <span className="font-black text-xl text-primary">₹{totalAmount}</span>
                </div>
                <Button onClick={handleFinalSubmit} size="lg" className="flex-1 bg-green-600 hover:bg-green-700 font-black text-white" disabled={isSubmitting || submittedBids.length === 0 || !sessionAllowed}>
                    {isSubmitting ? <Loader className="h-5 w-5 mr-2" /> : null}
                    {sessionAllowed ? 'Submit Bids' : 'Market Closed'}
                </Button>
            </CardFooter>
        </Card>
    </div>
  );
}
