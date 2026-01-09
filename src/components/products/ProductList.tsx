import { useState } from "react";
import { useAlert } from "@/context/AlertContext";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Product } from "@/db/db";
import { useNavigate } from "react-router-dom";
import { imageService } from "@/services/imageService";
import { useAuth } from "@/context/AuthContext";
import {
    type ColumnDef,
    flexRender,
    getCoreRowModel,
    useReactTable,
    getPaginationRowModel,
    getFilteredRowModel,
} from "@tanstack/react-table";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Edit, Trash2, Plus, Image as ImageIcon, Upload, Download } from "lucide-react";
import { parseProductExcel, generateProductTemplate } from "@/lib/excelService";
import { useRef } from "react";

// Image Thumbnail Component
const ProductThumbnail = ({ imageId }: { imageId?: string }) => {
    const [src, setSrc] = useState<string | null>(null);

    // Lazy load image
    useState(() => {
        if (imageId) {
            imageService.getImageUrl(imageId).then(setSrc);
        }
    });

    if (!imageId || !src) return <div className="w-10 h-10 bg-muted rounded-md flex items-center justify-center"><ImageIcon className="h-4 w-4 text-muted-foreground" /></div>;

    return <img src={src} alt="Thumb" className="w-10 h-10 object-cover rounded-md border" />;
}

export function ProductList() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const canEdit = user?.role === 'admin' || user?.role === 'manager';
    const { alert, confirm } = useAlert();

    const handleDelete = async (id: string) => {
        if (await confirm("Are you sure you want to delete this product?", "Delete Product", "destructive")) {
            await db.products.delete(id);
        }
    }

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const products = await parseProductExcel(file);
            console.log("Parsed products:", products);

            if (products.length === 0) {
                await alert("No valid products found in the file.", "Import Error");
                return;
            }

            // Bulk add/update to Dexie
            await db.products.bulkPut(products);
            await alert(`Successfully imported ${products.length} products!`, "Import Success");

            // Clear input
            if (fileInputRef.current) fileInputRef.current.value = "";

        } catch (error) {
            console.error("Import failed:", error);
            await alert("Failed to import products. Check console for details.", "Import Failed");
        }
    };

    const columns: ColumnDef<Product>[] = [
        {
            accessorKey: "imageId",
            header: "Image",
            cell: ({ row }) => <ProductThumbnail imageId={row.getValue("imageId")} />,
        },
        {
            accessorKey: "title",
            header: "Product",
            cell: ({ row }) => <span className="font-medium">{row.getValue("title")}</span>,
        },
        {
            accessorKey: "id",
            header: "SKU",
        },
        {
            accessorKey: "category",
            header: "Category",
        },
        {
            accessorKey: "price",
            header: "Price",
            cell: ({ row }) => {
                const amount = parseFloat(row.getValue("price"));
                const formatted = new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "INR",
                }).format(amount);
                return <div>{formatted}</div>;
            },
        },
        {
            accessorKey: "inventory",
            header: "Stock",
            cell: ({ row }) => <div className={row.getValue<number>("inventory") < 5 ? "text-red-500 font-bold" : ""}>{row.getValue("inventory")}</div>
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const product = row.original;

                if (!canEdit) return null;

                return (
                    <div className="flex gap-2 justify-end">
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/products/edit/${product.id}`)}>
                            <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(product.id)}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                );
            },
        },
    ];

    const products = useLiveQuery(() => db.products.toArray()) || [];
    const [globalFilter, setGlobalFilter] = useState("");

    const table = useReactTable({
        data: products,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        state: {
            globalFilter,
        },
        onGlobalFilterChange: setGlobalFilter,
    });

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <Input
                    placeholder="Search products..."
                    value={globalFilter ?? ""}
                    onChange={(event) => setGlobalFilter(event.target.value)}
                    className="max-w-sm"
                />
                {canEdit && (
                    <Button onClick={() => navigate("/products/new")}>
                        <Plus className="mr-2 h-4 w-4" /> Add Product
                    </Button>
                )}
                {canEdit && (
                    <div className="flex gap-2">
                        <input
                            type="file"
                            accept=".xlsx, .xls"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                        />
                        <Button variant="outline" onClick={() => generateProductTemplate()}>
                            <Download className="mr-2 h-4 w-4" /> Template
                        </Button>
                        <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                            <Upload className="mr-2 h-4 w-4" /> Import Excel
                        </Button>
                    </div>
                )}
            </div>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id}>
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                        </TableHead>
                                    );
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && "selected"}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext()
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="h-24 text-center"
                                >
                                    No products found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <div className="flex items-center justify-end space-x-2 py-4">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                >
                    Previous
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                >
                    Next
                </Button>
            </div>
        </div>
    );
}
