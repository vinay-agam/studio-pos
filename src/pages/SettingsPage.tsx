import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { createBackupZip, restoreBackupZip, checkAndRunAutoBackup } from "@/services/backupService";
import { exportToCSV } from "@/services/csvService";
import { db } from "@/db/db";
import { Loader2, Download, AlertTriangle, FileSpreadsheet } from "lucide-react";

export default function SettingsPage() {
    const [isRestoring, setIsRestoring] = useState(false);
    const [backupNeeded, setBackupNeeded] = useState(false);

    useEffect(() => {
        if (checkAndRunAutoBackup()) {
            setBackupNeeded(true);
        }
    }, []);

    const handleBackup = async () => {
        try {
            await createBackupZip();
            setBackupNeeded(false);
        } catch (error) {
            console.error("Backup failed", error);
            alert("Backup failed. See console for details.");
        }
    };

    const handleRestore = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!confirm("WARNING: This will replace ALL current data with the backup. This action cannot be undone. Are you sure?")) {
            event.target.value = ""; // Reset input
            return;
        }

        setIsRestoring(true);
        try {
            await restoreBackupZip(file);
        } catch (error) {
            console.error("Restore failed", error);
            alert("Restore failed. Ensure you uploaded a valid backup ZIP file.");
            setIsRestoring(false);
        }
    };

    const handleExportCSV = async (table: 'products' | 'customers' | 'orders') => {
        let data: any[] = [];
        if (table === 'products') data = await db.products.toArray();
        if (table === 'customers') data = await db.customers.toArray();
        if (table === 'orders') data = await db.orders.toArray();

        exportToCSV(data, `${table}-export-${new Date().toISOString().split('T')[0]}.csv`);
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
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Orders CSV</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Button variant="outline" className="w-full" onClick={() => handleExportCSV('orders')}>
                            <FileSpreadsheet className="mr-2 h-4 w-4" /> Export Orders
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
