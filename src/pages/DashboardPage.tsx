import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { DollarSign, ShoppingCart, Package, TrendingUp, Calendar } from "lucide-react";
import { getDateRange } from "@/lib/dateUtils";
import type { DateRangeType } from "@/lib/dateUtils";

export default function DashboardPage() {
    const [dateRange, setDateRange] = useState<DateRangeType>("last7days");
    const [customStart, setCustomStart] = useState<string>("");
    const [customEnd, setCustomEnd] = useState<string>("");

    const stats = useLiveQuery(async () => {
        const { start, end } = getDateRange(dateRange, customStart, customEnd);

        // Fetch all needed data
        // Optimization: In a real app we might query by index with range, 
        // but for Dexie/client-side small data, filtering in JS is fine.
        const allOrders = await db.orders.toArray();
        const products = await db.products.toArray();

        // Filter orders by date range
        const orders = allOrders.filter(o => {
            const date = new Date(o.createdAt);
            // Lexicographical comparison for ISO strings works too if format matches, 
            // but timestamps are safer.
            return date >= start && date <= end;
        });

        // KPIS
        const totalRevenue = orders.reduce((sum, o) => sum + (o.status !== 'cancelled' ? o.total : 0), 0);
        const totalOrders = orders.filter(o => o.status !== 'cancelled').length;
        const lowStock = products.filter(p => p.inventory < 5).length;
        const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        // Chart Data
        // If range is <= 31 days, show daily. Else maybe group by month? 
        // For now, let's just show daily data within the range.
        const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        const chartDays = Math.max(daysDiff, 1); // at least 1 day

        const chartDataPoints = Array.from({ length: chartDays + 1 }, (_, i) => {
            const d = new Date(start);
            d.setDate(d.getDate() + i);
            if (d > end) return null;
            // Use local date string YYYY-MM-DD
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }).filter(d => d !== null) as string[];

        const salesData = chartDataPoints.map(dateStr => {
            // Create bounds for this specific day using local time
            const [y, m, d] = dateStr.split('-').map(Number);
            const dayStart = new Date(y, m - 1, d);
            dayStart.setHours(0, 0, 0, 0);

            const dayEnd = new Date(y, m - 1, d);
            dayEnd.setHours(23, 59, 59, 999);

            const daysOrders = orders.filter(o => {
                if (o.status === 'cancelled') return false;
                const oDate = new Date(o.createdAt);
                return oDate >= dayStart && oDate <= dayEnd;
            });

            const sales = daysOrders.reduce((sum, o) => sum + o.total, 0);
            return {
                date: dayStart.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
                sales: sales
            };
        });

        // Recent Orders (filtered)
        const recentOrders = orders
            .filter(o => o.status !== 'draft')
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .slice(0, 5);

        // Top Products (filtered)
        const productSales = new Map<string, number>();
        orders.filter(o => o.status !== 'cancelled').forEach(order => {
            order.items.forEach(item => {
                const current = productSales.get(item.title) || 0;
                productSales.set(item.title, current + item.qty);
            });
        });

        const topProducts = Array.from(productSales.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, qty]) => ({ name, qty }));

        return { totalRevenue, totalOrders, lowStock, avgOrderValue, salesData, recentOrders, topProducts };
    }, [dateRange, customStart, customEnd]); // Re-run when filter changes

    if (!stats) return <div className="p-8">Loading dashboard...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>

                <div className="flex flex-col sm:flex-row gap-2">
                    <Select value={dateRange} onValueChange={(val: DateRangeType) => setDateRange(val)}>
                        <SelectTrigger className="w-[180px]">
                            <Calendar className="mr-2 h-4 w-4" />
                            <SelectValue placeholder="Select period" />
                        </SelectTrigger>
                        <SelectContent>
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
                        <div className="flex gap-2">
                            <Input
                                type="date"
                                value={customStart}
                                onChange={(e) => setCustomStart(e.target.value)}
                                className="w-[150px]"
                            />
                            <Input
                                type="date"
                                value={customEnd}
                                onChange={(e) => setCustomEnd(e.target.value)}
                                className="w-[150px]"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{stats.totalRevenue.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">For selected period</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Orders</CardTitle>
                        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalOrders}</div>
                        <p className="text-xs text-muted-foreground">For selected period</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{stats.avgOrderValue.toFixed(2)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.lowStock}</div>
                        <p className="text-xs text-muted-foreground">Items needing restock</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                {/* Sales Chart */}
                <Card className="col-span-1 md:col-span-2 lg:col-span-4">
                    <CardHeader>
                        <CardTitle>Sales Overview</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={stats.salesData}>
                                    <defs>
                                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#F9D342" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#F9D342" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                    <XAxis dataKey="date" className="text-xs text-muted-foreground" minTickGap={30} />
                                    <YAxis className="text-xs text-muted-foreground" tickFormatter={(value) => `₹${value}`} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                                        formatter={(value: number | undefined) => [`₹${(value || 0).toFixed(2)}`, "Sales"]}
                                    />
                                    <Area type="monotone" dataKey="sales" stroke="#F9D342" fillOpacity={1} fill="url(#colorSales)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Activity & Top Products */}
                <div className="col-span-1 md:col-span-2 lg:col-span-3 space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Orders</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {stats.recentOrders.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-4">No orders in this period</p>
                                ) : (
                                    stats.recentOrders.map(order => (
                                        <div key={order.id} className="flex items-center">
                                            <span className="relative flex h-2 w-2 mr-4 flex-shrink-0">
                                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${order.status === 'completed' ? 'bg-yellow-400' : 'bg-gray-400'}`}></span>
                                                <span className={`relative inline-flex rounded-full h-2 w-2 ${order.status === 'completed' ? 'bg-yellow-500' : 'bg-gray-500'}`}></span>
                                            </span>
                                            <div className="ml-0 space-y-1 flex-1 min-w-0">
                                                <p className="text-sm font-medium leading-none truncate">Order #{order.id.slice(0, 6)}</p>
                                                <p className="text-xs text-muted-foreground truncate">{new Date(order.createdAt).toLocaleTimeString()} - {new Date(order.createdAt).toLocaleDateString()}</p>
                                            </div>
                                            <div className="ml-auto font-medium whitespace-nowrap pl-2">+₹{order.total.toFixed(2)}</div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Top Selling Products</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {stats.topProducts.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-4">No sales in this period</p>
                                ) : (
                                    stats.topProducts.map((p, i) => (
                                        <div key={i} className="flex items-center justify-between">
                                            <div className="text-sm font-medium truncate flex-1 mr-2" title={p.name}>{p.name}</div>
                                            <div className="text-sm text-muted-foreground whitespace-nowrap">{p.qty} sold</div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
