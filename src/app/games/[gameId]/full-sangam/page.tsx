'use client';

import { useGame } from '@/hooks/use-game';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Construction } from 'lucide-react';

export default function FullSangamPage() {
    const { game } = useGame();

    return (
        <div className="space-y-4">
            <Alert className="bg-red-900/50 border-red-500/30 text-red-300">
                <Construction className="h-4 w-4 text-red-300" />
                <AlertTitle>Coming Soon!</AlertTitle>
                <AlertDescription>
                    Full Sangam betting for {game?.name} is under construction. Please check back later.
                </AlertDescription>
            </Alert>
        </div>
    );
}
