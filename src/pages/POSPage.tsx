import { CartPanel } from "@/components/pos/CartPanel";
import { ProductGrid } from "@/components/pos/ProductGrid";

export default function POSPage() {
    return (
        <div className="flex h-screen w-full bg-background overflow-none">
            {/* Left Side: Product Grid */}
            <div className="flex-1 h-full overflow-none">
                <ProductGrid />
            </div>

            {/* Right Side: Cart Panel */}
            <div className="w-[400px] h-full shadow-xl z-10">
                <CartPanel />
            </div>
        </div>
    );
}
