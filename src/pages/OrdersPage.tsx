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
import { PlayCircle, Eye, Calendar, ArrowUpDown } from "lucide-react";
import { OrderDetailsDialog } from "@/components/orders/OrderDetailsDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { getDateRange, type DateRangeType } from "@/lib/dateUtils";

export default function OrdersPage() {
    const navigate = useNavigate();
    const { loadOrder } = useCart();
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

    // Filter & Sort State
    const [dateRange, setDateRange] = useState<DateRangeType>("last7days");
    const [customStart, setCustomStart] = useState<string>("");
    const [customEnd, setCustomEnd] = useState<string>("");
    const [sortOrder, setSortOrder] = useState<string>("newest");

    // Pagination State
    const [currentPage, setCurrentPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);

    // Fetch all orders
    const allOrders = useLiveQuery(() => db.orders.toArray()) || [];

    // Filter orders
    const filteredOrders = allOrders.filter(o => {
        const { start, end } = getDateRange(dateRange, customStart, customEnd);
        const date = new Date(o.createdAt);
        return date >= start && date <= end;
    });

    // Sort orders
    const sortedOrders = filteredOrders.sort((a, b) => {
        switch (sortOrder) {
            case "oldest":
                return a.createdAt.localeCompare(b.createdAt);
            case "amountHigh":
                return b.total - a.total;
            case "amountLow":
                return a.total - b.total;
            case "newest":
            default:
                return b.createdAt.localeCompare(a.createdAt);
        }
    });

    // Pagination Logic
    const totalPages = Math.ceil(sortedOrders.length / pageSize);
    const paginatedOrders = sortedOrders.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

    const drafts = sortedOrders.filter(o => o.status === 'draft');
    const completed = sortedOrders.filter(o => o.status === 'completed');



    const handleResumeDraft = (order: Order) => {
        if (confirm("Resume this draft? This will replace your current cart.")) {
            loadOrder(order);
            navigate("/pos");
        }
    };

    const OrderTable = ({ data, actions }: { data: Order[], actions?: (order: Order) => React.ReactNode }) => (
        <div className="rounded-md border overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="whitespace-nowrap">Date</TableHead>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Details</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map(order => (
                        <TableRow key={order.id}>
                            <TableCell className="whitespace-nowrap">
                                {new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString()}
                            </TableCell>
                            <TableCell className="font-mono text-xs max-w-[100px] truncate" title={order.id}>
                                {order.id.slice(0, 8)}...
                            </TableCell>
                            <TableCell className="max-w-[200px]">
                                <div className="truncate">
                                    {order.items.length} Items
                                </div>
                                {order.customerId && (
                                    <div className="text-xs text-muted-foreground truncate" title={`Cust: ${order.customerId}`}>
                                        Cust: {order.customerId}
                                    </div>
                                )}
                            </TableCell>
                            <TableCell>₹{order.total.toFixed(2)}</TableCell>
                            <TableCell className="text-right whitespace-nowrap">
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
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-3xl font-bold">Orders Management</h1>

                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                    {/* Date Filter */}
                    <div className="flex gap-2">
                        <Select value={dateRange} onValueChange={(val: DateRangeType) => setDateRange(val)}>
                            <SelectTrigger className="w-[160px]">
                                <Calendar className="mr-2 h-4 w-4" />
                                <SelectValue placeholder="Period" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Time</SelectItem>
                                <SelectItem value="today">Today</SelectItem>
                                <SelectItem value="yesterday">Yesterday</SelectItem>
                                <SelectItem value="thisWeek">This Week</SelectItem>
                                <SelectItem value="lastWeek">Last Week</SelectItem>
                                <SelectItem value="last7days">Last 7 Days</SelectItem>
                                <SelectItem value="thisMonth">This Month</SelectItem>
                                <SelectItem value="lastMonth">Last Month</SelectItem>
                                <SelectItem value="custom">Custom Range</SelectItem>
                            </SelectContent>
                        </Select>

                        {dateRange === 'custom' && (
                            <>
                                <Input
                                    type="date"
                                    value={customStart}
                                    onChange={(e) => setCustomStart(e.target.value)}
                                    className="w-[130px]"
                                />
                                <Input
                                    type="date"
                                    value={customEnd}
                                    onChange={(e) => setCustomEnd(e.target.value)}
                                    className="w-[130px]"
                                />
                            </>
                        )}
                    </div>

                    {/* Sort Filter */}
                    <Select value={sortOrder} onValueChange={setSortOrder}>
                        <SelectTrigger className="w-[160px]">
                            <ArrowUpDown className="mr-2 h-4 w-4" />
                            <SelectValue placeholder="Sort By" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="newest">Newest First</SelectItem>
                            <SelectItem value="oldest">Oldest First</SelectItem>
                            <SelectItem value="amountHigh">Amount: High to Low</SelectItem>
                            <SelectItem value="amountLow">Amount: Low to High</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <Tabs defaultValue="all" className="w-full">
                <TabsList>
                    <TabsTrigger value="all">All Orders</TabsTrigger>
                    <TabsTrigger value="drafts">Drafts <Badge variant="secondary" className="ml-2">{drafts.length}</Badge></TabsTrigger>
                    <TabsTrigger value="completed">Completed</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="mt-4">
                    <OrderTable data={paginatedOrders} actions={(order) => (
                        order.status === 'draft' ?
                            <Button size="sm" onClick={() => handleResumeDraft(order)}>
                                <PlayCircle className="mr-2 h-4 w-4" /> Resume
                            </Button> :
                            <Button size="sm" variant="ghost" onClick={() => setSelectedOrder(order)}>
                                <Eye className="mr-2 h-4 w-4" /> View
                            </Button>
                    )} />

                    {/* Pagination Controls */}
                    <div className="flex items-center justify-between py-4">
                        <div className="flex-1 text-sm text-muted-foreground mr-4">
                            Showing {paginatedOrders.length} of {sortedOrders.length} orders
                        </div>
                        <div className="flex items-center space-x-6 lg:space-x-8">
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
