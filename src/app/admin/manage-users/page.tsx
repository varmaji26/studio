
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, query, onSnapshot, DocumentData, orderBy, doc, runTransaction, increment, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader } from '@/components/loader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { UpdateBalanceDialog } from '@/components/update-balance-dialog';
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


interface User extends DocumentData {
    id: string;
    displayName: string;
    mobile: string;
    balance: number;
    createdAt: {
        seconds: number;
        nanoseconds: number;
    } | null;
}

const ITEMS_PER_PAGE = 10;

export default function ManageUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();

   const fetchUsers = useCallback(() => {
    setUsersLoading(true);
    const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const usersData: User[] = [];
      querySnapshot.forEach((doc) => {
        if (doc.data().displayName && doc.data().mobile) {
            usersData.push({ id: doc.id, ...doc.data() } as User);
        }
      });
      setUsers(usersData);
      setUsersLoading(false);
    }, (error) => {
        console.error("Error fetching users: ", error);
        toast({
            variant: 'destructive',
            title: 'Error fetching users',
            description: 'Could not fetch user data. Please check Firestore rules and console for errors.'
        });
        setUsersLoading(false);
    });

    return unsubscribe;
  }, [toast]);

  useEffect(() => {
    const unsubscribe = fetchUsers();
    return () => unsubscribe();
  }, [fetchUsers]);
  
  const filteredUsers = useMemo(() => {
    const lowercasedFilter = searchTerm.toLowerCase().trim();
    if (!lowercasedFilter) {
        return users;
    }
    return users.filter((user) => {
      return (
        user.displayName?.toLowerCase().includes(lowercasedFilter) ||
        user.mobile?.toLowerCase().includes(lowercasedFilter)
      );
    });
  }, [searchTerm, users]);

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);

  const paginatedUsers = useMemo(() => {
      const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
      return filteredUsers.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredUsers, currentPage]);

  useEffect(() => {
      setCurrentPage(1);
  }, [searchTerm]);


  const formatDate = (timestamp: { seconds: number, nanoseconds: number } | null | undefined) => {
    if (!timestamp || typeof timestamp.seconds !== 'number') return 'N/A';
    try {
      const date = new Date(timestamp.seconds * 1000);
      return date.toLocaleDateString('en-GB'); // Format as DD/MM/YYYY
    } catch (e) {
      console.error("Error formatting date: ", e);
      return 'Invalid Date';
    }
  };

  const handleDeleteUser = async (user: User) => {
    try {
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
            title: 'Success!',
            description: 'User has been deleted.'
        });
    } catch (error) {
        console.error("Error deleting user: ", error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Failed to delete user. Please try again.',
        });
    }
  };
  
  const renderPagination = () => {
    if (totalPages <= 1) return null;

    return (
        <div className="flex justify-between items-center mt-6 text-sm text-muted-foreground">
            <div>
                Showing <strong>{(currentPage - 1) * ITEMS_PER_PAGE + 1}</strong> to <strong>{Math.min(currentPage * ITEMS_PER_PAGE, filteredUsers.length)}</strong> of <strong>{filteredUsers.length}</strong> entries
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
                 <span className="bg-primary text-primary-foreground rounded-md px-3 py-1">{currentPage}</span>
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
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">All Users ({filteredUsers.length})</h3>
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                        placeholder="Search by name or mobile..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-input h-10 rounded-lg pl-10"
                    />
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
                                <TableHead>ID</TableHead>
                                <TableHead>Username</TableHead>
                                <TableHead>Mobile</TableHead>
                                <TableHead>Balance</TableHead>
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
                                    <TableCell>
                                        <Badge className="bg-green-500 text-white hover:bg-green-600">
                                            ACTIVE
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{formatDate(user.createdAt)}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex gap-2 justify-end">
                                            <UpdateBalanceDialog user={user}>
                                                <Button size="sm" variant="outline" className="border-blue-500 text-blue-500 hover:bg-blue-500/10 hover:text-blue-400">Add/Remove Balance</Button>
                                            </UpdateBalanceDialog>
                                            <Button size="sm" variant="outline" className="border-green-500 text-green-500 hover:bg-green-500/10 hover:text-green-400">View</Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button size="sm" variant="destructive">Delete</Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                    This action cannot be undone. This will permanently delete the user account.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDeleteUser(user)}>Continue</AlertDialogAction>
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
                  {searchTerm ? `No users found for "${searchTerm}".` : "No users found. Ensure user documents in Firestore have 'displayName' and 'mobile' fields."}
                </p>
            )}
          </CardContent>
        </Card>
      </div>
  );
}
