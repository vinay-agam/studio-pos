import React, { createContext, useContext, useEffect, useState } from "react";
import { db, type Product, type Customer } from "@/db/db";

export interface CartItem extends Product {
    quantity: number;
    variantId?: string;
    variantName?: string;
}

interface CartContextType {
    items: CartItem[];
    customer: Customer | null;
    setCustomer: (customer: Customer | null) => void;
    addToCart: (product: Product, variantId?: string, variantName?: string, priceOverride?: number) => void;
    removeFromCart: (productId: string, variantId?: string) => void;
    updateQuantity: (productId: string, quantity: number, variantId?: string) => void;
    clearCart: () => void;

    // Financials
    subtotal: number;
    discount: number; // The calculated amount
    discountValue: number; // The input value
    discountType: 'amount' | 'percent';
    setDiscountValue: (val: number) => void;
    setDiscountType: (type: 'amount' | 'percent') => void;

    taxRate: number;
    tax: number;
    total: number;

    loadOrder: (order: any) => void;
    saveDraft: () => Promise<void>;
    currentOrderId: string | null;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {


    const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);

    const [items, setItems] = useState<CartItem[]>(() => {
        const saved = localStorage.getItem("cart_items");
        return saved ? JSON.parse(saved) : [];
    });

    const [customer, setCustomer] = useState<Customer | null>(null);
    const [discountValue, setDiscountValue] = useState(0);
    const [discountType, setDiscountType] = useState<'amount' | 'percent'>('amount');
    const [taxRate, setTaxRate] = useState(0);

    // Initial Load Settings
    useEffect(() => {
        db.settings.get('general').then(settings => {
            if (settings && settings.taxRate) {
                setTaxRate(settings.taxRate);
            }
        });
    }, []);

    // Persist to local storage
    useEffect(() => {
        localStorage.setItem("cart_items", JSON.stringify(items));
    }, [items]);

    const addToCart = (product: Product, variantId?: string, variantName?: string, priceOverride?: number) => {
        setItems((prev) => {
            // Find existing item with same ID AND same Variant ID
            const existing = prev.find((item) => item.id === product.id && item.variantId === variantId);

            if (existing) {
                return prev.map((item) =>
                    item.id === product.id && item.variantId === variantId
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prev, { ...product, quantity: 1, variantId, variantName, price: priceOverride ?? product.price }];
        });
    };

    const removeFromCart = (productId: string, variantId?: string) => {
        setItems((prev) => prev.filter((item) => !(item.id === productId && item.variantId === variantId)));
    };

    const updateQuantity = (productId: string, quantity: number, variantId?: string) => {
        if (quantity <= 0) {
            removeFromCart(productId, variantId);
            return;
        }
        setItems((prev) =>
            prev.map((item) =>
                item.id === productId && item.variantId === variantId ? { ...item, quantity } : item
            )
        );
    };

    const clearCart = () => {
        setItems([]);
        setCustomer(null);
        setDiscountValue(0);
        setDiscountType('amount');
        setCurrentOrderId(null);
        localStorage.removeItem("cart_items");
    };

    const loadOrder = (order: any) => {
        // Map order items to CartItems
        const cartItems: CartItem[] = order.items.map((item: any) => ({
            id: item.sku, // Map sku back to id
            title: item.title,
            price: item.price,
            quantity: item.qty,
            variantName: item.variantName,
            // variantId might be lost if not stored in OrderItem. 
            // For MVP, we assume SKU is enough or we rely on variantName for display.
            category: 'Unknown', // Metadata lost, usually fine for cart logic
            type: 'simple',
            inventory: 999
        }));

        setItems(cartItems);
        if (order.customerId) {
            db.customers.get(order.customerId).then(c => {
                if (c) setCustomer(c);
            });
        } else {
            setCustomer(null);
        }
        setDiscountValue(order.discountValue || order.discount || 0);
        setDiscountType(order.discountType || 'amount');
        setCurrentOrderId(order.id);
    };

    const subtotal = items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
    );

    // Dynamic Discount Calculation
    const discount = discountType === 'amount'
        ? discountValue
        : (subtotal * (discountValue / 100));

    const taxableAmount = Math.max(0, subtotal - discount);
    const tax = taxableAmount * taxRate;
    const total = taxableAmount + tax;

    const saveDraft = async () => {
        if (items.length === 0) return;
        const draftId = currentOrderId || crypto.randomUUID();
        const order: any = {
            id: draftId,
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
            discountType,
            discountValue,
            tax,
            status: "draft",
            createdAt: new Date().toISOString()
        };
        await db.orders.put(order); // Put handles add or update
        setCurrentOrderId(draftId);
        clearCart();
    };

    return (
        <CartContext.Provider
            value={{
                items,
                customer,
                setCustomer,
                addToCart,
                removeFromCart,
                updateQuantity,
                clearCart,
                subtotal,
                discount, // Measured amount
                discountValue,
                discountType,
                setDiscountValue,
                setDiscountType,
                taxRate,
                tax,
                total,
                loadOrder,
                saveDraft,
                currentOrderId
            }}
        >
            {children}
        </CartContext.Provider>
    );

}

export function useCart() {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error("useCart must be used within a CartProvider");
    }
    return context;
}
