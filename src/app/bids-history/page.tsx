
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// This page is deprecated and has been replaced by my-bets.
// We redirect to the new my-bets page by default.
export default function BidsHistoryPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/my-bets');
    }, [router]);

    return null; // Return null or a loading spinner while redirecting
}
