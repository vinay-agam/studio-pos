import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { type Order, type Customer, db } from "@/db/db";
import { useState, useRef, useEffect } from "react";
import { useReactToPrint } from "react-to-print";
import { ReceiptPrinter } from "@/components/pos/ReceiptPrinter";
import { Printer } from "lucide-react";

interface OrderDetailsDialogProps {
    order: Order | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function OrderDetailsDialog({ order, open, onOpenChange }: OrderDetailsDialogProps) {
    const [customer, setCustomer] = useState<Customer | null>(null);
    const printerRef = useRef<HTMLDivElement>(null);
    const handlePrint = useReactToPrint({
        contentRef: printerRef,
    });

    useEffect(() => {
        if (order?.customerId) {
            db.customers.get(order.customerId).then(c => setCustomer(c || null));
        } else {
            setCustomer(null);
        }
    }, [order]);

    if (!order) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Order Details #{order.id.slice(0, 8)}</DialogTitle>
                    <DialogDescription>
                        Placed on {new Date(order.createdAt).toLocaleString()}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4 flex-1 overflow-y-auto px-1">
                    {/* Customer Info */}
                    {customer && (
                        <div className="p-4 bg-muted rounded-md">
                            <h3 className="font-semibold mb-2">Customer Information</h3>
                            <div className="text-sm grid grid-cols-2 gap-2">
                                <div><span className="font-medium">Name:</span> {customer.name}</div>
                                <div><span className="font-medium">Phone:</span> {customer.phone}</div>
                                <div className="col-span-2"><span className="font-medium">Email:</span> {customer.email}</div>
                            </div>
                        </div>
                    )}

                    {/* Order Items */}
                    <div className="border rounded-md">
                        <table className="w-full text-sm">
                            <thead className="bg-muted">
                                <tr>
                                    <th className="p-2 text-left">Item</th>
                                    <th className="p-2 text-center">Qty</th>
                                    <th className="p-2 text-right">Price</th>
                                    <th className="p-2 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {order.items.map((item, idx) => (
                                    <tr key={idx} className="border-t">
                                        <td className="p-2">
                                            <div className="font-medium">{item.title}</div>
                                            {item.variantName && <div className="text-xs text-muted-foreground">Option: {item.variantName}</div>}
                                            <div className="text-xs text-muted-foreground">{item.sku}</div>
                                        </td>
                                        <td className="p-2 text-center">{item.qty}</td>
                                        <td className="p-2 text-right">₹{item.price.toFixed(2)}</td>
                                        <td className="p-2 text-right font-medium">₹{(item.price * item.qty).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Financials */}
                    <div className="flex flex-col gap-2 items-end">
                        <div className="flex gap-8 text-sm">
                            <span className="text-muted-foreground">Subtotal:</span>
                            <span>₹{order.subtotal.toFixed(2)}</span>
                        </div>
                        {order.discount > 0 && (
                            <div className="flex gap-8 text-sm text-green-600">
                                <span>Discount:</span>
                                <span>-₹{order.discount.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex gap-8 text-sm">
                            <span className="text-muted-foreground">Tax:</span>
                            <span>₹{order.tax.toFixed(2)}</span>
                        </div>
                        <div className="flex gap-8 text-lg font-bold border-t pt-2 mt-2">
                            <span>Total:</span>
                            <span>₹{order.total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                <DialogFooter className="flex justify-between sm:justify-between items-center bg-muted -mx-6 -mb-6 p-6 rounded-b-lg">
                    <div className="text-xs text-muted-foreground">
                        Payment Method: <span className="uppercase font-bold">{order.paymentMethod || 'Unknown'}</span>
                    </div>
                    <div className="flex gap-2">
                        <div className="hidden">
                            <ReceiptPrinter ref={printerRef} order={order} customer={customer} />
                        </div>
                        <Button variant="outline" onClick={() => handlePrint()}>
                            <Printer className="mr-2 h-4 w-4" /> Print Receipt
                        </Button>
                        <Button onClick={() => onOpenChange(false)}>Close</Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
