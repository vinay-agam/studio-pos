import * as XLSX from 'xlsx';
import { type Product } from '@/db/db';

export interface ExcelProductRow {
    SKU: string;
    Title: string;
    Category?: string;
    Description?: string;
    Type?: 'simple' | 'variable';
    Price?: number;
    Stock?: number;
    'Variant Name'?: string;
    'Variant Price'?: number;
    'Variant Stock'?: number;
}

export const generateProductTemplate = () => {
    const headers = [
        'SKU', 'Title', 'Category', 'Description', 'Type', 'Price', 'Stock',
        'Variant Name', 'Variant Price', 'Variant Stock'
    ];

    const sampleData = [
        {
            SKU: 'SIMPLE-001',
            Title: 'Simple T-Shirt',
            Category: 'Apparel',
            Description: 'A comfortable cotton t-shirt',
            Type: 'simple',
            Price: 499,
            Stock: 100
        },
        {
            SKU: 'VAR-001',
            Title: 'Variable Hoodie',
            Category: 'Apparel',
            Description: 'Warm hoodie in multiple sizes',
            Type: 'variable',
            'Variant Name': 'Size S',
            'Variant Price': 899,
            'Variant Stock': 20
        },
        {
            SKU: 'VAR-001',
            Title: '', // Optional in subsequent rows for same SKU
            Category: '',
            Description: '',
            Type: 'variable',
            'Variant Name': 'Size M',
            'Variant Price': 899,
            'Variant Stock': 30
        }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData, { header: headers });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Products");
    XLSX.writeFile(wb, "product_template.xlsx");
};

export const parseProductExcel = async (file: File): Promise<Product[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];

                const jsonData = XLSX.utils.sheet_to_json<ExcelProductRow>(worksheet);
                const products = processExcelData(jsonData);
                resolve(products);
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
};

const processExcelData = (rows: ExcelProductRow[]): Product[] => {
    const productMap = new Map<string, Product>();

    for (const row of rows) {
        if (!row.SKU) continue;

        const sku = row.SKU.trim();

        if (!productMap.has(sku)) {
            // New product
            const baseProduct: Product = {
                id: sku,
                title: row.Title || 'Untitled Product',
                category: row.Category || 'General',
                description: row.Description || '',
                type: (row.Type?.toLowerCase() as 'simple' | 'variable') || 'simple',
                price: row.Price || 0,
                inventory: row.Stock || 0,
                tax: 0,
                variants: []
            };
            productMap.set(sku, baseProduct);
        }

        const product = productMap.get(sku)!;

        // If it's a variable product row with variant data
        if (product.type === 'variable' && row['Variant Name']) {
            if (!product.variants) product.variants = [];

            product.variants.push({
                id: crypto.randomUUID(),
                title: row['Variant Name'],
                price: row['Variant Price'] || product.price || 0,
                inventory: row['Variant Stock'] || 0
            });

            // Recalculate total inventory for variable product
            product.inventory = product.variants.reduce((sum, v) => sum + v.inventory, 0);
        }

        // Update base fields if they are better defined in this row (though usually first row has metadata)
        if (row.Title && !product.title) product.title = row.Title;
    }

    return Array.from(productMap.values());
};
