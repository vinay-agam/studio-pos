import { Routes, Route } from "react-router-dom";
import { ProductList } from "@/components/products/ProductList";
import { ProductForm } from "@/components/products/ProductForm";

export default function ProductsPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Products</h2>
                    <p className="text-muted-foreground">Manage your studio inventory and services.</p>
                </div>
            </div>

            <Routes>
                <Route index element={<ProductList />} />
                <Route path="new" element={<ProductForm />} />
                <Route path="edit/:id" element={<EditProductWrapper />} />
            </Routes>
        </div>
    )
}

import { useParams } from "react-router-dom";
function EditProductWrapper() {
    const { id } = useParams();
    return <ProductForm productId={id} />;
}
