
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// This page is deprecated and has been replaced by /transactions.
// We redirect to the new transactions page by default.
export default function PaymentHistoryPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/transactions');
    }, [router]);

    return null; // Return null or a loading spinner while redirecting
}
