
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { collection, query, onSnapshot, DocumentData, orderBy, doc, runTransaction, increment, writeBatch, getDocs, limit, startAfter, QueryDocumentSnapshot, endBefore, limitToLast, updateDoc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader } from '@/components/loader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Search, Calendar as CalendarIcon, UserX, UserCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
import { ChangePasswordDialog } from '@/components/change-password-dialog';
import { deleteAuthUser } from '@/actions/delete-user';

const UpdateBalanceDialog = dynamic(() => import('@/components/update-balance-dialog'), {
  ssr: false,
  loading: () => <Loader />,
});

interface User extends DocumentData {
    id: string;
    displayName: string;
    mobile: string;
    balance: number;
    bonusBalance?: number;
    createdAt: {
        seconds: number;
        nanoseconds: number;
    } | null;
    isBlocked?: boolean;
}

const ITEMS_PER_PAGE = 10;

export default function ManageUsersPage() {
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get('viewed') === 'true') {
        localStorage.setItem('lastViewedUsersTimestamp', Date.now().toString());
        window.dispatchEvent(new Event('storage'));
    }
  }, [searchParams]);

   useEffect(() => {
    setUsersLoading(true);
    const q = query(collection(db, "users"), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const usersData: User[] = [];
        querySnapshot.forEach((doc) => {
            if (doc.data().displayName && doc.data().mobile) {
                usersData.push({ id: doc.id, ...doc.data() } as User);
            }
        });
        setAllUsers(usersData);
        setUsersLoading(false);
    }, (error) => {
        console.error("Error fetching users: ", error);
        toast({
            variant: 'destructive',
            title: 'Error fetching users',
            description: 'Could not fetch user data.'
        });
        setUsersLoading(false);
    });

    return () => unsubscribe();
   }, [toast]);
  
  const filteredUsers = useMemo(() => {
    let source = allUsers;
    let filtered = source;

    if (selectedDate) {
        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);
        
        filtered = filtered.filter(user => {
            if (!user.createdAt?.seconds) return false;
            const userDate = new Date(user.createdAt.seconds * 1000);
            return userDate >= startOfDay && userDate <= endOfDay;
        });
    }

    const lowercasedFilter = searchTerm.toLowerCase().trim();
    if (lowercasedFilter) {
      filtered = filtered.filter((user) => {
        return (
          user.displayName?.toLowerCase().includes(lowercasedFilter) ||
          user.mobile?.toLowerCase().includes(lowercasedFilter)
        );
      });
    }

    return filtered;
  }, [searchTerm, allUsers, selectedDate]);
  
  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredUsers.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredUsers, currentPage]);

  useEffect(() => {
      setCurrentPage(1);
  }, [searchTerm, selectedDate]);

  const formatDate = (timestamp: { seconds: number, nanoseconds: number } | null | undefined) => {
    if (!timestamp || typeof timestamp.seconds !== 'number') return 'N/A';
    try {
      const date = new Date(timestamp.seconds * 1000);
      return date.toLocaleDateString('en-GB');
    } catch (e) {
      console.error("Error formatting date: ", e);
      return 'Invalid Date';
    }
  };

  const handleDeleteUser = async (user: User) => {
    try {
        // First, delete the user from Firebase Authentication
        const authResult = await deleteAuthUser(user.id);

        if (!authResult.success && authResult.message.includes('User not found')) {
            // If user is not in Auth, they might be a leftover. 
            // We can still proceed to delete from Firestore.
            toast({
                variant: 'default',
                title: 'Partial Reset',
                description: 'User not found in Authentication, but proceeding to delete from database.',
            });
        } else if (!authResult.success) {
            // For other auth errors, stop the process.
            throw new Error(authResult.message);
        }

        // Then, delete from Firestore and update stats
        const batch = writeBatch(db);
        const userDocRef = doc(db, "users", user.id);
        batch.delete(userDocRef);

        const statsDocRef = doc(db, 'app-stats', 'dashboard');
        batch.update(statsDocRef, { 
            totalUsers: increment(-1),
            totalBalance: increment(-(user.balance || 0))
        });
        
        await batch.commit();

        toast({
            title: 'User Reset Successfully!',
            description: `${user.displayName} has been deleted. They can now re-register with the same mobile number.`
        });
    } catch (error: any) {
        console.error("Error deleting user: ", error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: error.message || 'Failed to delete user. Please try again.',
        });
    }
  };

  const handleToggleBlockUser = async (user: User) => {
    const userDocRef = doc(db, "users", user.id);
    const statsDocRef = doc(db, 'app-stats', 'dashboard');
    const newStatus = !user.isBlocked;

    try {
        if (newStatus) { // If blocking user
            await runTransaction(db, async (transaction) => {
                const userDoc = await transaction.get(userDocRef);
                if (!userDoc.exists()) {
                    throw new Error("User not found.");
                }
                const currentBalance = userDoc.data().balance || 0;

                const winningBidsQuery = query(collection(db, 'bids'), where('userId', '==', user.id), where('status', '==', 'won'));
                const winningBidsSnapshot = await getDocs(winningBidsQuery);

                let totalWinningsToRevert = 0;
                winningBidsSnapshot.forEach(bidDoc => {
                    const winningAmount = bidDoc.data().winningAmount || 0;
                    totalWinningsToRevert += winningAmount;
                    transaction.update(bidDoc.ref, { status: 'cancelled', winningAmount: 0 });
                });
                
                // Set balance and bonus balance to 0 and update total balance stats
                transaction.update(userDocRef, { 
                    balance: 0,
                    bonusBalance: 0,
                    isBlocked: true 
                });
                transaction.update(statsDocRef, { totalBalance: increment(-currentBalance) });
            });

            toast({
                title: 'User Blocked!',
                description: `${user.displayName} has been blocked, winnings reverted, and balance set to zero.`
            });

        } else { // If unblocking user
            await updateDoc(userDocRef, { isBlocked: false });
            toast({
                title: 'User Unblocked!',
                description: `${user.displayName} can now log in and use the app again.`
            });
        }
    } catch (error) {
        console.error("Error updating user status:", error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: `Failed to ${newStatus ? 'block' : 'unblock'} user.`,
        });
    }
  };
  
  const renderPagination = () => {
    if (totalPages <= 1) return null;

    return (
        <div className="flex justify-between items-center mt-6 text-sm text-muted-foreground">
            <div>
                Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
            </div>
            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                >
                    Previous
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                >
                    Next
                </Button>
            </div>
        </div>
    )
  }


  return (
     <div className="flex-1 space-y-6">
        <Card className="bg-card/80 border-white/10 shadow-lg">
          <CardHeader>
            <CardTitle className="text-3xl font-bold">Manage Users</CardTitle>
            <CardDescription>View and manage all registered users</CardDescription>
            <div className="pt-4">
                <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back to Dashboard</span>
                </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                <h3 className="text-xl font-semibold">All Users</h3>
                <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                     <Popover>
                        <PopoverTrigger asChild>
                            <Button
                            variant={"outline"}
                            className={cn(
                                "w-full sm:w-[180px] justify-start text-left font-normal",
                                !selectedDate && "text-muted-foreground"
                            )}
                            >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {selectedDate ? format(selectedDate, "dd MMM, yyyy") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={setSelectedDate}
                            initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                    <div className="relative w-full sm:w-auto sm:max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                            placeholder="Search by name or mobile..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-input h-10 rounded-lg pl-10"
                        />
                    </div>
                </div>
            </div>

            {usersLoading ? (
                <div className="flex justify-center items-center h-48">
                    <Loader className="h-8 w-8 text-primary" />
                </div>
            ) : (
                <>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>#</TableHead>
                                <TableHead>Username</TableHead>
                                <TableHead>Mobile</TableHead>
                                <TableHead>Balance</TableHead>
                                <TableHead>Bonus</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Joined</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedUsers.map((user, index) => (
                                <TableRow key={user.id}>
                                    <TableCell>{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</TableCell>
                                    <TableCell>{user.displayName}</TableCell>
                                    <TableCell>{user.mobile}</TableCell>
                                    <TableCell>₹{user.balance || 0}</TableCell>
                                    <TableCell>₹{user.bonusBalance || 0}</TableCell>
                                    <TableCell>
                                        <Badge className={user.isBlocked ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}>
                                            {user.isBlocked ? 'BLOCKED' : 'ACTIVE'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{formatDate(user.createdAt)}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex flex-wrap gap-2 justify-end">
                                            <UpdateBalanceDialog user={user}>
                                                <Button size="sm" variant="outline">Balance</Button>
                                            </UpdateBalanceDialog>
                                             <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                   <Button size="sm" variant={user.isBlocked ? 'secondary' : 'destructive'}>
                                                        {user.isBlocked ? <UserCheck className="h-4 w-4 mr-1" /> : <UserX className="h-4 w-4 mr-1" />}
                                                        {user.isBlocked ? 'Unblock' : 'Block'}
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                     <AlertDialogDescription>
                                                        {user.isBlocked
                                                            ? `This will unblock ${user.displayName}, allowing them to log in again.`
                                                            : `This will block ${user.displayName}, preventing them from logging in. It will also revert all their winning bets and set their entire balance (real and bonus) to zero.`}
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleToggleBlockUser(user)}>Confirm</AlertDialogAction>
                                                </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                {renderPagination()}
                </>
            )}
            {paginatedUsers.length === 0 && !usersLoading && (
                <p className="text-center text-muted-foreground mt-4">
                  {searchTerm || selectedDate ? `No users found matching the criteria.` : "No users found. Ensure user documents in Firestore have 'displayName' and 'mobile' fields."}
                </p>
            )}
          </CardContent>
        </Card>
      </div>
  );
}
