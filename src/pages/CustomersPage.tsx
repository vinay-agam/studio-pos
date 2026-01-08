import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Customer } from "@/db/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Plus, Trash2, Edit, History } from "lucide-react";

export default function CustomersPage() {
    const [search, setSearch] = useState("");
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [viewingHistory, setViewingHistory] = useState<Customer | null>(null);
    const [open, setOpen] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(false);

    const customers = useLiveQuery(async () => {
        const all = await db.customers.toArray();
        if (!search) return all;
        const lower = search.toLowerCase();
        return all.filter(c =>
            c.name.toLowerCase().includes(lower) ||
            c.phone.includes(lower) ||
            c.email.toLowerCase().includes(lower)
        );
    }, [search]) || [];

    const historyOrders = useLiveQuery(async () => {
        if (!viewingHistory) return [];
        return await db.orders.where('customerId').equals(viewingHistory.id).reverse().sortBy('createdAt');
    }, [viewingHistory]);

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this customer?")) {
            await db.customers.delete(id);
        }
    };

    const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const customer: Customer = {
            id: editingCustomer ? editingCustomer.id : crypto.randomUUID(),
            name: formData.get("name") as string,
            phone: formData.get("phone") as string,
            email: formData.get("email") as string,
            address: formData.get("address") as string,
        };

        if (editingCustomer) {
            await db.customers.put(customer);
        } else {
            await db.customers.add(customer);
        }
        setOpen(false);
        setEditingCustomer(null);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Customers</h1>
                <Dialog open={open} onOpenChange={(val) => {
                    setOpen(val);
                    if (!val) setEditingCustomer(null);
                }}>
                    <DialogTrigger asChild>
                        <Button onClick={() => setEditingCustomer(null)}>
                            <Plus className="mr-2 h-4 w-4" /> Add Customer
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingCustomer ? "Edit Customer" : "Add New Customer"}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Name</Label>
                                <Input id="name" name="name" defaultValue={editingCustomer?.name} required />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="phone">Phone</Label>
                                <Input id="phone" name="phone" defaultValue={editingCustomer?.phone} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="email">Email</Label>
                                <Input id="email" name="email" type="email" defaultValue={editingCustomer?.email} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="address">Address</Label>
                                <Input id="address" name="address" defaultValue={editingCustomer?.address} />
                            </div>
                            <DialogFooter>
                                <Button type="submit">Save Changes</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                <Dialog open={historyOpen} onOpenChange={(val) => {
                    setHistoryOpen(val);
                    if (!val) setViewingHistory(null);
                }}>
                    <DialogContent className="max-w-3xl">
                        <DialogHeader>
                            <DialogTitle>Order History: {viewingHistory?.name}</DialogTitle>
                        </DialogHeader>
                        <div className="max-h-[60vh] overflow-y-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Order ID</TableHead>
                                        <TableHead>Items</TableHead>
                                        <TableHead>Total</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {historyOrders?.map(order => (
                                        <TableRow key={order.id}>
                                            <TableCell>{new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString()}</TableCell>
                                            <TableCell className="font-mono text-xs">{order.id.slice(0, 8)}...</TableCell>
                                            <TableCell>{order.items.length} items</TableCell>
                                            <TableCell>${order.total.toFixed(2)}</TableCell>
                                            <TableCell className="capitalize">{order.status}</TableCell>
                                        </TableRow>
                                    ))}
                                    {historyOrders?.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center text-muted-foreground">No orders found.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search customers..."
                            className="pl-8 max-w-sm"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Address</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {customers.map((customer) => (
                                <TableRow key={customer.id}>
                                    <TableCell className="font-medium">{customer.name}</TableCell>
                                    <TableCell>{customer.phone}</TableCell>
                                    <TableCell>{customer.email}</TableCell>
                                    <TableCell>{customer.address}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => {
                                            setViewingHistory(customer);
                                            setHistoryOpen(true);
                                        }}>
                                            <History className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => {
                                            setEditingCustomer(customer);
                                            setOpen(true);
                                        }}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(customer.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {customers.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                        No customers found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
