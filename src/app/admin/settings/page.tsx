
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { doc, getDoc, setDoc, DocumentData, updateDoc } from 'firebase/firestore';
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/svg+xml"];

const settingsSchema = z.object({
  goldenAnk: z.string().optional(),
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
      ".jpg, .jpeg, .png, .webp, and .svg files are accepted."
    ),
  phonepeImage: z.any()
    .optional()
    .refine((files) => !files || files.length === 0 || files?.[0]?.size <= MAX_FILE_SIZE, `Max file size is 5MB.`)
    .refine(
      (files) => !files || files.length === 0 || ACCEPTED_IMAGE_TYPES.includes(files?.[0]?.type),
      ".jpg, .jpeg, .png, and .webp files are accepted."
    ),
  welcomeBannerImage: z.any()
    .optional()
    .refine((files) => !files || files.length === 0 || files?.[0]?.size <= MAX_FILE_SIZE, `Max file size is 5MB.`)
    .refine(
      (files) => !files || files.length === 0 || ACCEPTED_IMAGE_TYPES.includes(files?.[0]?.type),
      ".jpg, .jpeg, .png and .webp files are accepted."
    ),
  downloadPageImage: z.any()
    .optional()
    .refine((files) => !files || files.length === 0 || files?.[0]?.size <= MAX_FILE_SIZE, `Max file size is 5MB.`)
    .refine(
      (files) => !files || files.length === 0 || ACCEPTED_IMAGE_TYPES.includes(files?.[0]?.type),
      ".jpg, .jpeg, .png and .webp files are accepted."
    ),
  marqueeTitle: z.string().optional(),
  marqueeText: z.string().optional(),
  marqueeBackgroundColor: z.string().optional(),
  marqueeTextColor: z.string().optional(),
  marqueeLogo: z.any()
    .optional()
    .refine((files) => !files || files.length === 0 || files?.[0]?.size <= MAX_FILE_SIZE, `Max file size is 5MB.`)
    .refine(
      (files) => !files || files.length === 0 || ACCEPTED_IMAGE_TYPES.includes(files?.[0]?.type),
      ".jpg, .jpeg, .png, .webp, and .svg files are accepted."
    ),
  marqueeLogoSize: z.preprocess(
    (val) => (String(val).trim() === '' ? undefined : Number(val)),
    z.number().min(10, 'Minimum size is 10px.').optional()
  ),
  marqueeTitleSize: z.preprocess(
    (val) => (String(val).trim() === '' ? undefined : Number(val)),
    z.number().min(10, 'Minimum size is 10px.').optional()
  ),
  marqueeTextSize: z.preprocess(
     (val) => (String(val).trim() === '' ? undefined : Number(val)),
    z.number().min(8, 'Minimum size is 8px.').optional()
  ),
  noticeText: z.string().optional(),
  bonusEnabled: z.boolean().default(false),
  bonusPercentage: z.preprocess(
    (val) => (String(val).trim() === '' ? 0 : Number(val)),
    z.number().min(0, 'Percentage cannot be negative.').max(100, 'Percentage cannot exceed 100.')
  ),
  bonusPopupEnabled: z.boolean().default(false),
  bonusPopupImage: z.any().optional(),
  bonusPopupLink: z.string().optional(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export default function SettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  
  const [existingQrUrl, setExistingQrUrl] = useState<string | null>(null);
  const [existingQrStoragePath, setExistingQrStoragePath] = useState<string | null>(null);
  const [existingPhonepeImageUrl, setExistingPhonepeImageUrl] = useState<string | null>(null);
  const [existingPhonepeImageStoragePath, setExistingPhonepeImageStoragePath] = useState<string | null>(null);
  const [existingWelcomeBannerUrl, setExistingWelcomeBannerUrl] = useState<string | null>(null);
  const [existingWelcomeBannerStoragePath, setExistingWelcomeBannerStoragePath] = useState<string | null>(null);
  const [existingDownloadImageUrl, setExistingDownloadImageUrl] = useState<string | null>(null);
  const [existingDownloadImageStoragePath, setExistingDownloadImageStoragePath] = useState<string | null>(null);
  const [existingMarqueeLogoUrl, setExistingMarqueeLogoUrl] = useState<string | null>(null);
  const [existingMarqueeLogoStoragePath, setExistingMarqueeLogoStoragePath] = useState<string | null>(null);
  const [existingBonusPopupUrl, setExistingBonusPopupUrl] = useState<string | null>(null);
  const [existingBonusPopupStoragePath, setExistingBonusPopupStoragePath] = useState<string | null>(null);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      goldenAnk: '',
      whatsappNumber: '',
      callSupportNumber: '',
      telegramLink: '',
      upiId: '',
      bankDetails: '',
      paytmNumber: '',
      marqueeTitle: 'MATKA KING',
      marqueeText: '',
      marqueeBackgroundColor: '#b91c1c', // default red-700
      marqueeTextColor: '#ffffff', // default white
      marqueeLogoSize: 24,
      marqueeTitleSize: 20,
      marqueeTextSize: 12,
      noticeText: '',
      bonusEnabled: false,
      bonusPercentage: 0,
      bonusPopupEnabled: false,
      bonusPopupLink: '/add-fund',
    },
  });

  const qrCodeImageRef = form.register("qrCodeImage");
  const phonepeImageRef = form.register("phonepeImage");
  const welcomeBannerImageRef = form.register("welcomeBannerImage");
  const downloadPageImageRef = form.register("downloadPageImage");
  const marqueeLogoRef = form.register("marqueeLogo");
  const bonusPopupImageRef = form.register("bonusPopupImage");

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const settingsDocRef = doc(db, 'settings', 'app-settings');
        const docSnap = await getDoc(settingsDocRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as DocumentData;
          form.reset({
            goldenAnk: data.goldenAnk || '',
            whatsappNumber: data.whatsappNumber || '',
            callSupportNumber: data.callSupportNumber || '',
            telegramLink: data.telegramLink || '',
            upiId: data.paymentDetails?.UPI?.details || '',
            bankDetails: data.paymentDetails?.['Bank Transfer']?.details || '',
            paytmNumber: data.paymentDetails?.['Paytm/PhonePe']?.details || '',
            marqueeTitle: data.marquee?.title || 'MATKA KING',
            marqueeText: data.marquee?.text || '',
            marqueeBackgroundColor: data.marquee?.backgroundColor || '#b91c1c',
            marqueeTextColor: data.marquee?.textColor || '#ffffff',
            marqueeLogoSize: data.marquee?.logoSize || 24,
            marqueeTitleSize: data.marquee?.titleSize || 20,
            marqueeTextSize: data.marquee?.textSize || 12,
            noticeText: data.noticeText || '',
            bonusEnabled: data.bonus?.enabled || false,
            bonusPercentage: data.bonus?.percentage || 0,
            bonusPopupEnabled: data.bonusPopup?.enabled || false,
            bonusPopupLink: data.bonusPopup?.link || '/add-fund',
          });
          if (data.paymentDetails?.['Scan QR Code']) {
            setExistingQrUrl(data.paymentDetails['Scan QR Code'].imageUrl);
            setExistingQrStoragePath(data.paymentDetails['Scan QR Code'].storagePath);
          }
          if (data.paymentDetails?.PhonePe) {
            setExistingPhonepeImageUrl(data.paymentDetails.PhonePe.imageUrl);
            setExistingPhonepeImageStoragePath(data.paymentDetails.PhonePe.storagePath);
          }
          if (data.welcomeBanner) {
            setExistingWelcomeBannerUrl(data.welcomeBanner.imageUrl);
            setExistingWelcomeBannerStoragePath(data.welcomeBanner.storagePath);
          }
          if (data.downloadPageImage) {
            setExistingDownloadImageUrl(data.downloadPageImage.imageUrl);
            setExistingDownloadImageStoragePath(data.downloadPageImage.storagePath);
          }
          if (data.marquee?.logo) {
            setExistingMarqueeLogoUrl(data.marquee.logo.imageUrl);
            setExistingMarqueeLogoStoragePath(data.marquee.logo.storagePath);
          }
           if (data.bonusPopup) {
            setExistingBonusPopupUrl(data.bonusPopup.imageUrl);
            setExistingBonusPopupStoragePath(data.bonusPopup.storagePath);
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
        try {
            const oldStorageRef = ref(storage, oldStoragePath);
            await deleteObject(oldStorageRef);
        } catch (e: any) {
             if (e.code !== 'storage/object-not-found') {
                console.warn("Could not delete old file:", e);
             }
        }
    }
    const storagePath = `${path}/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, storagePath);
    const metadata = {
        contentType: file.type
    };
    const uploadTask = uploadBytesResumable(storageRef, file, metadata);

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
    setUploadProgress(0);

    try {
        const settingsDocRef = doc(db, 'settings', 'app-settings');
        
        let qrCodeData = existingQrUrl ? {
            title: 'Scan QR Code',
            imageUrl: existingQrUrl,
            storagePath: existingQrStoragePath
        } : undefined;

        let phonepeData = existingPhonepeImageUrl ? {
            title: 'PhonePe',
            imageUrl: existingPhonepeImageUrl,
            storagePath: existingPhonepeImageStoragePath
        } : { title: 'PhonePe' };

        let welcomeBannerData = existingWelcomeBannerUrl ? {
            imageUrl: existingWelcomeBannerUrl,
            storagePath: existingWelcomeBannerStoragePath,
        } : null;
        
        let downloadPageImageData = existingDownloadImageUrl ? {
            imageUrl: existingDownloadImageUrl,
            storagePath: existingDownloadImageStoragePath,
        } : null;

        let marqueeLogoData = existingMarqueeLogoUrl ? {
            imageUrl: existingMarqueeLogoUrl,
            storagePath: existingMarqueeLogoStoragePath,
        } : null;
        
        let bonusPopupData = (existingBonusPopupUrl || values.bonusPopupEnabled) ? {
            enabled: values.bonusPopupEnabled,
            imageUrl: existingBonusPopupUrl,
            storagePath: existingBonusPopupStoragePath,
            link: values.bonusPopupLink,
        } : null;
        
        const qrFile = values.qrCodeImage?.[0];
        if (qrFile) {
            const { downloadURL, storagePath } = await uploadFile(qrFile, 'qrcodes', existingQrStoragePath);
            qrCodeData = {
                title: 'Scan QR Code',
                imageUrl: downloadURL,
                storagePath: storagePath,
            };
            setExistingQrUrl(downloadURL);
            setExistingQrStoragePath(storagePath);
        }
        
        const phonepeFile = values.phonepeImage?.[0];
        if (phonepeFile) {
            const { downloadURL, storagePath } = await uploadFile(phonepeFile, 'payment-logos', existingPhonepeImageStoragePath);
            phonepeData = {
                ...phonepeData,
                imageUrl: downloadURL,
                storagePath: storagePath,
            };
            setExistingPhonepeImageUrl(downloadURL);
            setExistingPhonepeImageStoragePath(storagePath);
        }

        const welcomeBannerFile = values.welcomeBannerImage?.[0];
        if (welcomeBannerFile) {
            const { downloadURL, storagePath } = await uploadFile(welcomeBannerFile, 'welcome-banners', existingWelcomeBannerStoragePath);
            welcomeBannerData = {
                imageUrl: downloadURL,
                storagePath: storagePath,
            };
            setExistingWelcomeBannerUrl(downloadURL);
            setExistingWelcomeBannerStoragePath(storagePath);
        }

        const downloadPageImageFile = values.downloadPageImage?.[0];
        if (downloadPageImageFile) {
            const { downloadURL, storagePath } = await uploadFile(downloadPageImageFile, 'download-page', existingDownloadImageStoragePath);
            downloadPageImageData = {
                imageUrl: downloadURL,
                storagePath: storagePath,
            };
            setExistingDownloadImageUrl(downloadURL);
            setExistingDownloadImageStoragePath(storagePath);
        }

        const marqueeLogoFile = values.marqueeLogo?.[0];
        if (marqueeLogoFile) {
            const { downloadURL, storagePath } = await uploadFile(marqueeLogoFile, 'marquee-logos', existingMarqueeLogoStoragePath);
            marqueeLogoData = {
                imageUrl: downloadURL,
                storagePath: storagePath,
            };
            setExistingMarqueeLogoUrl(downloadURL);
            setExistingMarqueeLogoStoragePath(storagePath);
        }

        const bonusPopupFile = values.bonusPopupImage?.[0];
        if (bonusPopupFile) {
             const { downloadURL, storagePath } = await uploadFile(bonusPopupFile, 'bonus-popups', existingBonusPopupStoragePath);
             if (bonusPopupData) {
                bonusPopupData.imageUrl = downloadURL;
                bonusPopupData.storagePath = storagePath;
             }
            setExistingBonusPopupUrl(downloadURL);
            setExistingBonusPopupStoragePath(storagePath);
        }

        const settingsDoc = await getDoc(settingsDocRef);
        const currentData = settingsDoc.exists() ? settingsDoc.data() : {};
        const currentPaymentDetails = currentData.paymentDetails || {};
        
        const dataToSave: any = {
            goldenAnk: values.goldenAnk,
            whatsappNumber: values.whatsappNumber,
            callSupportNumber: values.callSupportNumber,
            telegramLink: values.telegramLink,
            paymentDetails: {
                ...currentPaymentDetails,
                'UPI': { title: "UPI Payment", details: values.upiId },
                'Bank Transfer': { title: "Bank Transfer", details: values.bankDetails },
                'Paytm/PhonePe': { title: "Paytm/PhonePe", details: values.paytmNumber },
                'PhonePe': phonepeData,
            },
            welcomeBanner: welcomeBannerData,
            downloadPageImage: downloadPageImageData,
            marquee: {
              title: values.marqueeTitle,
              text: values.marqueeText,
              backgroundColor: values.marqueeBackgroundColor,
              textColor: values.marqueeTextColor,
              logo: marqueeLogoData,
              logoSize: values.marqueeLogoSize,
              titleSize: values.marqueeTitleSize,
              textSize: values.marqueeTextSize,
            },
            noticeText: values.noticeText,
            bonus: {
              enabled: values.bonusEnabled,
              percentage: values.bonusPercentage,
            },
            bonusPopup: bonusPopupData,
        };

        if (qrCodeData) {
            dataToSave.paymentDetails['Scan QR Code'] = qrCodeData;
        } else {
            // Check if 'Scan QR Code' exists and if there is no new file, to prevent deleting it.
            if (!qrFile && dataToSave.paymentDetails['Scan QR Code']) {
                // Keep the existing one
            } else if (!qrFile) {
                delete dataToSave.paymentDetails['Scan QR Code'];
            }
        }
        
        await setDoc(settingsDocRef, dataToSave, { merge: true });

        toast({
            title: 'Success!',
            description: 'Settings have been saved.',
        });

        form.reset({ ...values, qrCodeImage: undefined, welcomeBannerImage: undefined, downloadPageImage: undefined, marqueeLogo: undefined, bonusPopupImage: undefined, phonepeImage: undefined });
        
    } catch (error: any) {
      console.error('Error updating settings: ', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to update settings. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };
  
  const handleDeleteWelcomeBanner = async () => {
    if (!existingWelcomeBannerStoragePath) return;

    try {
      // Delete from Storage
      const storageRef = ref(storage, existingWelcomeBannerStoragePath);
      await deleteObject(storageRef);

      // Delete from Firestore
      const settingsDocRef = doc(db, 'settings', 'app-settings');
      await updateDoc(settingsDocRef, {
        welcomeBanner: null
      });

      // Update local state
      setExistingWelcomeBannerUrl(null);
      setExistingWelcomeBannerStoragePath(null);

      toast({
        title: 'Success!',
        description: 'Welcome banner has been deleted.',
      });
    } catch (error) {
      console.error("Error deleting welcome banner: ", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete the welcome banner.',
      });
    }
  };
  
  const handleDeleteDownloadImage = async () => {
    if (!existingDownloadImageStoragePath) return;

    try {
      const storageRef = ref(storage, existingDownloadImageStoragePath);
      await deleteObject(storageRef);

      const settingsDocRef = doc(db, 'settings', 'app-settings');
      await updateDoc(settingsDocRef, {
        downloadPageImage: null
      });

      setExistingDownloadImageUrl(null);
      setExistingDownloadImageStoragePath(null);

      toast({
        title: 'Success!',
        description: 'Download page image has been deleted.',
      });
    } catch (error) {
      console.error("Error deleting download page image: ", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete the image.',
      });
    }
  };

  const handleDeleteMarqueeLogo = async () => {
    if (!existingMarqueeLogoStoragePath) return;
    try {
      const storageRef = ref(storage, existingMarqueeLogoStoragePath);
      await deleteObject(storageRef);
      const settingsDocRef = doc(db, 'settings', 'app-settings');
      await updateDoc(settingsDocRef, { 'marquee.logo': null });
      setExistingMarqueeLogoUrl(null);
      setExistingMarqueeLogoStoragePath(null);
      toast({ title: 'Success!', description: 'Marquee logo deleted.' });
    } catch (error) {
       console.error("Error deleting marquee logo: ", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete marquee logo.' });
    }
  };

  const handleDeleteQrCode = async () => {
    if (!existingQrStoragePath) return;
    
    setIsSubmitting(true);
    try {
      // Delete from Storage
      const storageRef = ref(storage, existingQrStoragePath);
      await deleteObject(storageRef);
      
      // Delete from Firestore
      const settingsDocRef = doc(db, 'settings', 'app-settings');
      const settingsDoc = await getDoc(settingsDocRef);
      if(settingsDoc.exists()) {
        const currentPaymentDetails = settingsDoc.data().paymentDetails || {};
        delete currentPaymentDetails['Scan QR Code'];
        await updateDoc(settingsDocRef, {
            paymentDetails: currentPaymentDetails
        });
      }

      // Update local state
      setExistingQrUrl(null);
      setExistingQrStoragePath(null);

      toast({
        title: 'Success!',
        description: 'QR Code has been deleted.',
      });
    } catch (error) {
      console.error("Error deleting QR Code: ", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete the QR Code.',
      });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDeletePhonepeImage = async () => {
    if (!existingPhonepeImageStoragePath) return;
    setIsSubmitting(true);
    try {
      const storageRef = ref(storage, existingPhonepeImageStoragePath);
      await deleteObject(storageRef);
      
      const settingsDocRef = doc(db, 'settings', 'app-settings');
      await updateDoc(settingsDocRef, { 
          'paymentDetails.PhonePe.imageUrl': null,
          'paymentDetails.PhonePe.storagePath': null,
       });

      setExistingPhonepeImageUrl(null);
      setExistingPhonepeImageStoragePath(null);

      toast({ title: 'Success!', description: 'PhonePe image deleted.' });
    } catch (error) {
       console.error("Error deleting PhonePe image: ", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete PhonePe image.' });
    } finally {
        setIsSubmitting(false);
    }
  };


  const handleDeleteBonusPopupImage = async () => {
    if (!existingBonusPopupStoragePath) return;
    try {
      const storageRef = ref(storage, existingBonusPopupStoragePath);
      await deleteObject(storageRef);
      const settingsDocRef = doc(db, 'settings', 'app-settings');
      await updateDoc(settingsDocRef, { 
          'bonusPopup.imageUrl': null,
          'bonusPopup.storagePath': null,
       });
      setExistingBonusPopupUrl(null);
      setExistingBonusPopupStoragePath(null);
      toast({ title: 'Success!', description: 'Bonus popup image deleted.' });
    } catch (error) {
       console.error("Error deleting bonus popup image: ", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete bonus popup image.' });
    }
  };


  return (
    <div className="flex-1 space-y-6">
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
                 
                 <h3 className="text-lg font-semibold">Golden Ank Settings</h3>
                <div className="space-y-4 rounded-md border p-4">
                  <FormField
                    control={form.control}
                    name="goldenAnk"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Golden Ank Numbers</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 4-9-2-7" {...field} className="bg-input h-12 rounded-lg" />
                        </FormControl>
                        <FormDescriptionComponent>
                          Enter the lucky numbers separated by dashes.
                        </FormDescriptionComponent>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                 <h3 className="text-lg font-semibold">Bonus Popup Settings</h3>
                <div className="space-y-4 rounded-md border p-4">
                  <FormField
                    control={form.control}
                    name="bonusPopupEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between">
                        <div className="space-y-0.5">
                          <FormLabel>Enable Bonus Popup</FormLabel>
                           <FormDescriptionComponent>
                            Show a bonus offer popup when users open the app.
                          </FormDescriptionComponent>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  {form.watch('bonusPopupEnabled') && (
                    <div className="space-y-4">
                      {existingBonusPopupUrl && (
                        <div className="flex flex-col items-center gap-4">
                            <p className="text-sm text-muted-foreground">Current Popup Image:</p>
                            <Image src={existingBonusPopupUrl} alt="Bonus Popup" width={200} height={200} className="rounded-md border p-1" unoptimized />
                            <AlertDialog>
                              <AlertDialogTrigger asChild><Button variant="destructive" size="sm"><Trash2 className="mr-2 h-4 w-4" />Delete Image</Button></AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the popup image.</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteBonusPopupImage}>Delete</AlertDialogAction></AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                        </div>
                      )}
                       <FormField
                        control={form.control}
                        name="bonusPopupImage"
                        render={() => (
                          <FormItem>
                            <FormLabel>{existingBonusPopupUrl ? 'Upload New Image' : 'Upload Image'}</FormLabel>
                            <FormControl><Input type="file" className="bg-input h-12 rounded-lg" accept={ACCEPTED_IMAGE_TYPES.join(',')} {...bonusPopupImageRef} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                       <FormField
                        control={form.control}
                        name="bonusPopupLink"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Popup Button Link</FormLabel>
                            <FormControl><Input placeholder="/add-fund" {...field} className="bg-input h-12 rounded-lg" /></FormControl>
                            <FormDescriptionComponent>Where users go when they click "Claim Bonus".</FormDescriptionComponent>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </div>

                <Separator />
                
                 <h3 className="text-lg font-semibold">Bonus Settings</h3>
                <div className="space-y-4 rounded-md border p-4">
                  <FormField
                    control={form.control}
                    name="bonusEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between">
                        <div className="space-y-0.5">
                          <FormLabel>Enable Deposit Bonus</FormLabel>
                          <FormDescriptionComponent>
                            Turn this on to give users a bonus on approved deposits.
                          </FormDescriptionComponent>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  {form.watch('bonusEnabled') && (
                    <FormField
                      control={form.control}
                      name="bonusPercentage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bonus Percentage (%)</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="e.g., 10" {...field} className="bg-input h-12 rounded-lg" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                <Separator />
                
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
                
                <h3 className="text-lg font-semibold">Marquee / Ticker Settings</h3>
                {existingMarqueeLogoUrl && (
                  <div className="flex flex-col items-center gap-4">
                    <p className="text-sm text-muted-foreground mb-2">Current Marquee Logo:</p>
                    <Image src={existingMarqueeLogoUrl} alt="Current Marquee Logo" width={48} height={48} className="rounded-md border p-1 bg-white" unoptimized />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm"><Trash2 className="mr-2 h-4 w-4" />Delete Logo</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>This will permanently delete the marquee logo.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDeleteMarqueeLogo}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
                 <FormField
                  control={form.control}
                  name="marqueeLogo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{existingMarqueeLogoUrl ? 'Upload New Logo' : 'Upload Logo'}</FormLabel>
                      <FormControl>
                        <Input type="file" className="bg-input h-12 rounded-lg" accept={ACCEPTED_IMAGE_TYPES.join(',')} {...marqueeLogoRef} />
                      </FormControl>
                      <FormDescriptionComponent>Upload a logo for the marquee (optional).</FormDescriptionComponent>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="marqueeTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Marquee Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., MATKA KING" {...field} className="bg-input h-12 rounded-lg" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="marqueeText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Marquee Text (Sub-line)</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter the text to display in the marquee" {...field} className="bg-input h-12 rounded-lg" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <FormField
                      control={form.control}
                      name="marqueeBackgroundColor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Background Color</FormLabel>
                          <FormControl>
                            <Input type="color" {...field} className="bg-input h-12 rounded-lg" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="marqueeTextColor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Text Color</FormLabel>
                          <FormControl>
                            <Input type="color" {...field} className="bg-input h-12 rounded-lg" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                </div>
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="marqueeLogoSize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Logo Size (px)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} onChange={e => field.onChange(e.target.value)} value={field.value || ''} className="bg-input h-12 rounded-lg" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="marqueeTitleSize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title Font Size (px)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} onChange={e => field.onChange(e.target.value)} value={field.value || ''} className="bg-input h-12 rounded-lg" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="marqueeTextSize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sub-line Font Size (px)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} onChange={e => field.onChange(e.target.value)} value={field.value || ''} className="bg-input h-12 rounded-lg" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                 </div>

                <Separator />

                <h3 className="text-lg font-semibold">Notice Board</h3>
                 <FormField
                  control={form.control}
                  name="noticeText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notice Text</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter the notice text to display on the home page."
                          {...field}
                          className="bg-input rounded-lg min-h-[100px]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator />

                <h3 className="text-lg font-semibold">Welcome Banner</h3>
                {existingWelcomeBannerUrl && (
                  <div className="flex flex-col items-center gap-4">
                    <p className="text-sm text-muted-foreground mb-2">Current Welcome Banner:</p>
                    <Image src={existingWelcomeBannerUrl} alt="Current Welcome Banner" width={400} height={133} className="rounded-md border p-1" unoptimized />
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <Button variant="destructive" size="sm">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Banner
                           </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the welcome banner.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteWelcomeBanner}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
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
                
                <h3 className="text-lg font-semibold">Download Page Image</h3>
                {existingDownloadImageUrl && (
                  <div className="flex flex-col items-center gap-4">
                    <p className="text-sm text-muted-foreground mb-2">Current Image:</p>
                    <Image src={existingDownloadImageUrl} alt="Current Download Page Image" width={200} height={266} className="rounded-md border p-1" unoptimized />
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <Button variant="destructive" size="sm">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Image
                           </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will permanently delete the image. The page will show a placeholder.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteDownloadImage}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
                 <FormField
                  control={form.control}
                  name="downloadPageImage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{existingDownloadImageUrl ? 'Upload New Image' : 'Upload Image'}</FormLabel>
                      <FormControl>
                        <Input 
                            type="file" 
                            className="bg-input h-12 rounded-lg" 
                            accept={ACCEPTED_IMAGE_TYPES.join(',')} 
                            {...downloadPageImageRef}
                         />
                      </FormControl>
                       <FormDescriptionComponent>
                        Upload an image for the download page (recommended 600x800).
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
                      <FormLabel>Paytm Number</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 9876543210" {...field} className="bg-input h-12 rounded-lg" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {existingPhonepeImageUrl && (
                  <div className="flex flex-col items-center gap-4">
                    <p className="text-sm text-muted-foreground mb-2">Current PhonePe Image:</p>
                    <Image src={existingPhonepeImageUrl} alt="Current PhonePe Image" width={100} height={100} className="rounded-md border p-1" unoptimized />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm"><Trash2 className="mr-2 h-4 w-4" />Delete PhonePe Image</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the PhonePe image.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeletePhonepeImage}>Delete</AlertDialogAction></AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
                 <FormField
                  control={form.control}
                  name="phonepeImage"
                  render={() => (
                    <FormItem>
                      <FormLabel>{existingPhonepeImageUrl ? 'Upload New PhonePe Image' : 'Upload PhonePe Image'}</FormLabel>
                      <FormControl>
                        <Input type="file" className="bg-input h-12 rounded-lg" accept={ACCEPTED_IMAGE_TYPES.join(',')} {...phonepeImageRef} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator />
                <h3 className="text-lg font-semibold">Payment QR Code</h3>
                {existingQrUrl && (
                  <div className="flex flex-col items-center gap-4">
                    <p className="text-sm text-muted-foreground mb-2">Current QR Code:</p>
                    <Image src={existingQrUrl} alt="Current QR Code" width={150} height={150} className="rounded-md border p-1" unoptimized />
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <Button variant="destructive" size="sm">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete QR Code
                           </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the QR Code.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteQrCode}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
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
