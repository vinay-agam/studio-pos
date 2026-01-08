import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { DollarSign, ShoppingCart, Package, TrendingUp } from "lucide-react";

export default function DashboardPage() {
    const stats = useLiveQuery(async () => {
        const orders = await db.orders.toArray();
        const products = await db.products.toArray();

        // KPIS
        const totalRevenue = orders.reduce((sum, o) => sum + (o.status !== 'cancelled' ? o.total : 0), 0);
        const totalOrders = orders.filter(o => o.status !== 'cancelled').length;
        const lowStock = products.filter(p => p.inventory < 5).length;
        const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        // Chart Data (Last 7 Days)
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return d.toISOString().split("T")[0]; // YYYY-MM-DD
        }).reverse();

        const salesData = last7Days.map(date => {
            const daysOrders = orders.filter(o => o.createdAt.startsWith(date) && o.status !== 'cancelled');
            const sales = daysOrders.reduce((sum, o) => sum + o.total, 0);
            return {
                date: new Date(date).toLocaleDateString(undefined, { weekday: 'short' }),
                sales: sales
            };
        });

        // Recent Orders
        const recentOrders = orders
            .filter(o => o.status !== 'draft') // Show only completed/cancelled
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .slice(0, 5);

        // Top Products
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
    });

    if (!stats) return <div className="p-8">Loading dashboard...</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{stats.totalRevenue.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">Lifetime sales</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Orders</CardTitle>
                        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalOrders}</div>
                        <p className="text-xs text-muted-foreground">Completed orders</p>
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
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Sales Overview (Last 7 Days)</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={stats.salesData}>
                                    <defs>
                                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                    <XAxis dataKey="date" className="text-xs text-muted-foreground" />
                                    <YAxis className="text-xs text-muted-foreground" tickFormatter={(value) => `₹${value}`} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                                        formatter={(value: number | undefined) => [`₹${(value || 0).toFixed(2)}`, "Sales"]}
                                    />
                                    <Area type="monotone" dataKey="sales" stroke="#8884d8" fillOpacity={1} fill="url(#colorSales)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Activity & Top Products */}
                <div className="col-span-3 space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Orders</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {stats.recentOrders.map(order => (
                                    <div key={order.id} className="flex items-center">
                                        <span className="relative flex h-2 w-2 mr-4">
                                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${order.status === 'completed' ? 'bg-sky-400' : 'bg-gray-400'}`}></span>
                                            <span className={`relative inline-flex rounded-full h-2 w-2 ${order.status === 'completed' ? 'bg-sky-500' : 'bg-gray-500'}`}></span>
                                        </span>
                                        <div className="ml-0 space-y-1">
                                            <p className="text-sm font-medium leading-none">Order #{order.id.slice(0, 6)}</p>
                                            <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleTimeString()}</p>
                                        </div>
                                        <div className="ml-auto font-medium">+₹{order.total.toFixed(2)}</div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Top Selling Products</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {stats.topProducts.map((p, i) => (
                                    <div key={i} className="flex items-center justify-between">
                                        <div className="text-sm font-medium">{p.name}</div>
                                        <div className="text-sm text-muted-foreground">{p.qty} sold</div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
