import { useState, useEffect } from "react";
import { useAlert } from "@/context/AlertContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { createBackupZip, restoreBackupZip, checkAndRunAutoBackup } from "@/services/backupService";
import { exportToCSV } from "@/services/csvService";
import { db } from "@/db/db";
import { Loader2, Download, AlertTriangle, FileSpreadsheet, ImagePlus, X } from "lucide-react";
import { imageService } from "@/services/imageService";

export default function SettingsPage() {
    const [isRestoring, setIsRestoring] = useState(false);
    const [backupNeeded, setBackupNeeded] = useState(false);
    const { alert, confirm } = useAlert();
    const [settings, setSettings] = useState<any>({});
    const [isSaving, setIsSaving] = useState(false);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);

    useEffect(() => {
        if (checkAndRunAutoBackup()) {
            setBackupNeeded(true);
        }
        // Load Settings
        db.settings.get('general').then(async data => {
            if (data) {
                setSettings(data);
                if (data.logoId) {
                    const url = await imageService.getImageUrl(data.logoId);
                    if (url) {
                        setLogoPreview(url);
                    }
                }
            }
        });
    }, []);

    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await db.settings.put({ ...settings, id: 'general' });
            await alert("Settings saved successfully! The page will reload to apply changes.", "Success");
            window.location.reload();
        } catch (err) {
            console.error(err);
            await alert("Failed to save settings", "Error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleBackup = async () => {
        try {
            await createBackupZip();
            setBackupNeeded(false);
        } catch (error) {
            console.error("Backup failed", error);
            await alert("Backup failed. See console for details.", "Error");
        }
    };

    const handleRestore = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!await confirm("WARNING: This will replace ALL current data with the backup. This action cannot be undone. Are you sure?", "Restore Database", "destructive")) {
            event.target.value = ""; // Reset input
            return;
        }

        setIsRestoring(true);
        try {
            await restoreBackupZip(file);
        } catch (error) {
            console.error("Restore failed", error);
            await alert("Restore failed. Ensure you uploaded a valid backup ZIP file.", "Error");
            setIsRestoring(false);
        }
    };

    const handleExportCSV = async (type: string) => {
        let data: any[] = [];
        let filename = `${type}-export-${new Date().toISOString().split('T')[0]}.csv`;

        if (type === 'products') data = await db.products.toArray();
        if (type === 'customers') data = await db.customers.toArray();
        if (type === 'orders') data = await db.orders.toArray();

        // Report Filtering
        // Report Filtering
        if (type.includes('_orders')) {
            const allOrders = await db.orders.toArray();
            const now = new Date();

            data = allOrders.filter(order => {
                const orderDate = new Date(order.createdAt);
                if (type === 'daily_orders') {
                    return orderDate.getDate() === now.getDate() &&
                        orderDate.getMonth() === now.getMonth() &&
                        orderDate.getFullYear() === now.getFullYear();
                }
                if (type === 'monthly_orders') {
                    return orderDate.getMonth() === now.getMonth() &&
                        orderDate.getFullYear() === now.getFullYear();
                }
                if (type === 'yearly_orders') {
                    return orderDate.getFullYear() === now.getFullYear();
                }
                return true;
            });
        }



        // Format Products (Flatten variants)
        if (type === 'products') {
            data = data.map(product => ({
                ...product,
                variants: product.variants
                    ? product.variants.map((v: any) => `${v.title} (Price: ${v.price}, Stock: ${v.inventory})`).join(' | ')
                    : ''
            }));
        }

        // Format data for readability (Flatten objects)
        if (type.includes('orders')) {
            data = data.map(order => ({
                ...order,
                // Format Items: "2x ItemName (Variant) | 1x ItemB"
                items: order.items.map((i: any) =>
                    `${i.qty}x ${i.title}${i.variantName ? ` (${i.variantName})` : ''}`
                ).join(' | '),
                // Format Date
                createdAt: new Date(order.createdAt).toLocaleString(),
                // Ensure CustomerID is readable or empty
                customerId: order.customerId || ''
            }));
        }

        exportToCSV(data, filename);
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Settings</h1>

            {backupNeeded && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Backup Required</AlertTitle>
                    <AlertDescription>
                        It has been over 24 hours since your last backup. Please download a backup now to ensure data safety.
                    </AlertDescription>
                </Alert>
            )}

            {/* Shop Details */}
            <Card>
                <CardHeader>
                    <CardTitle>Shop Details</CardTitle>
                    <CardDescription>
                        Manage your store's receipt details and tax settings.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSaveSettings} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="storeName">Store Name</Label>
                                <Input
                                    id="storeName"
                                    value={settings.storeName || ''}
                                    onChange={e => setSettings({ ...settings, storeName: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Store Logo</Label>
                                <div className="flex items-center gap-4">
                                    {logoPreview ? (
                                        <div className="relative h-16 w-16 border rounded-md overflow-hidden group">
                                            <img src={logoPreview} alt="Store Logo" className="h-full w-full object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setLogoPreview(null);
                                                    setSettings({ ...settings, logoId: undefined });
                                                }}
                                                className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="h-16 w-16 border rounded-md flex items-center justify-center bg-muted">
                                            <ImagePlus className="h-6 w-6 text-muted-foreground" />
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        <Input
                                            type="file"
                                            accept="image/*"
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    const id = await imageService.saveImage(file);
                                                    setSettings({ ...settings, logoId: id });
                                                    setLogoPreview(URL.createObjectURL(file));
                                                }
                                            }}
                                        />
                                        <p className="text-xs text-muted-foreground mt-1">Recommended size: 192x192px or square aspect ratio.</p>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={settings.email || ''}
                                    onChange={e => setSettings({ ...settings, email: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone</Label>
                                <Input
                                    id="phone"
                                    value={settings.phone || ''}
                                    onChange={e => setSettings({ ...settings, phone: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="taxRate">Tax Rate (decimal, e.g., 0.18 for 18%)</Label>
                                <Input
                                    id="taxRate"
                                    type="number"
                                    step="0.01"
                                    value={settings.taxRate || 0}
                                    onChange={e => setSettings({ ...settings, taxRate: parseFloat(e.target.value) })}
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="address">Address</Label>
                                <Input
                                    id="address"
                                    value={settings.address || ''}
                                    onChange={e => setSettings({ ...settings, address: e.target.value })}
                                />
                            </div>
                        </div>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Save Changes
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Data Management */}
            <h2 className="text-xl font-semibold mt-8 mb-4">Data Management</h2>
            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Backup Data</CardTitle>
                        <CardDescription>
                            Download a full backup of your database, including images.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <Button onClick={handleBackup} className="w-full">
                            <Download className="mr-2 h-4 w-4" /> Download Backup (.zip)
                        </Button>
                        <p className="text-xs text-muted-foreground text-center">
                            Last Backup: {localStorage.getItem("last_backup_timestamp") ? new Date(localStorage.getItem("last_backup_timestamp")!).toLocaleString() : "Never"}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Restore Data</CardTitle>
                        <CardDescription>
                            Restore from a previously downloaded .zip backup file.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid w-full max-w-sm items-center gap-1.5">
                            <Label htmlFor="restore-file">Select Backup File</Label>
                            <Input id="restore-file" type="file" accept=".zip" onChange={handleRestore} disabled={isRestoring} />
                        </div>
                        {isRestoring && (
                            <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" /> Restoring database...
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* CSV Management */}
            <h2 className="text-xl font-semibold mt-8 mb-4">Export Reports</h2>
            <div className="grid gap-6 md:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Products CSV</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Button variant="outline" className="w-full" onClick={() => handleExportCSV('products')}>
                            <FileSpreadsheet className="mr-2 h-4 w-4" /> Export Products
                        </Button>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Customers CSV</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Button variant="outline" className="w-full" onClick={() => handleExportCSV('customers')}>
                            <FileSpreadsheet className="mr-2 h-4 w-4" /> Export Customers
                        </Button>
                    </CardContent>
                </Card>
                <Card className="col-span-1 md:col-span-1">
                    <CardHeader>
                        <CardTitle className="text-base">Orders Reports</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <Button variant="outline" className="w-full justify-start" onClick={() => handleExportCSV('daily_orders')}>
                            <FileSpreadsheet className="mr-2 h-4 w-4" /> Daily Report
                        </Button>
                        <Button variant="outline" className="w-full justify-start" onClick={() => handleExportCSV('monthly_orders')}>
                            <FileSpreadsheet className="mr-2 h-4 w-4" /> Monthly Report
                        </Button>
                        <Button variant="outline" className="w-full justify-start" onClick={() => handleExportCSV('yearly_orders')}>
                            <FileSpreadsheet className="mr-2 h-4 w-4" /> Yearly Report
                        </Button>
                        <Button variant="outline" className="w-full justify-start" onClick={() => handleExportCSV('orders')}>
                            <FileSpreadsheet className="mr-2 h-4 w-4" /> Export All Orders
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
