import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Trash2, Plus, Minus, ShoppingCart } from "lucide-react";
import { CheckoutDialog } from "./CheckoutDialog";
import { CustomerSelect } from "./CustomerSelect";

export function CartPanel() {
    const { items, removeFromCart, updateQuantity, subtotal, discount, setDiscount, tax, taxRate, total, clearCart, customer, setCustomer } = useCart();

    if (items.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-8 text-muted-foreground border-l bg-muted/10">
                <ShoppingCart className="h-12 w-12 mb-4 opacity-20" />
                <p>Cart is empty</p>
                <p className="text-sm">Scan items or select from grid</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full border-l bg-card">
            {/* Header */}
            <div className="p-4 border-b space-y-3 bg-muted/40">
                <div className="flex justify-between items-center">
                    <h2 className="font-semibold text-lg flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5" /> Current Sale
                    </h2>
                    <Button variant="ghost" size="sm" onClick={clearCart} className="text-destructive hover:text-destructive">
                        Clear
                    </Button>
                </div>
                <CustomerSelect onSelect={setCustomer} selectedId={customer?.id} />
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {items.map((item) => (
                    <div key={`${item.id}-${item.variantId || 'base'}`} className="flex gap-3 items-start">
                        <div className="flex-1 space-y-1">
                            <h4 className="font-medium text-sm line-clamp-2">
                                {item.title}
                                {item.variantName && <span className="text-muted-foreground ml-1">({item.variantName})</span>}
                            </h4>
                            <p className="text-xs text-muted-foreground">{item.id}</p>
                            <div className="font-semibold text-sm">
                                ${(item.price * item.quantity).toFixed(2)}
                            </div>
                        </div>

                        <div className="flex items-center gap-1 border rounded-md">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-none"
                                onClick={() => updateQuantity(item.id, item.quantity - 1, item.variantId)}
                            >
                                <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-none"
                                onClick={() => updateQuantity(item.id, item.quantity + 1, item.variantId)}
                            >
                                <Plus className="h-3 w-3" />
                            </Button>
                        </div>

                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => removeFromCart(item.id, item.variantId)}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
            </div>

            {/* Totals Section */}
            <div className="p-4 border-t bg-muted/40 space-y-3">
                <div className="flex justify-between text-sm items-center">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-sm items-center">
                    <span className="text-muted-foreground">Discount</span>
                    <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">-</span>
                        <div className="relative w-20">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                            <input
                                type="number"
                                min="0"
                                className="w-full h-8 pl-5 pr-2 rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                                value={discount > 0 ? discount : ''}
                                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                                placeholder="0.00"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax ({(taxRate * 100).toFixed(0)}%)</span>
                    <span>${tax.toFixed(2)}</span>
                </div>

                <Separator />

                <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                </div>

                <CheckoutDialog total={total} disabled={items.length === 0} />
            </div>
        </div>
    );
}
