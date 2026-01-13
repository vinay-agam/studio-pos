import { db } from "@/db/db";
import JSZip from "jszip";
import { saveAs } from "file-saver";

// Helper to determine extension
const getExtensionFromMime = (mime: string) => {
    switch (mime) {
        case 'image/jpeg': return '.jpg';
        case 'image/png': return '.png';
        case 'image/webp': return '.webp';
        case 'image/gif': return '.gif';
        default: return '';
    }
};

export const createBackupZip = async () => {
    const zip = new JSZip();

    // 1. Fetch Data
    const products = await db.products.toArray();
    const customers = await db.customers.toArray();
    const orders = await db.orders.toArray();
    const settings = await db.settings.toArray();
    const users = await db.users.toArray();
    const images = await db.images.toArray();

    // 2. Create DB JSON
    const dbData = {
        version: 1,
        timestamp: new Date().toISOString(),
        products,
        customers,
        orders,
        settings,
        users
    };
    zip.file("db.json", JSON.stringify(dbData, null, 2));

    // 3. Add Images folder
    const imgFolder = zip.folder("images");
    if (imgFolder) {
        images.forEach(img => {
            const ext = getExtensionFromMime(img.mimeType);
            // img.blob is the actual Blob
            imgFolder.file(`${img.id}${ext}`, img.blob);
        });
    }

    // 4. Create Manifest
    const manifest = {
        schema_version: "1.0",
        exported_at: new Date().toISOString(),
        counts: {
            products: products.length,
            orders: orders.length,
            images: images.length
        }
    };
    zip.file("manifest.json", JSON.stringify(manifest, null, 2));

    // 5. Generate and Save
    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `studio-pos-backup-${new Date().toISOString().split("T")[0]}.zip`);

    // Record last backup time
    localStorage.setItem("last_backup_timestamp", new Date().toISOString());
};

export const restoreBackupZip = async (file: File, onProgress?: (status: string) => void) => {
    onProgress?.("Reading backup file...");
    const zip = new JSZip();
    const loadedZip = await zip.loadAsync(file);

    // 1. Prepare Data (Outside Transaction)
    onProgress?.("Validating backup...");
    const dbFile = loadedZip.file("db.json");
    if (!dbFile) throw new Error("Invalid Backup: db.json missing");

    onProgress?.("Parsing database data...");
    const dbText = await dbFile.async("string");
    const data = JSON.parse(dbText);

    // Pre-process images to avoid async operations inside transaction
    const imgFolder = loadedZip.folder("images");
    const imagesToRestore: { id: string; blob: Blob; mimeType: string }[] = [];

    if (imgFolder) {
        onProgress?.("Analyzing images...");
        const files: { path: string, file: JSZip.JSZipObject }[] = [];
        imgFolder.forEach((relativePath, file) => {
            files.push({ path: relativePath, file });
        });

        const totalImages = files.filter(f => !f.file.dir).length;
        let processedImages = 0;

        for (const { path, file } of files) {
            if (!file.dir) {
                const blob = await file.async("blob");
                // Remove extension to get original ID if present
                // e.g., "uuid-123.jpg" -> "uuid-123"
                // If it was saved without extension (old backup), it just stays "uuid-123"
                const id = path.includes('.') ? path.substring(0, path.lastIndexOf('.')) : path;

                imagesToRestore.push({
                    id: id,
                    blob: blob,
                    mimeType: blob.type
                });
                processedImages++;
                if (processedImages % 10 === 0 || processedImages === totalImages) {
                    onProgress?.(`Processing images (${processedImages}/${totalImages})...`);
                }
            }
        }
    }

    // 2. Execute Transaction (Fast & Synchronous-like)
    onProgress?.("Restoring database tables...");
    await db.transaction("rw", [db.products, db.customers, db.orders, db.settings, db.users, db.images], async () => {
        // Clear existing
        await db.products.clear();
        await db.customers.clear();
        await db.orders.clear();
        await db.settings.clear();
        await db.images.clear();
        await db.users.clear();

        // Restore Tables
        if (data.products) await db.products.bulkAdd(data.products);
        if (data.customers) await db.customers.bulkAdd(data.customers);
        if (data.orders) await db.orders.bulkAdd(data.orders);
        if (data.settings) await db.settings.bulkAdd(data.settings);
        if (data.users) await db.users.bulkAdd(data.users);

        // Restore Images
        if (imagesToRestore.length > 0) {
            onProgress?.(`Restoring ${imagesToRestore.length} images to database...`);
            await db.images.bulkAdd(imagesToRestore);
        }
    });

    onProgress?.("Restore complete!");
    // Note: Caller is responsible for reload
};

export const checkAndRunAutoBackup = () => {
    const lastBackup = localStorage.getItem("last_backup_timestamp");
    const now = new Date();

    // Check if backup is needed (e.g., > 24 hours)
    let shouldBackup = false;
    if (!lastBackup) {
        shouldBackup = true;
    } else {
        const last = new Date(lastBackup);
        const diffMs = now.getTime() - last.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        if (diffHours > 24) shouldBackup = true;
    }

    if (shouldBackup) {
        return true;
    }
    return false;
};
