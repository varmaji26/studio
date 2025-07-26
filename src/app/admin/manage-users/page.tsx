
'use client';

import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, DocumentData, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader } from '@/components/loader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

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

export default function ManageUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

   useEffect(() => {
    const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const usersData: User[] = [];
      querySnapshot.forEach((doc) => {
        usersData.push({ id: doc.id, ...doc.data() } as User);
      });
      setUsers(usersData);
      setUsersLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const formatDate = (timestamp: { seconds: number, nanoseconds: number } | null) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString('en-GB');
  };

  return (
     <div className="flex-1 space-y-4 p-4 sm:p-8">
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
            <h3 className="text-xl font-semibold mb-4">All Users</h3>
            {usersLoading ? (
                <div className="flex justify-center items-center h-48">
                    <Loader className="h-8 w-8 text-primary" />
                </div>
            ) : (
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
                            {users.map((user, index) => (
                                <TableRow key={user.id}>
                                    <TableCell>{index + 1}</TableCell>
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
                                            <Button size="sm" variant="outline" className="border-blue-500 text-blue-500 hover:bg-blue-500/10 hover:text-blue-400">Edit</Button>
                                            <Button size="sm" variant="outline" className="border-green-500 text-green-500 hover:bg-green-500/10 hover:text-green-400">View</Button>
                                            <Button size="sm" variant="destructive">Delete</Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
            {users.length === 0 && !usersLoading && (
                <p className="text-center text-muted-foreground mt-4">No users found.</p>
            )}
          </CardContent>
        </Card>
      </div>
  );
}
