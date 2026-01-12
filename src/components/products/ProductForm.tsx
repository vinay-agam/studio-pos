import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Product } from "@/db/db";
import { imageService } from "@/services/imageService";
import { useState, useEffect } from "react";
import { useAlert } from "@/context/AlertContext";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2, X, Plus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

const productSchema = z.object({
    title: z.string().min(2, "Title must be at least 2 characters."),
    sku: z.string().min(1, "SKU is required."),
    price: z.coerce.number().min(0, "Price must be a positive number."),
    inventory: z.coerce.number().min(0, "Inventory cannot be negative."),
    category: z.string().optional(),
    description: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface ProductFormProps {
    productId?: string;
}

export function ProductForm({ productId }: ProductFormProps) {
    const navigate = useNavigate();
    const { alert } = useAlert();
    const [imageId, setImageId] = useState<string | undefined>(undefined);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const [productType, setProductType] = useState<'simple' | 'variable'>('simple');
    const [variants, setVariants] = useState<{ id: string, title: string, price: number, inventory: number }[]>([]);

    // Form schema needs to handle variants now, but sticking to simple validation for base fields
    // We will validate variants manually before submit

    // Load product if editing
    const product = useLiveQuery(async () => {
        if (!productId) return null;
        return await db.products.get(productId);
    }, [productId]);

    const form = useForm<ProductFormValues>({
        resolver: zodResolver(productSchema) as any, // Relax type check for coercion
        defaultValues: {
            title: "",
            sku: "",
            price: 0,
            inventory: 0,
            category: "General",
            description: "",
        },
    });

    // Populate form when product loads
    useEffect(() => {
        if (product) {
            form.reset({
                title: product.title,
                sku: product.id,
                price: product.price,
                inventory: product.inventory,
                category: product.category,
                description: product.description
            });
            if (product.type) setProductType(product.type);
            if (product.variants) setVariants(product.variants);
            if (product.imageId) {
                setImageId(product.imageId);
                imageService.getImageUrl(product.imageId).then(setImageUrl);
            }
        }
    }, [product, form]);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const id = await imageService.saveImage(file);
            setImageId(id);
            const url = await imageService.getImageUrl(id);
            setImageUrl(url);

        } catch (err) {
            console.error(err);
            await alert("Failed to upload image", "Upload Error");
        } finally {
            setIsUploading(false);
        }
    };

    const removeImage = () => {
        setImageId(undefined);
        setImageUrl(null);
    };

    const addVariant = () => {
        setVariants([...variants, { id: crypto.randomUUID(), title: "", price: 0, inventory: 0 }]);
    };

    const removeVariant = (index: number) => {
        const newVariants = [...variants];
        newVariants.splice(index, 1);
        setVariants(newVariants);
    };

    const updateVariant = (index: number, field: keyof typeof variants[0], value: any) => {
        const newVariants = [...variants];
        newVariants[index] = { ...newVariants[index], [field]: value };
        setVariants(newVariants);
    };

    const onSubmit: SubmitHandler<ProductFormValues> = async (data) => {
        try {
            const calculatedInventory = productType === 'variable'
                ? variants.reduce((sum, v) => sum + (v.inventory || 0), 0)
                : data.inventory;

            const productData: Product = {
                id: data.sku,
                title: data.title,
                category: data.category || "General",
                price: data.price,
                inventory: calculatedInventory,
                tax: 0, // Default for now
                description: data.description,
                imageId: imageId,
                type: productType,
                variants: productType === 'variable' ? variants : undefined
            };

            await db.products.put(productData);
            navigate("/products");
        } catch (error) {
            console.error("Failed to save product:", error);

            await alert("Failed to save product. Ensure SKU is unique.", "Save Error");
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-2xl mx-auto p-4 md:p-6 bg-card rounded-lg border shadow-sm">

                <div className="flex flex-col sm:flex-row gap-4 p-4 border rounded-md bg-muted/20">
                    <Button
                        type="button"
                        variant={productType === 'simple' ? "default" : "outline"}
                        onClick={() => setProductType('simple')}
                        className="flex-1"
                    >
                        Simple Product
                    </Button>
                    <Button
                        type="button"
                        variant={productType === 'variable' ? "default" : "outline"}
                        onClick={() => setProductType('variable')}
                        className="flex-1"
                    >
                        Variable Product
                    </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                            <FormItem className="col-span-1 lg:col-span-2">
                                <FormLabel>Product Title</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g. Vintage Photo Frame" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="sku"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>SKU (Unique ID)</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g. FRAME-001" {...field} disabled={!!productId} />
                                </FormControl>
                                <FormDescription>Unique identifier for stock keeping.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Category</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g. Frames" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {productType === 'simple' && (
                        <>
                            <FormField
                                control={form.control}
                                name="price"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Price (₹)</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="inventory"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Inventory Count</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </>
                    )}

                    <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                            <FormItem className="col-span-1 lg:col-span-2">
                                <FormLabel>Description</FormLabel>
                                <FormControl>
                                    <Input placeholder="Product details..." {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                {/* Variants Section */}
                {productType === 'variable' && (
                    <div className="space-y-4 border p-4 rounded-md">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-semibold">Variants</h3>
                            <Button type="button" onClick={addVariant} size="sm" variant="secondary"><Plus className="mr-2 h-4 w-4" /> Add Variant</Button>
                        </div>
                        {variants.map((variant, index) => (
                            <div key={index} className="grid grid-cols-2 md:grid-cols-12 gap-3 md:gap-2 items-end pb-4 border-b md:border-0 last:border-0 mb-4 md:mb-0">
                                <div className="col-span-2 md:col-span-4">
                                    <FormLabel className="text-xs">Variant Name</FormLabel>
                                    <Input
                                        placeholder="e.g. Size 4x6"
                                        value={variant.title}
                                        onChange={(e) => updateVariant(index, 'title', e.target.value)}
                                    />
                                </div>
                                <div className="col-span-1 md:col-span-3">
                                    <FormLabel className="text-xs">Price</FormLabel>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={variant.price}
                                        onChange={(e) => updateVariant(index, 'price', parseFloat(e.target.value))}
                                    />
                                </div>
                                <div className="col-span-1 md:col-span-3">
                                    <FormLabel className="text-xs">Stock</FormLabel>
                                    <Input
                                        type="number"
                                        value={variant.inventory}
                                        onChange={(e) => updateVariant(index, 'inventory', parseInt(e.target.value))}
                                    />
                                </div>
                                <div className="col-span-2 md:col-span-2 flex justify-end md:justify-start mt-2 md:mt-0">
                                    <Button type="button" variant="destructive" size="icon" onClick={() => removeVariant(index)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Image Upload Section */}
                <div className="space-y-4">
                    <FormLabel>Product Image</FormLabel>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        {imageUrl ? (
                            <div className="relative w-32 h-32 border rounded-md overflow-hidden group">
                                <img src={imageUrl} alt="Product" className="w-full h-full object-cover" />
                                <button
                                    type="button"
                                    onClick={removeImage}
                                    className="absolute top-1 right-1 bg-destructive text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        ) : (
                            <div className="w-32 h-32 border border-dashed rounded-md flex items-center justify-center text-muted-foreground bg-muted/20">
                                <span>No Image</span>
                            </div>
                        )}
                        <div className="flex flex-col gap-2">
                            <Input
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                disabled={isUploading}
                                className="w-full max-w-xs"
                            />
                            {isUploading && <span className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</span>}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 sm:gap-4">
                    <Button type="button" variant="outline" onClick={() => navigate("/products")}>Cancel</Button>
                    <Button type="submit">Save Product</Button>
                </div>
            </form>
        </Form>
    );
}
