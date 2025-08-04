
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

// This is placeholder data. You can replace it with data from your database.
const placeholderData = [
    { id: '1', type: 'Jodi', numbers: '00, 11, 22, 33, 44, 55, 66, 77, 88, 99' },
    { id: '2', type: 'Single Pana', numbers: '123, 456, 789' },
    { id: '3', type: 'Double Pana', numbers: '112, 223, 334' },
    { id: '4', type: 'Triple Pana', numbers: '111, 222, 333' },
];

export default function JodiPanelPage() {
  const [panelData, setPanelData] = useState(placeholderData);

  return (
    <div className="flex-1 space-y-8 p-4 sm:p-8">
      <Card className="bg-card/80 border-white/10 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl">Jodi & Panel List</CardTitle>
            <CardDescription>View and manage predefined Jodi and Panel sets.</CardDescription>
          </div>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add New Set
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Numbers</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {panelData.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.type}</TableCell>
                    <TableCell className="text-muted-foreground truncate max-w-xs">{item.numbers}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm">Edit</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
