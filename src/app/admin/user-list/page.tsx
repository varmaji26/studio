
'use client';

import { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader } from '@/components/loader';
import { Button } from '@/components/ui/button';
import { Download, LockKeyhole } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';

// Extend jsPDF with autoTable for TypeScript
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

interface User extends DocumentData {
    id: string;
    displayName: string;
    mobile: string;
}

const PASSWORD = "2085";

export default function UserListPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (!isAuthenticated) {
        setLoading(false);
        return;
    };

    const fetchUsers = async () => {
      setLoading(true);
      try {
        const usersQuery = query(collection(db, "users"), orderBy("displayName", "asc"));
        const usersSnapshot = await getDocs(usersQuery);
        const usersData: User[] = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        setUsers(usersData);
      } catch (error) {
        console.error("Error fetching users: ", error);
         toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to fetch user list.",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [isAuthenticated, toast]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === PASSWORD) {
        setIsAuthenticated(true);
    } else {
        toast({
            variant: "destructive",
            title: "Incorrect Password",
            description: "The password you entered is incorrect.",
        });
        setPasswordInput('');
    }
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    doc.text("User List", 14, 16);

    const tableColumn = ["#", "Username", "Mobile Number"];
    const tableRows: (string | number)[][] = [];

    users.forEach((user, index) => {
        const userRow = [
            index + 1,
            user.displayName,
            user.mobile || 'N/A'
        ];
        tableRows.push(userRow);
    });

    doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 24,
        headStyles: { fillColor: [22, 163, 74] }
    });

    doc.save(`user-list.pdf`);
  };

  if (!isAuthenticated) {
      return (
        <div className="flex-1 space-y-6">
            <Card className="bg-card/80 border-white/10 shadow-lg max-w-md mx-auto">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <LockKeyhole className="h-12 w-12 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-bold">Access Required</CardTitle>
                    <CardDescription>Please enter the password to view the user list.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handlePasswordSubmit} className="space-y-4">
                        <Input
                            type="password"
                            placeholder="Enter password"
                            value={passwordInput}
                            onChange={(e) => setPasswordInput(e.target.value)}
                            className="text-center"
                        />
                        <Button type="submit" className="w-full">
                            Unlock
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
      );
  }

  return (
    <div className="flex-1 space-y-6">
      <Card className="bg-card/80 border-white/10 shadow-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                  <CardTitle className="text-3xl font-bold">User List</CardTitle>
                  <CardDescription>A complete list of all registered users.</CardDescription>
              </div>
              <Button onClick={handleDownloadPDF} variant="outline" size="sm" disabled={users.length === 0}>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
              </Button>
          </div>
        </CardHeader>
        <CardContent>
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user, index) => (
                    <TableRow key={user.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{user.displayName}</TableCell>
                      <TableCell>{user.mobile}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {users.length === 0 && !loading && (
                <p className="text-center text-muted-foreground mt-4">No users found.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
