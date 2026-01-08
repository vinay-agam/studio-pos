import { useState, useRef } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";
import { db, type Order } from "@/db/db";
import { Label } from "@/components/ui/label";
import { Loader2, Printer, Check } from "lucide-react";
import { ReceiptPrinter } from "./ReceiptPrinter";
import { useReactToPrint } from "react-to-print";

export function CheckoutDialog({ total, disabled }: { total: number; disabled?: boolean }) {
    const { items, clearCart, customer, subtotal, discount, discountType, discountValue, tax } = useCart();
    const [open, setOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "upi">("cash");
    const [amountTendered, setAmountTendered] = useState("");
    const [lastOrder, setLastOrder] = useState<Order | null>(null);

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
                id: crypto.randomUUID(),
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

            await db.orders.add(order);

            // Update Inventory
            for (const item of items) {
                const product = await db.products.get(item.id);
                if (product) {
                    await db.products.update(item.id, {
                        inventory: Math.max(0, product.inventory - item.quantity)
                    });
                }
            }

            setLastOrder(order); // Save for printing
            clearCart();
            // Don't close immediately, allow printing
        } catch (error) {
            console.error("Checkout failed:", error);
            alert("Checkout failed. Please try again.");
            setIsProcessing(false); // Only reset if failed
        }
    };

    const handleClose = () => {
        setOpen(false);
        setLastOrder(null);
        setAmountTendered("");
        setIsProcessing(false);
        setPaymentMethod("cash");
    };

    return (
        <Dialog open={open} onOpenChange={(val) => !val && handleClose()}>
            <DialogTrigger asChild>
                <Button className="w-full mt-4" size="lg" disabled={disabled} onClick={() => setOpen(true)}>
                    Checkout (₹{total.toFixed(2)})
                </Button>
            </DialogTrigger>
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
                        </DialogHeader>
                        <div className="flex flex-col gap-3 py-4">
                            <Button variant="outline" size="lg" className="w-full" onClick={() => handlePrint()}>
                                <Printer className="mr-2 h-4 w-4" /> Print Receipt / Ticket
                            </Button>
                            <div className="hidden">
                                <ReceiptPrinter ref={printerRef} order={lastOrder} customer={customer} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button className="w-full" onClick={handleClose}>Start New Sale</Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
