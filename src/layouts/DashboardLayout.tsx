import { Outlet, Link, useLocation } from "react-router-dom";
import { LayoutDashboard, ShoppingCart, Package, Users, Settings, Image, LogOut, Menu, ClipboardList } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

const NavItem = ({ to, icon: Icon, label }: { to: string; icon: any; label: string }) => {
    const location = useLocation();
    const isActive = location.pathname === to;

    return (
        <Link
            to={to}
            className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md transition-all text-sm font-medium",
                isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
        >
            <Icon className="h-4 w-4" />
            {label}
        </Link>
    );
};

export default function DashboardLayout() {
    const { user, logout } = useAuth();
    const location = useLocation();
    const isPosPage = location.pathname === "/pos";
    return (
        <div className="flex h-screen w-full bg-muted/40 sm:pl-64">
            {/* Sidebar */}
            <aside className="fixed inset-y-0 left-0 z-10 hidden w-64 flex-col border-r bg-background sm:flex">
                <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
                    <Link to="/" className="flex items-center gap-2 font-semibold">
                        <Package className="h-6 w-6" />
                        <span className="">StudioPOS</span>
                    </Link>
                </div>
                <div className="flex-1 overflow-auto py-2">
                    <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
                        <NavItem to="/" icon={LayoutDashboard} label="Dashboard" />
                        <NavItem to="/pos" icon={ShoppingCart} label="POS Terminal" />
                        <NavItem to="/orders" icon={ClipboardList} label="Orders" />
                        <NavItem to="/products" icon={Image} label="Products" />
                        <NavItem to="/customers" icon={Users} label="Customers" />
                        <NavItem to="/settings" icon={Settings} label="Settings" />
                    </nav>
                </div>
                <div className="p-4 border-t space-y-4">
                    <div className="flex items-center gap-3 px-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                            {user?.name.charAt(0)}
                        </div>
                        <div className="flex flex-col text-sm">
                            <span className="font-medium">{user?.name}</span>
                            <span className="text-xs text-muted-foreground capitalize">{user?.role}</span>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" className="w-full justify-start" onClick={logout}>
                        <LogOut className="mr-2 h-4 w-4" /> Logout
                    </Button>
                </div>
                <div className="mt-auto p-4 flex justify-between items-center border-t">
                    <span className="font-semibold text-xs text-muted-foreground">StudioPOS - v1.0.0</span>
                    <ThemeToggle />
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <header className="h-16 sm:h-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center px-6 sticky top-0 z-10 gap-4">
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button size="icon" variant="outline" className="sm:hidden">
                                <Menu className="h-5 w-5" />
                                <span className="sr-only">Toggle Menu</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="sm:max-w-xs">
                            <nav className="grid gap-6 text-lg font-medium">
                                <Link
                                    to="/"
                                    className="group flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:text-base"
                                >
                                    <Package className="h-5 w-5 transition-all group-hover:scale-110" />
                                    <span className="sr-only">StudioPOS</span>
                                </Link>
                                <Link to="/" className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground">
                                    <LayoutDashboard className="h-5 w-5" />
                                    Dashboard
                                </Link>
                                <Link to="/pos" className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground">
                                    <ShoppingCart className="h-5 w-5" />
                                    POS Terminal
                                </Link>
                                <Link to="/orders" className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground">
                                    <ClipboardList className="h-5 w-5" />
                                    Orders
                                </Link>
                                <Link to="/products" className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground">
                                    <Image className="h-5 w-5" />
                                    Products
                                </Link>
                                <Link to="/customers" className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground">
                                    <Users className="h-5 w-5" />
                                    Customers
                                </Link>
                                <Link to="/settings" className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground">
                                    <Settings className="h-5 w-5" />
                                    Settings
                                </Link>
                            </nav>
                        </SheetContent>
                    </Sheet>
                    <h2 className="text-lg font-semibold sm:hidden">Overview</h2>
                </header>

                <div
                    className={`flex-1 overflow-auto ${
                        !isPosPage ? 'p-6' : 'p-6 sm:p-0'
                    }`}
                >
                <Outlet />
                </div>
            </main>
            {/* Static Branding Badge */}
            {!isPosPage && (
                <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/80 backdrop-blur border text-xs text-muted-foreground shadow-sm pointer-events-none select-none">
                    <Package className="h-3 w-3" />
                    <span className="font-semibold">StudioPOS</span>
                </div>
            )}
        </div>
    );
}
