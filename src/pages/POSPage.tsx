import { CartPanel } from "@/components/pos/CartPanel";
import { ProductGrid } from "@/components/pos/ProductGrid";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet"; // Added SheetTitle and SheetDescription for accessibility
import { ShoppingCart } from "lucide-react";


import { useState } from "react";

export default function POSPage() {
    const { total, items } = useCart();
    const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);
    const [isCartOpen, setIsCartOpen] = useState(false);

    return (
        <div className="flex h-full w-full bg-background overflow-hidden flex-col lg:flex-row">
            {/* Left Side: Product Grid */}
            <div className="flex-1 h-full overflow-hidden relative">
                <ProductGrid />

                {/* Mobile Cart Bottom Bar */}
                <div className="lg:hidden absolute bottom-0 left-0 right-0 p-4 bg-background border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-20">
                    <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
                        <SheetTrigger asChild>
                            <Button className="w-full h-12 text-lg flex justify-between" size="lg">
                                <span className="flex items-center gap-2">
                                    <ShoppingCart className="h-5 w-5" />
                                    {itemCount} Items
                                </span>
                                <span className="font-bold">₹{total.toFixed(2)}</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="bottom" className="h-[85vh] p-0 flex flex-col rounded-t-[10px] [&>button]:hidden">
                            {/* Accessibility fix: Sheet requires Title/Description or VisuallyHidden ones */}
                            <div className="sr-only">
                                <SheetTitle>Shopping Cart</SheetTitle>
                                <SheetDescription>Review your items and checkout</SheetDescription>
                            </div>
                            <div className="flex-1 h-full overflow-hidden rounded-t-[10px]">
                                <CartPanel isInSheet={true} onCartClose={() => setIsCartOpen(false)} />
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>

            {/* Right Side: Cart Panel (Desktop) */}
            <div className="hidden lg:block w-[400px] h-full shadow-xl z-10 border-l bg-card">
                <CartPanel />
            </div>
        </div>
    );
}
