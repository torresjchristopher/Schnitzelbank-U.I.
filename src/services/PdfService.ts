import { jsPDF } from 'jspdf';
import { ref, getDownloadURL, uploadBytes } from 'firebase/storage';
import { collection, addDoc } from 'firebase/firestore';
import { storage, db } from '../firebase';
import type { Person } from '../types';

export interface PdfItem {
    id: string;
    url: string;
    name: string;
    rotation: number;
}

export class PdfService {
    static async generateArchiveBundle(
        items: PdfItem[], 
        title: string, 
        currentUser: Person, 
        protocolKey: string
    ): Promise<string> {
        if (items.length === 0) throw new Error("No items selected for PDF");

        const doc = new jsPDF();
        
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            
            const resolveImageUrl = async (url: string) => {
                if (url.includes('storage.googleapis.com')) {
                    const match = url.match(/artifacts\/.+/);
                    if (match) {
                        return await getDownloadURL(ref(storage, match[0]));
                    }
                }
                return url;
            };

            const finalUrl = await resolveImageUrl(item.url);

            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.src = finalUrl;
            
            await new Promise((resolve) => {
                img.onload = resolve;
                img.onerror = () => {
                    console.error("Failed to load image for PDF", finalUrl);
                    resolve(null);
                };
            });

            if (i > 0) doc.addPage();

            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            
            let imgWidth = img.width;
            let imgHeight = img.height;
            const ratio = imgWidth / imgHeight;
            
            // Seamless Experience: No Borders
            const maxWidth = pageWidth;
            const maxHeight = pageHeight;

            if (imgWidth > maxWidth) {
                imgWidth = maxWidth;
                imgHeight = imgWidth / ratio;
            }
            if (imgHeight > maxHeight) {
                imgHeight = maxHeight;
                imgWidth = imgHeight * ratio;
            }

            const x = (pageWidth - imgWidth) / 2;
            const y = (pageHeight - imgHeight) / 2;

            doc.addImage(img, 'JPEG', x, y, imgWidth, imgHeight, undefined, 'FAST', item.rotation);
        }

        const pdfBlob = doc.output('blob');
        const fileName = `${title || 'archival_bundle'}.pdf`;
        
        const path = `artifacts/${currentUser.id}/${fileName}`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, pdfBlob);
        const downloadUrl = await getDownloadURL(storageRef);

        const memoryRef = collection(db, 'trees', protocolKey, 'people', currentUser.id, 'memories');
        await addDoc(memoryRef, {
            name: fileName,
            url: downloadUrl,
            photoUrl: downloadUrl,
            type: 'pdf',
            uploadedAt: new Date().toISOString(),
            date: new Date().toISOString(),
            description: `Bundle of ${items.length} images.`,
            tags: { personIds: [currentUser.id], isFamilyMemory: false }
        });

        return downloadUrl;
    }
}
