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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
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

    // Pagination State
    const [currentPage, setCurrentPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);

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

    // Pagination Logic
    const totalPages = Math.ceil(customers.length / pageSize);
    const paginatedCustomers = customers.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-bold">Customers</h1>
                <Dialog open={open} onOpenChange={(val) => {
                    setOpen(val);
                    if (!val) setEditingCustomer(null);
                }}>
                    <DialogTrigger asChild>
                        <Button onClick={() => setEditingCustomer(null)} className="w-full sm:w-auto">
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
                    <div className="relative w-full sm:w-auto">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search customers..."
                            className="pl-8 w-full sm:w-[300px]"
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setCurrentPage(0); // Reset page on search
                            }}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-4">
                        {paginatedCustomers.map(customer => (
                            <div key={customer.id} className="bg-card text-card-foreground rounded-lg border shadow-sm p-4 space-y-3">
                                <div className="space-y-1">
                                    <div className="font-semibold text-lg">{customer.name}</div>
                                    <div className="text-sm text-muted-foreground space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">Phone:</span> {customer.phone}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">Email:</span> {customer.email}
                                        </div>
                                        {customer.address && (
                                            <div className="flex items-start gap-2">
                                                <span className="font-medium">Address:</span> <span className="flex-1">{customer.address}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="pt-2 border-t flex justify-end gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => {
                                        setViewingHistory(customer);
                                        setHistoryOpen(true);
                                    }}>
                                        <History className="h-4 w-4 mr-2" /> History
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => {
                                        setEditingCustomer(customer);
                                        setOpen(true);
                                    }}>
                                        <Edit className="h-4 w-4 mr-2" /> Edit
                                    </Button>
                                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(customer.id)}>
                                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                                    </Button>
                                </div>
                            </div>
                        ))}
                        {customers.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-lg">
                                No customers found.
                            </div>
                        )}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block rounded-md border">
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
                                {paginatedCustomers.map((customer) => (
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
                    </div>

                    {/* Pagination Controls */}
                    {/* Pagination Controls */}
                    <div className="flex flex-col md:flex-row items-center justify-between py-4 gap-4">
                        <div className="flex-1 text-sm text-muted-foreground order-2 md:order-1">
                            Showing {paginatedCustomers.length} of {customers.length} customers
                        </div>
                        <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6 lg:space-x-8 order-1 md:order-2 w-full md:w-auto justify-between sm:justify-end">
                            <div className="flex items-center space-x-2">
                                <p className="text-sm font-medium">Rows per page</p>
                                <Select
                                    value={`${pageSize}`}
                                    onValueChange={(value: string) => {
                                        setPageSize(Number(value));
                                        setCurrentPage(0);
                                    }}
                                >
                                    <SelectTrigger className="h-8 w-[70px]">
                                        <SelectValue placeholder={pageSize} />
                                    </SelectTrigger>
                                    <SelectContent side="top">
                                        {[10, 20, 30, 40, 50].map((size) => (
                                            <SelectItem key={size} value={`${size}`}>
                                                {size}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                                Page {currentPage + 1} of {Math.max(totalPages, 1)}
                            </div>
                            <div className="flex items-center space-x-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                                    disabled={currentPage === 0}
                                >
                                    Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                                    disabled={currentPage >= totalPages - 1}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
