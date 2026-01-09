import { useState } from "react";
import { useAlert } from "@/context/AlertContext";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Product } from "@/db/db";
import { useNavigate } from "react-router-dom";
import { imageService } from "@/services/imageService";
import { useAuth } from "@/context/AuthContext";
import {
    type ColumnDef,
    type ColumnFiltersState,
    type SortingState,
    flexRender,
    getCoreRowModel,
    useReactTable,
    getPaginationRowModel,
    getFilteredRowModel,
    getSortedRowModel,
} from "@tanstack/react-table";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Edit, Trash2, Plus, Image as ImageIcon, Upload, Download, ArrowUpDown } from "lucide-react";
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
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Product
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => <span className="font-medium">{row.getValue("title")}</span>,
        },
        {
            accessorKey: "id",
            header: "SKU",
        },
        {
            accessorKey: "type",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Type
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const type = row.getValue("type") as string;
                return (
                    <div className="capitalize">
                        {type === "variable" ? "Variant" : "Single"}
                    </div>
                )
            },
        },
        {
            accessorKey: "category",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Category
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
        },
        {
            accessorKey: "price",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Price
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
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
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Stock
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
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
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [sorting, setSorting] = useState<SortingState>([]);

    const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));

    const table = useReactTable({
        data: products,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        state: {
            globalFilter,
            columnFilters,
            sorting,
        },
        onGlobalFilterChange: setGlobalFilter,
        onColumnFiltersChange: setColumnFilters,
        onSortingChange: setSorting,
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
                <Select
                    value={(table.getColumn("category")?.getFilterValue() as string) ?? "all"}
                    onValueChange={(value: string) =>
                        table.getColumn("category")?.setFilterValue(value === "all" ? undefined : value)
                    }
                >
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map((category) => (
                            <SelectItem key={category} value={category}>
                                {category}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select
                    value={(table.getColumn("type")?.getFilterValue() as string) ?? "all"}
                    onValueChange={(value: string) =>
                        table.getColumn("type")?.setFilterValue(value === "all" ? undefined : value)
                    }
                >
                    <SelectTrigger className="w-[180px] ml-2">
                        <SelectValue placeholder="Product Type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="simple">Single</SelectItem>
                        <SelectItem value="variable">Variant</SelectItem>
                    </SelectContent>
                </Select>
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
            <div className="flex items-center justify-between py-4">
                <div className="flex-1 text-sm text-muted-foreground mr-4">
                    Showing {table.getRowModel().rows.length} of {products.length} products
                </div>
                <div className="flex items-center space-x-6 lg:space-x-8">
                    <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium">Rows per page</p>
                        <Select
                            value={`${table.getState().pagination.pageSize}`}
                            onValueChange={(value: string) => {
                                table.setPageSize(Number(value))
                            }}
                        >
                            <SelectTrigger className="h-8 w-[70px]">
                                <SelectValue placeholder={table.getState().pagination.pageSize} />
                            </SelectTrigger>
                            <SelectContent side="top">
                                {[10, 20, 30, 40, 50].map((pageSize) => (
                                    <SelectItem key={pageSize} value={`${pageSize}`}>
                                        {pageSize}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                        Page {table.getState().pagination.pageIndex + 1} of{" "}
                        {table.getPageCount()}
                    </div>
                    <div className="flex items-center space-x-2">
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
            </div>
        </div>
    );
}
