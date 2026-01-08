import { type Product } from "@/db/db";

export const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(","),
        ...data.map(row => headers.map(fieldName => {
            let value = row[fieldName];

            // Handle Objects and Arrays (like items or variants)
            if (typeof value === 'object' && value !== null) {
                // If it looks like a date (roughly), keep simpler ISO string or just JSON it
                // But for generic objects, JSON.stringify is safest to avoid [object Object]
                value = JSON.stringify(value);
            } else {
                value = String(value ?? ""); // Handle null/undefined
            }

            // Escape double quotes by doubling them
            value = value.replace(/"/g, '""');

            // Quote the field if it contains comma, quote, or newline
            if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                return `"${value}"`;
            }
            return value;
        }).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

export const importProductsFromCSV = (csvText: string): Partial<Product>[] => {
    const lines = csvText.split("\n");
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map(h => h.trim());
    const products: Partial<Product>[] = [];

    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;

        // Simple CSV splitter, doesn't handle quoted commas perfectly but good for MVP
        const values = lines[i].split(",");
        const product: any = {};

        headers.forEach((header, index) => {
            let value = values[index]?.trim();
            // Basic type inference
            if (header === "price" || header === "inventory") {
                product[header] = parseFloat(value) || 0;
            } else {
                product[header] = value;
            }
        });

        if (product.title) { // Minimal validation
            products.push(product);
        }
    }
    return products;
};
