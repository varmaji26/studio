
'use client';

import { useState, useEffect, useCallback } from 'react';
import { collection, query, onSnapshot, DocumentData, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader } from '@/components/loader';
import { Search, KeyRound } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { updateUserPassword } from '@/actions/update-user-password';

interface User extends DocumentData {
    id: string;
    displayName: string;
    mobile: string;
    uid: string;
}

export default function FindPasswordPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const fetchUsers = useCallback(() => {
    setLoading(true);
    const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const usersData: User[] = [];
      querySnapshot.forEach((doc) => {
        if (doc.data().displayName && doc.data().mobile) {
            usersData.push({ id: doc.id, ...doc.data(), uid: doc.id } as User);
        }
      });
      setUsers(usersData);
      setFilteredUsers(usersData);
      setLoading(false);
    }, (error) => {
        console.error("Error fetching users: ", error);
        setLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = fetchUsers();
    return () => unsubscribe();
  }, [fetchUsers]);
  
  useEffect(() => {
    const lowercasedFilter = searchTerm.toLowerCase().trim();
    if (!lowercasedFilter) {
        setFilteredUsers(users);
        return;
    }
    const filteredData = users.filter((user) => {
      return (
        user.displayName?.toLowerCase().includes(lowercasedFilter) ||
        user.mobile?.toLowerCase().includes(lowercasedFilter)
      );
    });
    setFilteredUsers(filteredData);
  }, [searchTerm, users]);
  
  const handlePasswordChange = async () => {
    if (!selectedUser || !newPassword) {
        toast({ variant: 'destructive', title: 'Error', description: 'Please select a user and enter a new password.' });
        return;
    }
    if (newPassword.length < 6) {
        toast({ variant: 'destructive', title: 'Error', description: 'Password must be at least 6 characters long.' });
        return;
    }

    setIsUpdating(true);
    const result = await updateUserPassword({ uid: selectedUser.uid, newPassword: newPassword });

    if (result.success) {
        toast({ title: 'Success!', description: `Password for ${selectedUser.displayName} has been updated.` });
        setNewPassword('');
        setSelectedUser(null);
    } else {
        toast({ variant: 'destructive', title: 'Error', description: result.message });
    }
    setIsUpdating(false);
  }

  return (
     <div className="flex-1 space-y-6">
        <Card className="bg-card/80 border-white/10 shadow-lg">
          <CardHeader>
            <CardTitle className="text-3xl font-bold">Find User Details & Reset Password</CardTitle>
            <CardDescription>
                Search for users and reset their password if needed.
            </CardDescription>
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

            {loading ? (
                <div className="flex justify-center items-center h-48">
                    <Loader className="h-8 w-8 text-primary" />
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>#</TableHead>
                                <TableHead>Username</TableHead>
                                <TableHead>Mobile Number</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredUsers.map((user, index) => (
                                <TableRow key={user.id}>
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell>{user.displayName}</TableCell>
                                    <TableCell>{user.mobile}</TableCell>
                                    <TableCell className="text-right">
                                       <AlertDialog onOpenChange={(open) => { if (!open) { setSelectedUser(null); setNewPassword(''); } }}>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="outline" size="sm" onClick={() => setSelectedUser(user)}>
                                                    <KeyRound className="h-4 w-4 mr-1" />
                                                    Change Password
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                <AlertDialogTitle>Change password for {selectedUser?.displayName}</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Enter a new password. The user will be able to log in with this new password immediately.
                                                </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <div className="py-4">
                                                    <Input 
                                                        type="text"
                                                        placeholder="Enter new password (min 6 characters)"
                                                        value={newPassword}
                                                        onChange={(e) => setNewPassword(e.target.value)}
                                                    />
                                                </div>
                                                <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={handlePasswordChange} disabled={isUpdating || newPassword.length < 6}>
                                                    {isUpdating ? <Loader className="mr-2 h-4 w-4" /> : null}
                                                    Confirm
                                                </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
            {filteredUsers.length === 0 && !loading && (
                <p className="text-center text-muted-foreground mt-4">
                  {searchTerm ? `No users found for "${searchTerm}".` : "No users found."}
                </p>
            )}
          </CardContent>
        </Card>
      </div>
  );
}
