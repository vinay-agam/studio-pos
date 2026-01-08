import { db } from "@/db/db";
import imageCompression from 'browser-image-compression';

export const imageService = {
    /**
     * Compresses and saves an image to IndexedDB
     * @param file The file object from input
     * @returns The generated ID of the saved image
     */
    async saveImage(file: File): Promise<string> {
        const options = {
            maxSizeMB: 1,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
        };

        try {
            const compressedFile = await imageCompression(file, options);
            const id = crypto.randomUUID();

            await db.images.add({
                id,
                blob: compressedFile,
                mimeType: compressedFile.type
            });

            return id;
        } catch (error) {
            console.error("Error saving image:", error);
            throw error;
        }
    },

    /**
     * Retrieves an image blob and creates a specialized ObjectURL
     * Note: Caller is responsible for revoking the URL if needed, 
     * though modern browsers handle this reasonably well for small apps.
     */
    async getImageUrl(id: string): Promise<string | null> {
        const imageAsset = await db.images.get(id);
        if (!imageAsset) return null;
        return URL.createObjectURL(imageAsset.blob);
    }
};
