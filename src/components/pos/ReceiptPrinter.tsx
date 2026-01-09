import React from "react";
import { type Customer, type Order, type Settings, db } from "@/db/db";
import { useLiveQuery } from "dexie-react-hooks";

interface ReceiptPrinterProps {
    order: Order;
    customer?: Customer | null;
}

// Ensure you export this component so other files can import it
export const ReceiptPrinter = React.forwardRef<HTMLDivElement, ReceiptPrinterProps>(({ order, customer }, ref) => {
    const settings = useLiveQuery(() => db.settings.get('general')) as Settings | undefined;

    return (
        <div ref={ref} className="hidden print:block p-8 font-mono text-black">
            {/* Header */}
            <div className="text-center mb-8">
                <h1 className="text-2xl font-bold">{settings?.storeName || "StudioPOS"}</h1>
                {settings?.address && <p>{settings.address}</p>}
                {settings?.email && <p>{settings.email}</p>}
                {settings?.phone && <p>Tel: {settings.phone}</p>}
            </div>

            {/* Order Info */}
            <div className="mb-6 border-b pb-4">
                <div className="flex justify-between">
                    <span>Order #:</span>
                    <span className="font-bold">{order.id.slice(0, 8).toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                    <span>Date:</span>
                    <span>{new Date(order.createdAt).toLocaleString()}</span>
                </div>
                {customer && (
                    <div className="mt-4 border-t pt-2 border-dashed">
                        <p className="font-bold uppercase text-xs text-gray-500 mb-1">Customer</p>
                        <div className="flex justify-between">
                            <p className="font-bold">{customer.name}</p>
                            {customer.phone && <p>Ph: {customer.phone}</p>}
                        </div>
                    </div>
                )}
            </div>

            {/* Items */}
            <table className="w-full mb-6">
                <thead>
                    <tr className="border-b">
                        <th className="text-left pb-2">Item</th>
                        <th className="text-right pb-2">Qty</th>
                        <th className="text-right pb-2">Price</th>
                    </tr>
                </thead>
                <tbody>
                    {order.items.map((item, index) => (
                        <tr key={index}>
                            <td className="py-2">
                                <div className="font-bold">{item.title}</div>
                                {item.variantName && <div className="text-xs">Option: {item.variantName}</div>}
                                <div className="text-xs text-gray-500">{item.sku}</div>
                            </td>
                            <td className="text-right py-2 align-top">{item.qty}</td>
                            <td className="text-right py-2 align-top">₹{(item.price * item.qty).toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Totals */}
            <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>₹{order.subtotal.toFixed(2)}</span>
                </div>
                {order.discount > 0 && (
                    <div className="flex justify-between text-sm">
                        <span>Discount</span>
                        <span>-₹{order.discount.toFixed(2)}</span>
                    </div>
                )}
                <div className="flex justify-between text-sm">
                    <span>Tax</span>
                    <span>₹{order.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-xl border-t pt-2 mt-2">
                    <span>Total</span>
                    <span>₹{order.total.toFixed(2)}</span>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-12 text-center text-sm">
                <p>Thank you for your business!</p>
                <p>Please keep this receipt for your records.</p>
            </div>

            {/* Production Ticket Section (Page Break for separate ticket if needed, currently inline for MVP) */}
            <div className="break-before-page mt-12 pt-8 border-t-4 border-black">
                <h2 className="text-center text-3xl font-black mb-4">PRODUCTION TICKET</h2>
                <div className="text-xl mb-4">
                    <span className="font-bold">Order:</span> {order.id.slice(0, 8).toUpperCase()}
                </div>
                {customer && (
                    <div className="mb-4">
                        <span className="font-bold">Client:</span> {customer.name}
                    </div>
                )}

                <ul className="space-y-6">
                    {order.items.map((item, index) => (
                        <li key={index} className="border-b border-dashed pb-4">
                            <div className="text-2xl font-bold">
                                {item.qty} x {item.title}
                            </div>
                            {item.variantName && (
                                <div className="text-xl font-semibold bg-gray-200 inline-block px-2">
                                    Option: {item.variantName}
                                </div>
                            )}
                            <div className="text-lg mt-1 text-gray-600">
                                SKU: {item.sku}
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
});

ReceiptPrinter.displayName = "ReceiptPrinter";
