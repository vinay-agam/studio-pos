import { db } from "@/db/db";
import JSZip from "jszip";
import { saveAs } from "file-saver";

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
            // img.blob is the actual Blob
            imgFolder.file(img.id, img.blob);
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

export const restoreBackupZip = async (file: File) => {
    const zip = new JSZip();
    const loadedZip = await zip.loadAsync(file);

    // 1. Restore Data
    const dbFile = loadedZip.file("db.json");
    if (!dbFile) throw new Error("Invalid Backup: db.json missing");

    const dbText = await dbFile.async("string");
    const data = JSON.parse(dbText);

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

        // 2. Restore Images
        const imgFolder = loadedZip.folder("images");
        if (imgFolder) {
            // Convert to array of promises to handle async iteration correctly
            const files: { path: string, file: JSZip.JSZipObject }[] = [];
            imgFolder.forEach((relativePath, file) => {
                files.push({ path: relativePath, file });
            });

            for (const { path, file } of files) {
                if (!file.dir) {
                    const blob = await file.async("blob");
                    await db.images.add({
                        id: path,
                        blob: blob,
                        mimeType: blob.type
                    });
                }
            }
        }
    });

    window.location.reload();
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
