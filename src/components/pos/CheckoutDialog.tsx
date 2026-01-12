import { useState, useRef } from "react";
import { useAlert } from "@/context/AlertContext";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";
import { db, type Order } from "@/db/db";
import { Label } from "@/components/ui/label";
import { Loader2, Printer, Check } from "lucide-react";
import { ReceiptPrinter } from "./ReceiptPrinter";
import { useReactToPrint } from "react-to-print";

export function CheckoutDialog({ total, open, onOpenChange, onComplete }: { total: number; open: boolean; onOpenChange: (open: boolean) => void; onComplete?: () => void }) {
    const { items, clearCart, customer, subtotal, discount, discountType, discountValue, tax, currentOrderId } = useCart();
    const { alert } = useAlert();
    const [isProcessing, setIsProcessing] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "upi">("cash");
    const [amountTendered, setAmountTendered] = useState("");
    const [lastOrder, setLastOrder] = useState<Order | null>(null);

    const [lastCustomer, setLastCustomer] = useState<typeof customer>(null);

    const printerRef = useRef<HTMLDivElement>(null);
    const handlePrint = useReactToPrint({
        contentRef: printerRef,
    });

    const isCash = paymentMethod === "cash";
    const change = isCash ? Math.max(0, (parseFloat(amountTendered) || 0) - total) : 0;
    const canCheckout = isCash ? (parseFloat(amountTendered) || 0) >= total : true;

    const handleCheckout = async () => {
        setIsProcessing(true);
        try {
            const order: Order = {
                id: currentOrderId || crypto.randomUUID(),
                customerId: customer?.id,
                items: items.map(item => ({
                    sku: item.id,
                    title: item.title,
                    qty: item.quantity,
                    price: item.price,
                    variantName: item.variantName
                })),
                total,
                subtotal,
                discount,
                discountType, // Metadata
                discountValue, // Raw inputs
                tax,
                status: "completed",
                paymentMethod,
                createdAt: new Date().toISOString()
            };

            await db.orders.put(order);

            // Update Inventory
            for (const item of items) {
                const product = await db.products.get(item.id);
                if (product) {
                    let updatedVariants = product.variants;
                    let newInventory = product.inventory;

                    // If it's a variant item, update the specific variant's inventory
                    if (item.variantId && product.variants) {
                        updatedVariants = product.variants.map(v => {
                            if (v.id === item.variantId) {
                                const newVariantStock = Math.max(0, v.inventory - item.quantity);
                                return { ...v, inventory: newVariantStock };
                            }
                            return v;
                        });

                        // Recalculate total inventory based on new variant stock
                        newInventory = updatedVariants.reduce((sum, v) => sum + v.inventory, 0);
                    } else {
                        // Simple product update
                        newInventory = Math.max(0, product.inventory - item.quantity);
                    }

                    await db.products.update(item.id, {
                        inventory: newInventory,
                        variants: updatedVariants
                    });
                }
            }

            setLastOrder(order); // Save for printing
            setLastCustomer(customer); // Persist customer for printing
            clearCart();
            // Don't close immediately, allow printing
        } catch (error) {

            console.error("Checkout failed:", error);
            await alert("Checkout failed. Please try again.", "Error");
            setIsProcessing(false); // Only reset if failed
        }
    };

    const handleClose = () => {
        onOpenChange(false);
        // Delay resetting state slightly to allow animation to finish, or just reset immediately if desired.
        // Actually, better to reset state when the dialog closes completely. 
        // For now, let's keep the logic simple, but check if we need to clean up.
        // If we reset immediately, the success screen might flicker to the form before closing.
        // But since we are closing, it might not matter.
        setTimeout(() => {
            setLastOrder(null);
            setLastCustomer(null);
            setAmountTendered("");
            setIsProcessing(false);
            setPaymentMethod("cash");
        }, 300);
    };

    return (
        <Dialog open={open} onOpenChange={(val) => !val && handleClose()}>

            <DialogContent className="sm:max-w-[425px]">
                {!lastOrder ? (
                    <>
                        <DialogHeader>
                            <DialogTitle>Complete Sale</DialogTitle>
                            <DialogDescription>
                                Total Amount Due: <span className="font-bold text-foreground">₹{total.toFixed(2)}</span>
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-3 gap-2">
                                <Button
                                    variant={paymentMethod === "cash" ? "default" : "outline"}
                                    onClick={() => setPaymentMethod("cash")}
                                    className="w-full"
                                >
                                    Cash
                                </Button>
                                <Button
                                    variant={paymentMethod === "card" ? "default" : "outline"}
                                    onClick={() => setPaymentMethod("card")}
                                    className="w-full"
                                >
                                    Card
                                </Button>
                                <Button
                                    variant={paymentMethod === "upi" ? "default" : "outline"}
                                    onClick={() => setPaymentMethod("upi")}
                                    className="w-full"
                                >
                                    UPI
                                </Button>
                            </div>

                            {isCash ? (
                                <>
                                    <div className="grid gap-2">
                                        <Label htmlFor="tendered">Amount Tendered</Label>
                                        <Input
                                            id="tendered"
                                            type="number"
                                            placeholder="0.00"
                                            value={amountTendered}
                                            onChange={(e) => setAmountTendered(e.target.value)}
                                            autoFocus
                                        />
                                    </div>
                                    <div className="p-4 bg-muted rounded-md text-center">
                                        <div className="text-sm text-muted-foreground">Change Due</div>
                                        <div className="text-2xl font-bold text-primary">₹{change.toFixed(2)}</div>
                                    </div>
                                </>
                            ) : (
                                <div className="p-8 border-2 border-dashed rounded-md flex flex-col items-center justify-center text-muted-foreground">
                                    {paymentMethod === 'card' && <p>Swipe card on terminal...</p>}
                                    {paymentMethod === 'upi' && <p>Waiting for UPI payment...</p>}
                                </div>
                            )}
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={handleClose} disabled={isProcessing}>Cancel</Button>
                            <Button onClick={handleCheckout} disabled={!canCheckout || isProcessing} className="min-w-[140px]">
                                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                                Confirm Payment
                            </Button>
                        </DialogFooter>
                    </>
                ) : (
                    <>
                        {/* Success State */}
                        <DialogHeader>
                            <DialogTitle className="text-center text-green-600 flex flex-col items-center gap-2">
                                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                                    <Check className="h-6 w-6" />
                                </div>
                                Order Completed!
                            </DialogTitle>
                            <DialogDescription className="text-center">
                                Payment processed via <span className="uppercase font-bold">{lastOrder.paymentMethod}</span>.
                            </DialogDescription>
                            {lastCustomer && (
                                <div className="mt-4 p-4 bg-muted/50 rounded-lg text-left text-sm space-y-1">
                                    <p className="font-semibold text-foreground">Customer Details:</p>
                                    <p>{lastCustomer.name}</p>
                                    <p>{lastCustomer.phone}</p>
                                    {lastCustomer.email && <p>{lastCustomer.email}</p>}
                                </div>
                            )}
                        </DialogHeader>
                        <div className="flex flex-col gap-3 py-4">
                            <Button variant="outline" size="lg" className="w-full" onClick={() => handlePrint()}>
                                <Printer className="mr-2 h-4 w-4" /> Print Receipt / Ticket
                            </Button>
                            <div className="hidden">
                                <ReceiptPrinter ref={printerRef} order={lastOrder} customer={lastCustomer} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button className="w-full" onClick={() => {
                                handleClose();
                                onComplete?.();
                            }}>Start New Sale</Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}

