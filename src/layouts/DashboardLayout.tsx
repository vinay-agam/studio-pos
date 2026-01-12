import * as React from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { LayoutDashboard, ShoppingCart, Users, Settings, Image, LogOut, Menu, ClipboardList, ChevronLeft, ChevronRight } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/db";
import { imageService } from "@/services/imageService";

const NavItem = ({ to, icon: Icon, label, isCollapsed }: { to: string; icon: any; label: string; isCollapsed?: boolean }) => {
    const location = useLocation();
    const isActive = location.pathname === to;

    return (
        <Link
            to={to}
            title={isCollapsed ? label : undefined}
            className={cn(
                "flex items-center gap-3 rounded-md transition-all text-sm font-medium",
                isCollapsed ? "justify-center px-0 py-3" : "px-3 py-2",
                isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
        >
            <Icon className="h-4 w-4" />
            {!isCollapsed && label}
        </Link>
    );
};

export default function DashboardLayout() {
    const { user, logout } = useAuth();
    const location = useLocation();
    const [isCollapsed, setIsCollapsed] = React.useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);


    const isPosPage = location.pathname === "/pos";
    const settings = useLiveQuery(() => db.settings.get('general'));
    const [logoUrl, setLogoUrl] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (settings?.logoId) {
            imageService.getImageUrl(settings.logoId).then(setLogoUrl);
        } else {
            setLogoUrl(null);
        }
    }, [settings?.logoId]);

    return (
        <div className={cn("flex h-screen w-full bg-muted/40", isCollapsed ? "sm:pl-16" : "sm:pl-64", "transition-[padding] duration-300 ease-in-out")}>
            {/* Sidebar */}
            <aside className={cn(
                "fixed inset-y-0 left-0 z-10 hidden flex-col border-r bg-background sm:flex transition-[width] duration-300 ease-in-out",
                isCollapsed ? "w-16" : "w-64"
            )}>
                <div className={cn("flex h-14 items-center border-b lg:h-[60px]", isCollapsed ? "justify-center px-0" : "px-4 lg:px-6")}>
                    <Link to="/" className="flex items-center gap-2 font-semibold">
                        {/* <Package className="h-6 w-6" /> */}
                        <img
                            src={logoUrl || `${import.meta.env.BASE_URL}android-chrome-192x192.png`}
                            alt="Logo"
                            className="h-8 w-8 rounded-md object-cover"
                        />
                        <div className={cn("flex flex-col transition-all duration-300", isCollapsed ? "w-0 opacity-0 overflow-hidden" : "w-auto opacity-100")}>
                            {settings?.storeName && <span className="font-semibold leading-tight">{settings.storeName}</span>}
                            <span className="text-[10px] text-muted-foreground font-normal leading-tight">StudioPOS</span>
                        </div>
                    </Link>
                </div>
                <div className="flex-1 overflow-auto py-2">
                    <nav className={cn("grid items-start px-2 text-sm font-medium", isCollapsed ? "px-2" : "lg:px-4")}>
                        <NavItem to="/" icon={LayoutDashboard} label="Dashboard" isCollapsed={isCollapsed} />
                        <NavItem to="/pos" icon={ShoppingCart} label="POS Terminal" isCollapsed={isCollapsed} />
                        <NavItem to="/orders" icon={ClipboardList} label="Orders" isCollapsed={isCollapsed} />
                        <NavItem to="/products" icon={Image} label="Products" isCollapsed={isCollapsed} />
                        <NavItem to="/customers" icon={Users} label="Customers" isCollapsed={isCollapsed} />
                        <NavItem to="/settings" icon={Settings} label="Settings" isCollapsed={isCollapsed} />
                    </nav>
                </div>
                <div className="p-4 border-t space-y-4">
                    {!isCollapsed && (
                        <div className="flex items-center gap-3 px-2 transition-all duration-300 fade-in">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                                {user?.name.charAt(0)}
                            </div>
                            <div className="flex flex-col text-sm overflow-hidden whitespace-nowrap">
                                <span className="font-medium truncate">{user?.name}</span>
                                <span className="text-xs text-muted-foreground capitalize truncate">{user?.role}</span>
                            </div>
                        </div>
                    )}
                    <Button
                        variant="ghost"
                        size="sm"
                        className={cn("w-full mb-2", isCollapsed ? "justify-center px-0" : "justify-start")}
                        onClick={() => setIsCollapsed(!isCollapsed)}
                    >
                        {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4 mr-2" />}
                        {!isCollapsed && "Collapse"}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className={cn("w-full", isCollapsed ? "justify-center px-0" : "justify-start")}
                        onClick={logout}
                        title="Logout"
                    >
                        <LogOut className={cn("h-4 w-4", !isCollapsed && "mr-2")} />
                        {!isCollapsed && "Logout"}
                    </Button>
                </div>
                <div className={cn("mt-auto p-4 flex items-center border-t", isCollapsed ? "flex-col gap-4 justify-center" : "justify-between")}>
                    {!isCollapsed && <span className="font-semibold text-xs text-muted-foreground whitespace-nowrap">v1.0.0</span>}
                    <ThemeToggle />
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden transition-all duration-300">
                <header className="h-16 sm:h-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center px-6 sticky top-0 z-10 gap-4">
                    <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                        <SheetTrigger asChild>
                            <Button size="icon" variant="outline" className="sm:hidden">
                                <Menu className="h-5 w-5" />
                                <span className="sr-only">Toggle Menu</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="sm:max-w-xs flex flex-col">
                            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                            <SheetDescription className="sr-only">Access different sections of the application</SheetDescription>
                            <nav className="grid gap-6 text-lg font-medium">
                                <Link
                                    to="/"
                                    className="group flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:text-base"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    {/* <Package className="h-5 w-5 transition-all group-hover:scale-110" /> */}
                                    <img
                                        src={logoUrl || `${import.meta.env.BASE_URL}android-chrome-192x192.png`}
                                        alt="Logo"
                                        className="h-6 w-6 transition-all group-hover:scale-110 rounded-md object-cover"
                                    />
                                    <span className="sr-only">StudioPOS</span>
                                </Link>
                                <Link to="/" className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground" onClick={() => setIsMobileMenuOpen(false)}>
                                    <LayoutDashboard className="h-5 w-5" />
                                    Dashboard
                                </Link>
                                <Link to="/pos" className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground" onClick={() => setIsMobileMenuOpen(false)}>
                                    <ShoppingCart className="h-5 w-5" />
                                    POS Terminal
                                </Link>
                                <Link to="/orders" className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground" onClick={() => setIsMobileMenuOpen(false)}>
                                    <ClipboardList className="h-5 w-5" />
                                    Orders
                                </Link>
                                <Link to="/products" className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground" onClick={() => setIsMobileMenuOpen(false)}>
                                    <Image className="h-5 w-5" />
                                    Products
                                </Link>
                                <Link to="/customers" className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground" onClick={() => setIsMobileMenuOpen(false)}>
                                    <Users className="h-5 w-5" />
                                    Customers
                                </Link>
                                <Link to="/settings" className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground" onClick={() => setIsMobileMenuOpen(false)}>
                                    <Settings className="h-5 w-5" />
                                    Settings
                                </Link>
                            </nav>

                            <div className="mt-auto border-t pt-4 space-y-4">
                                <div className="flex items-center gap-3 px-2">
                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                                        {user?.name.charAt(0)}
                                    </div>
                                    <div className="flex flex-col text-sm overflow-hidden whitespace-nowrap">
                                        <span className="font-medium truncate">{user?.name}</span>
                                        <span className="text-xs text-muted-foreground capitalize truncate">{user?.role}</span>
                                    </div>
                                </div>
                                <Button
                                    variant="outline"
                                    className="w-full justify-start"
                                    onClick={logout}
                                >
                                    <LogOut className="h-4 w-4 mr-2" />
                                    Logout
                                </Button>
                                <div className="flex items-center justify-between px-2">
                                    <span className="font-semibold text-xs text-muted-foreground whitespace-nowrap">v1.0.0</span>
                                    <ThemeToggle />
                                </div>
                            </div>
                        </SheetContent>
                    </Sheet>
                    <h2 className="text-lg font-semibold sm:hidden">Overview</h2>
                </header>

                <div
                    className={cn(
                        "flex-1 overflow-auto",
                        !isPosPage ? "p-4 sm:p-6" : "p-0 overflow-hidden"
                    )}
                >
                    <Outlet />
                </div>
            </main>
            {/* Static Branding Badge */}
            {!isPosPage && (
                <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/80 backdrop-blur border text-xs text-muted-foreground shadow-sm pointer-events-none select-none">
                    {/* <Package className="h-3 w-3" /> */}
                    <img src={`${import.meta.env.BASE_URL}android-chrome-192x192.png`} alt="Logo" className="h-4 w-4 rounded-sm" />
                    <span className="font-semibold">StudioPOS</span>
                </div>
            )}
        </div>
    );
}
