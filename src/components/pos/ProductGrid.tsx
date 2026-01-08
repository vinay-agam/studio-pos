import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Product } from "@/db/db";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useCart } from "@/context/CartContext";
import { Search, Image as ImageIcon } from "lucide-react";
import { imageService } from "@/services/imageService";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// Helper component for thumbnail (reused logic, could be extracted)
const ProductThumbnail = ({ imageId }: { imageId?: string }) => {
    const [src, setSrc] = useState<string | null>(null);

    useState(() => {
        if (imageId) {
            imageService.getImageUrl(imageId).then(setSrc);
        }
    });

    if (!imageId || !src) return <div className="w-full h-32 bg-muted rounded-md flex items-center justify-center mb-2"><ImageIcon className="h-8 w-8 text-muted-foreground" /></div>;

    return <img src={src} alt="Product" className="w-full h-32 object-cover rounded-md mb-2" />;
};

export function ProductGrid() {
    const { addToCart } = useCart();
    const [search, setSearch] = useState("");
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isVariantDialogOpen, setIsVariantDialogOpen] = useState(false);

    const products = useLiveQuery(async () => {
        const all = await db.products.toArray();
        if (!search) return all;
        const lower = search.toLowerCase();
        return all.filter(p =>
            p.title.toLowerCase().includes(lower) ||
            p.id.toLowerCase().includes(lower) ||
            (p.category && p.category.toLowerCase().includes(lower))
        );
    }, [search]) || [];

    const handleProductClick = (product: Product) => {
        if (product.type === 'variable' && product.variants && product.variants.length > 0) {
            setSelectedProduct(product);
            setIsVariantDialogOpen(true);
        } else {
            addToCart(product);
        }
    };

    const handleVariantSelect = (variantId: string) => {
        if (selectedProduct && selectedProduct.variants) {
            const variant = selectedProduct.variants.find(v => v.id === variantId);
            if (variant) {
                // Determine price to use: variant price overrides base price
                const price = variant.price > 0 ? variant.price : selectedProduct.price;
                addToCart(selectedProduct, variant.id, variant.title, price);
                setIsVariantDialogOpen(false);
                setSelectedProduct(null);
            }
        }
    };

    return (
        <div className="flex flex-col h-full gap-4 p-4">
            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Search by name, SKU, or category..."
                    className="pl-8"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pb-20">
                {products.map((product) => (
                    <Card
                        key={product.id}
                        className="cursor-pointer hover:border-primary transition-colors flex flex-col justify-between"
                        onClick={() => handleProductClick(product)}
                    >
                        <CardHeader className="p-4 pb-2">
                            <ProductThumbnail imageId={product.imageId} />
                            <CardTitle className="text-base line-clamp-2">{product.title}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 text-sm text-muted-foreground">
                            SKU: {product.id}
                            {product.type === 'variable' && <span className="ml-2 bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded text-xs">Options</span>}
                        </CardContent>
                        <CardFooter className="p-4 pt-0 font-bold text-lg">
                            ₹{product.price.toFixed(2)}
                            {product.type === 'variable' && "+"}
                        </CardFooter>
                    </Card>
                ))}
                {products.length === 0 && (
                    <div className="col-span-full text-center text-muted-foreground py-10">
                        No products found.
                    </div>
                )}
            </div>

            <Dialog open={isVariantDialogOpen} onOpenChange={setIsVariantDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Select Option</DialogTitle>
                        <DialogDescription>
                            {selectedProduct?.title}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        {selectedProduct?.variants?.map(variant => (
                            <Button key={variant.id} variant="outline" className="justify-between h-auto py-3" onClick={() => handleVariantSelect(variant.id)}>
                                <span>{variant.title}</span>
                                <span className="font-bold">₹{variant.price.toFixed(2)}</span>
                            </Button>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
