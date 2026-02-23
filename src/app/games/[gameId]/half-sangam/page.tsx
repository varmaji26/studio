'use client';

import { useGame } from '@/hooks/use-game';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Construction } from 'lucide-react';

export default function HalfSangamPage() {
    const { game } = useGame();

    return (
        <div className="space-y-4">
             <Alert className="bg-blue-900/50 border-blue-500/30 text-blue-300">
                <Construction className="h-4 w-4 text-blue-300" />
                <AlertTitle>Coming Soon!</AlertTitle>
                <AlertDescription>
                    Half Sangam betting for {game?.name} is under construction. Please check back later.
                </AlertDescription>
            </Alert>
        </div>
    );
}
