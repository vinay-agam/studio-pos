import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Order } from "@/db/db";
import { useCart } from "@/context/CartContext";
import { useNavigate } from "react-router-dom";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { PlayCircle, Eye } from "lucide-react";
import { OrderDetailsDialog } from "@/components/orders/OrderDetailsDialog";

export default function OrdersPage() {
    const navigate = useNavigate();
    const { loadOrder } = useCart();
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

    // Fetch all orders
    const orders = useLiveQuery(() => db.orders.orderBy('createdAt').reverse().toArray()) || [];

    const drafts = orders.filter(o => o.status === 'draft');
    const completed = orders.filter(o => o.status === 'completed');

    const handleResumeDraft = (order: Order) => {
        if (confirm("Resume this draft? This will replace your current cart.")) {
            loadOrder(order);
            navigate("/pos");
        }
    };

    const OrderTable = ({ data, actions }: { data: Order[], actions?: (order: Order) => React.ReactNode }) => (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Details</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map(order => (
                        <TableRow key={order.id}>
                            <TableCell>{new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString()}</TableCell>
                            <TableCell className="font-mono text-xs">{order.id.slice(0, 8)}...</TableCell>
                            <TableCell>
                                {order.items.length} Items
                                {order.customerId && <div className="text-xs text-muted-foreground">Cust: {order.customerId}</div>}
                            </TableCell>
                            <TableCell>₹{order.total.toFixed(2)}</TableCell>
                            <TableCell className="text-right">
                                {actions ? actions(order) : null}
                            </TableCell>
                        </TableRow>
                    ))}
                    {data.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                No orders found.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );

    return (
        <div className="space-y-4">
            <h1 className="text-3xl font-bold">Orders Management</h1>

            <Tabs defaultValue="all" className="w-full">
                <TabsList>
                    <TabsTrigger value="all">All Orders</TabsTrigger>
                    <TabsTrigger value="drafts">Drafts <Badge variant="secondary" className="ml-2">{drafts.length}</Badge></TabsTrigger>
                    <TabsTrigger value="completed">Completed</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="mt-4">
                    <OrderTable data={orders} actions={(order) => (
                        order.status === 'draft' ?
                            <Button size="sm" onClick={() => handleResumeDraft(order)}>
                                <PlayCircle className="mr-2 h-4 w-4" /> Resume
                            </Button> :
                            <Button size="sm" variant="ghost" onClick={() => setSelectedOrder(order)}>
                                <Eye className="mr-2 h-4 w-4" /> View
                            </Button>
                    )} />
                </TabsContent>

                <TabsContent value="drafts" className="mt-4">
                    <OrderTable data={drafts} actions={(order) => (
                        <Button size="sm" onClick={() => handleResumeDraft(order)}>
                            <PlayCircle className="mr-2 h-4 w-4" /> Resume
                        </Button>
                    )} />
                </TabsContent>

                <TabsContent value="completed" className="mt-4">
                    <OrderTable data={completed} actions={(order) => (
                        <Button size="sm" variant="ghost" onClick={() => setSelectedOrder(order)}>
                            <Eye className="mr-2 h-4 w-4" /> View
                        </Button>
                    )} />
                </TabsContent>
            </Tabs>

            {selectedOrder && (
                <OrderDetailsDialog
                    order={selectedOrder}
                    open={!!selectedOrder}
                    onOpenChange={(open) => !open && setSelectedOrder(null)}
                />
            )}
        </div>
    );
}
