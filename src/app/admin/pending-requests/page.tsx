
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// This page is deprecated and has been split into two new pages.
// We redirect to the new deposit requests page by default.
export default function PendingRequestsPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/admin/deposit-requests');
    }, [router]);

    return null; // Return null or a loading spinner while redirecting
}
