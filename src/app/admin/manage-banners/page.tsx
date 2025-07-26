
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, addDoc, serverTimestamp, query, onSnapshot, orderBy, DocumentData, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription as FormDescriptionComponent } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader } from '@/components/loader';
import Image from 'next/image';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const bannerSchema = z.object({
  bannerImage: z
    .any()
    .refine((files) => files?.length === 1, 'Banner image is required.')
    .refine((files) => files?.[0]?.size <= MAX_FILE_SIZE, `Max file size is 5MB.`)
    .refine(
      (files) => ACCEPTED_IMAGE_TYPES.includes(files?.[0]?.type),
      ".jpg, .jpeg, .png and .webp files are accepted."
    ),
});

type BannerFormValues = z.infer<typeof bannerSchema>;

interface Banner extends DocumentData {
    id: string;
    imageUrl: string;
    storagePath: string;
}

export default function ManageBannersPage() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);

  const form = useForm<BannerFormValues>({
    resolver: zodResolver(bannerSchema),
  });
  
  const imageRef = form.register("bannerImage");

  useEffect(() => {
    const q = query(collection(db, "banners"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const bannersData: Banner[] = [];
      querySnapshot.forEach((doc) => {
        bannersData.push({ id: doc.id, ...doc.data() } as Banner);
      });
      setBanners(bannersData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const onSubmit = async (values: BannerFormValues) => {
    setIsSubmitting(true);
    const file = values.bannerImage[0];
    const storagePath = `banners/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, storagePath);

    try {
      // Upload file to Firebase Storage
      const snapshot = await uploadBytes(storageRef, file);
      // Get download URL
      const downloadURL = await getDownloadURL(snapshot.ref);

      // Add banner info to Firestore
      await addDoc(collection(db, 'banners'), {
        imageUrl: downloadURL,
        storagePath: storagePath,
        createdAt: serverTimestamp(),
      });

      toast({
        title: 'Success!',
        description: 'New banner has been added.',
      });
      form.reset();
    } catch (error) {
      console.error('Error adding banner: ', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to add the banner. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDeleteBanner = async (banner: Banner) => {
    const storageRef = ref(storage, banner.storagePath);
    try {
        // Delete from Firestore
        await deleteDoc(doc(db, "banners", banner.id));
        // Delete from Storage
        await deleteObject(storageRef);

        toast({
            title: 'Success!',
            description: 'Banner has been deleted.'
        });
    } catch (error) {
        console.error("Error deleting banner: ", error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Failed to delete banner. Please try again.',
        });
    }
  };

  return (
    <div className="flex-1 space-y-8 p-4 sm:p-8">
      <Card className="bg-card/80 border-white/10 shadow-lg max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl">Add New Banner</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="bannerImage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Banner Image</FormLabel>
                      <FormControl>
                        <Input type="file" {...imageRef} className="bg-input h-12 rounded-lg" accept={ACCEPTED_IMAGE_TYPES.join(',')} />
                      </FormControl>
                      <FormDescriptionComponent>
                        Recommended size: 1200x400 pixels. Max file size: 5MB.
                      </FormDescriptionComponent>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full h-12 rounded-lg text-lg font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_4px_20px_theme(colors.primary/40%)]" disabled={isSubmitting}>
                  {isSubmitting ? <Loader className="mr-2 h-5 w-5" /> : null}
                  Add Banner
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
        
        <Card className="bg-card/80 border-white/10 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">All Banners</CardTitle>
            <CardDescription>View and delete existing banners.</CardDescription>
          </CardHeader>
          <CardContent>
             {loading ? (
                <div className="flex justify-center items-center h-48">
                    <Loader className="h-8 w-8 text-primary" />
                </div>
            ) : banners.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {banners.map((banner) => (
                        <Card key={banner.id} className="overflow-hidden relative group">
                            <Image src={banner.imageUrl} alt="Banner" width={400} height={200} className="w-full h-40 object-cover" />
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button size="sm" variant="destructive">Delete</Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This action cannot be undone. This will permanently delete the banner.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDeleteBanner(banner)}>Continue</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <p className="text-center text-muted-foreground mt-4">No banners found. Add a new banner to get started.</p>
            )}
          </CardContent>
        </Card>
    </div>
  );
}
