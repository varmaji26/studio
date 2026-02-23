
'use client';

import { useGame } from '@/hooks/use-game';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Construction } from 'lucide-react';

export default function SPMotorPage() {
    const { game } = useGame();

    return (
        <div className="space-y-4">
            <Alert className="bg-gray-700/50 border-gray-500/30 text-gray-300">
                <Construction className="h-4 w-4 text-gray-300" />
                <AlertTitle>Coming Soon!</AlertTitle>
                <AlertDescription>
                    SP Motor betting for {game?.name} is under construction. Please check back later.
                </AlertDescription>
            </Alert>
        </div>
    );
}
