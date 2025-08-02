
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { doc, getDoc, setDoc, DocumentData } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription as FormDescriptionComponent } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader } from '@/components/loader';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import Image from 'next/image';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const settingsSchema = z.object({
  whatsappNumber: z.string().min(10, 'Please enter a valid mobile number with country code.').regex(/^\d+$/, 'Mobile number must contain only digits.'),
  callSupportNumber: z.string().min(10, 'Please enter a valid mobile number with country code.').regex(/^\d+$/, 'Mobile number must contain only digits.'),
  telegramLink: z.string().url('Please enter a valid URL.').optional().or(z.literal('')),
  upiId: z.string().optional(),
  bankDetails: z.string().optional(),
  paytmNumber: z.string().optional(),
  qrCodeImage: z.any()
    .optional()
    .refine((files) => !files || files.length === 0 || files?.[0]?.size <= MAX_FILE_SIZE, `Max file size is 5MB.`)
    .refine(
      (files) => !files || files.length === 0 || ACCEPTED_IMAGE_TYPES.includes(files?.[0]?.type),
      ".jpg, .jpeg, .png and .webp files are accepted."
    ),
  welcomeBannerImage: z.any()
    .optional()
    .refine((files) => !files || files.length === 0 || files?.[0]?.size <= MAX_FILE_SIZE, `Max file size is 5MB.`)
    .refine(
      (files) => !files || files.length === 0 || ACCEPTED_IMAGE_TYPES.includes(files?.[0]?.type),
      ".jpg, .jpeg, .png and .webp files are accepted."
    ),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export default function SettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  
  const [existingQrUrl, setExistingQrUrl] = useState<string | null>(null);
  const [existingQrStoragePath, setExistingQrStoragePath] = useState<string | null>(null);
  const [existingWelcomeBannerUrl, setExistingWelcomeBannerUrl] = useState<string | null>(null);
  const [existingWelcomeBannerStoragePath, setExistingWelcomeBannerStoragePath] = useState<string | null>(null);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      whatsappNumber: '',
      callSupportNumber: '',
      telegramLink: '',
      upiId: '',
      bankDetails: '',
      paytmNumber: '',
    },
  });

  const qrCodeImageRef = form.register("qrCodeImage");
  const welcomeBannerImageRef = form.register("welcomeBannerImage");

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const settingsDocRef = doc(db, 'settings', 'app-settings');
        const docSnap = await getDoc(settingsDocRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as DocumentData;
          form.reset({
            whatsappNumber: data.whatsappNumber || '',
            callSupportNumber: data.callSupportNumber || '',
            telegramLink: data.telegramLink || '',
            upiId: data.paymentDetails?.UPI?.details || '',
            bankDetails: data.paymentDetails?.['Bank Transfer']?.details || '',
            paytmNumber: data.paymentDetails?.['Paytm/PhonePe']?.details || '',
          });
          if (data.paymentDetails?.['Scan QR Code']) {
            setExistingQrUrl(data.paymentDetails['Scan QR Code'].imageUrl);
            setExistingQrStoragePath(data.paymentDetails['Scan QR Code'].storagePath);
          }
          if (data.welcomeBanner) {
            setExistingWelcomeBannerUrl(data.welcomeBanner.imageUrl);
            setExistingWelcomeBannerStoragePath(data.welcomeBanner.storagePath);
          }
        }
      } catch (error) {
        console.error("Error fetching settings: ", error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to fetch settings.',
        });
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [form, toast]);

  const uploadFile = async (file: File, path: string, oldStoragePath: string | null): Promise<{ downloadURL: string; storagePath: string }> => {
    if (oldStoragePath) {
        const oldStorageRef = ref(storage, oldStoragePath);
        try {
            await deleteObject(oldStorageRef);
        } catch (e) {
            console.warn("Could not delete old file, it might not exist:", e);
        }
    }
    const storagePath = `${path}/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise((resolve, reject) => {
        uploadTask.on('state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                setUploadProgress(progress);
            },
            (error) => {
                console.error('Upload failed:', error);
                reject(new Error(`File upload failed: ${error.message}`));
            },
            async () => {
                try {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    resolve({ downloadURL, storagePath });
                } catch (e) {
                    reject(e);
                }
            }
        );
    });
};


  const onSubmit = async (values: SettingsFormValues) => {
    setIsSubmitting(true);
    setUploadProgress(null);

    try {
        const settingsDocRef = doc(db, 'settings', 'app-settings');
        
        const dataToSave: any = {
            whatsappNumber: values.whatsappNumber,
            callSupportNumber: values.callSupportNumber,
            telegramLink: values.telegramLink,
            paymentDetails: {
                'UPI': { title: "UPI Payment", details: values.upiId },
                'Bank Transfer': { title: "Bank Transfer", details: values.bankDetails },
                'Paytm/PhonePe': { title: "Paytm/PhonePe", details: values.paytmNumber },
            },
            welcomeBanner: existingWelcomeBannerUrl ? {
                imageUrl: existingWelcomeBannerUrl,
                storagePath: existingWelcomeBannerStoragePath,
            } : null,
        };

        if (existingQrUrl) {
            dataToSave.paymentDetails['Scan QR Code'] = {
                title: 'Scan QR Code',
                imageUrl: existingQrUrl,
                storagePath: existingQrStoragePath
            };
        }
        
        setUploadProgress(0);

        const qrFile = values.qrCodeImage?.[0];
        if (qrFile) {
            const { downloadURL, storagePath } = await uploadFile(qrFile, 'qrcodes', existingQrStoragePath);
            dataToSave.paymentDetails['Scan QR Code'] = {
                title: 'Scan QR Code',
                imageUrl: downloadURL,
                storagePath: storagePath,
            };
            setExistingQrUrl(downloadURL);
            setExistingQrStoragePath(storagePath);
        }

        const welcomeBannerFile = values.welcomeBannerImage?.[0];
        if (welcomeBannerFile) {
            const { downloadURL, storagePath } = await uploadFile(welcomeBannerFile, 'welcome-banners', existingWelcomeBannerStoragePath);
            dataToSave.welcomeBanner = {
                imageUrl: downloadURL,
                storagePath: storagePath,
            };
            setExistingWelcomeBannerUrl(downloadURL);
            setExistingWelcomeBannerStoragePath(storagePath);
        }
        
        await setDoc(settingsDocRef, dataToSave, { merge: true });

        toast({
            title: 'Success!',
            description: 'Settings have been saved.',
        });

        form.reset({ ...values, qrCodeImage: undefined, welcomeBannerImage: undefined });
        setUploadProgress(null);

    } catch (error: any) {
      console.error('Error updating settings: ', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to update settings. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 space-y-8 p-4 sm:p-8">
      <Card className="bg-card/80 border-white/10 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Application Settings</CardTitle>
          <CardDescription>Update application-wide settings here.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-48">
              <Loader className="h-8 w-8 text-primary" />
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                
                <h3 className="text-lg font-semibold">Support Details</h3>
                <FormField
                  control={form.control}
                  name="whatsappNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>WhatsApp Support Number</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 919876543210" {...field} className="bg-input h-12 rounded-lg" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="callSupportNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Call Support Number</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 919876543210" {...field} className="bg-input h-12 rounded-lg" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="telegramLink"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telegram Link</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., https://t.me/yourchannel" {...field} className="bg-input h-12 rounded-lg" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Separator />

                <h3 className="text-lg font-semibold">Welcome Banner</h3>
                {existingWelcomeBannerUrl && (
                  <div className="flex flex-col items-center">
                    <p className="text-sm text-muted-foreground mb-2">Current Welcome Banner:</p>
                    <Image src={existingWelcomeBannerUrl} alt="Current Welcome Banner" width={400} height={133} className="rounded-md border p-1" unoptimized />
                  </div>
                )}
                 <FormField
                  control={form.control}
                  name="welcomeBannerImage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{existingWelcomeBannerUrl ? 'Upload New Welcome Banner' : 'Upload Welcome Banner'}</FormLabel>
                      <FormControl>
                        <Input 
                            type="file" 
                            className="bg-input h-12 rounded-lg" 
                            accept={ACCEPTED_IMAGE_TYPES.join(',')} 
                            {...welcomeBannerImageRef}
                         />
                      </FormControl>
                       <FormDescriptionComponent>
                        Upload a banner image for the home page (recommended 1200x400).
                      </FormDescriptionComponent>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Separator />
                
                <h3 className="text-lg font-semibold">Payment Details</h3>
                 <FormField
                  control={form.control}
                  name="upiId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>UPI ID</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., yourname@upi" {...field} className="bg-input h-12 rounded-lg" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="bankDetails"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bank Account Details</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter full bank account details (Account Name, Number, IFSC, etc.)" {...field} className="bg-input rounded-lg" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="paytmNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Paytm/PhonePe Number</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 9876543210" {...field} className="bg-input h-12 rounded-lg" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator />
                <h3 className="text-lg font-semibold">Payment QR Code</h3>
                {existingQrUrl && (
                  <div className="flex flex-col items-center">
                    <p className="text-sm text-muted-foreground mb-2">Current QR Code:</p>
                    <Image src={existingQrUrl} alt="Current QR Code" width={150} height={150} className="rounded-md border p-1" unoptimized />
                  </div>
                )}
                 <FormField
                  control={form.control}
                  name="qrCodeImage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{existingQrUrl ? 'Upload New QR Code (optional)' : 'Upload QR Code'}</FormLabel>
                      <FormControl>
                        <Input 
                            type="file" 
                            className="bg-input h-12 rounded-lg" 
                            accept={ACCEPTED_IMAGE_TYPES.join(',')} 
                            {...qrCodeImageRef}
                         />
                      </FormControl>
                       <FormDescriptionComponent>
                        Upload a QR code image for users to scan.
                      </FormDescriptionComponent>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {isSubmitting && uploadProgress !== null && (
                    <div className="space-y-2">
                        <Progress value={uploadProgress} className="w-full" />
                        <p className="text-sm text-center text-muted-foreground">Uploading... {Math.round(uploadProgress)}%</p>
                    </div>
                )}

                <Button type="submit" className="w-full h-12 rounded-lg text-lg font-bold bg-primary text-primary-foreground hover:bg-primary/90" disabled={isSubmitting}>
                  {isSubmitting ? <Loader className="mr-2 h-5 w-5" /> : null}
                  Save Settings
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
