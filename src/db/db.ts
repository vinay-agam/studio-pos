import Dexie, { type EntityTable } from 'dexie';

// Define Interface for Product
export interface ProductVariant {
    id: string;
    title: string;
    price: number;
    inventory: number;
}

export interface Product {
    id: string; // SKU or UUID
    title: string;
    category: string;
    price: number; // Base price
    tax: number;
    inventory: number; // Base inventory
    imageId?: string; // Reference to Image ID
    type?: 'simple' | 'variable';
    variants?: ProductVariant[];
    description?: string;
}

export interface ImageAsset {
    id: string;
    blob: Blob;
    mimeType: string;
}

export interface Customer {
    id: string;
    name: string;
    phone: string;
    email: string;
    address: string;
}

export interface Order {
    id: string;
    customerId?: string;
    createdAt: string;
    subtotal: number;
    discount: number; // Calculated value
    discountType: 'amount' | 'percent'; // Metadata
    discountValue: number; // Raw input (e.g., 10 for 10%)
    tax: number;
    total: number;
    status: 'draft' | 'completed' | 'cancelled';
    paymentMethod?: 'cash' | 'card' | 'upi';
    items: OrderItem[];
}

export interface OrderItem {
    sku: string;
    title: string;
    price: number;
    qty: number;
    variantName?: string;
}

export interface Settings {
    id: 'general';
    storeName: string;
    address: string;
    phone: string;
    email: string;
    taxRate: number; // Percentage (e.g., 0.08 for 8%)
}

export interface User {
    id: string; // pin hash
    name: string;
    role: 'admin' | 'manager' | 'cashier' | 'production';
    pinHash: string; // For MVP, simple PIN
}

export interface AuditLog {
    id: string;
    action: string;
    userId: string;
    details: string;
    timestamp: string;
}

export class MyDatabase extends Dexie {
    products!: EntityTable<Product, 'id'>;
    customers!: EntityTable<Customer, 'id'>;
    orders!: EntityTable<Order, 'id'>;
    settings!: EntityTable<Settings, 'id'>;
    users!: EntityTable<User, 'id'>;
    images!: EntityTable<ImageAsset, 'id'>;
    audit_logs!: EntityTable<AuditLog, 'id'>;

    constructor() {
        super('StudioPOS');
        this.version(1).stores({
            products: 'id, title, category, type',
            customers: 'id, name, phone, email',
            orders: 'id, customerId, createdAt, status',
            settings: 'id',
            users: 'id, role',
            images: 'id',
            audit_logs: '++id, userId, timestamp'
        });

        // Seed default users
        this.on("populate", () => {
            this.users.add({
                id: "u_admin",
                name: "Administrator",
                role: "admin",
                pinHash: "1234"
            });
            this.users.add({
                id: "u_cashier",
                name: "Cashier",
                role: "cashier",
                pinHash: "0000"
            });
        });
    }
}

export const db = new MyDatabase();

// Seed initial settings if empty outside of populate (for schema update simulation)
db.on('ready', async () => {
    const count = await db.settings.count();
    if (count === 0) {
        await db.settings.add({
            id: 'general',
            storeName: 'My Creative Studio',
            address: '123 Main St, City',
            phone: '(555) 123-4567',
            email: 'hello@mystudio.com',
            taxRate: 0
        });
    }
});

export const resetDatabase = async () => {
    await db.delete();
    await db.open();
}
