import { useState } from "react";
import { Check, ChevronsUpDown, Plus, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Customer } from "@/db/db";

interface CustomerSelectProps {
    onSelect: (customer: Customer | null) => void;
    selectedId?: string;
}

export function CustomerSelect({ onSelect, selectedId }: CustomerSelectProps) {
    const [open, setOpen] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [newCustomerName, setNewCustomerName] = useState("");
    const [newCustomerPhone, setNewCustomerPhone] = useState("");

    const customers = useLiveQuery(() => db.customers.toArray()) || [];
    const selectedCustomer = customers.find(c => c.id === selectedId);

    const handleCreateCustomer = async () => {
        if (!newCustomerName) return;
        const newId = crypto.randomUUID();
        const customer: Customer = {
            id: newId,
            name: newCustomerName,
            phone: newCustomerPhone,
            email: "",
            address: ""
        };
        await db.customers.add(customer);
        onSelect(customer);
        setDialogOpen(false);
        setNewCustomerName("");
        setNewCustomerPhone("");
    };

    return (
        <div className="flex gap-2">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between"
                    >
                        {selectedCustomer ? (
                            <div className="flex items-center gap-2">
                                <UserIcon className="h-4 w-4" />
                                <div className="flex flex-col items-start text-xs">
                                    <span className="font-semibold">{selectedCustomer.name}</span>
                                    {selectedCustomer.phone && <span className="text-muted-foreground">{selectedCustomer.phone}</span>}
                                </div>
                            </div>
                        ) : (
                            "Select Customer..."
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0">
                    <Command>
                        <CommandInput placeholder="Search customer..." />
                        <CommandList>
                            <CommandEmpty>No customer found.</CommandEmpty>
                            <CommandGroup>
                                {customers.map((customer) => (
                                    <CommandItem
                                        key={customer.id}
                                        value={`${customer.name} ${customer.phone}`}
                                        onSelect={() => {
                                            onSelect(customer.id === selectedId ? null : customer);
                                            setOpen(false);
                                        }}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                selectedId === customer.id ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        <div className="flex flex-col">
                                            <span>{customer.name}</span>
                                            <span className="text-xs text-muted-foreground">{customer.phone}</span>
                                        </div>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" size="icon">
                        <Plus className="h-4 w-4" />
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New Customer</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Name</Label>
                            <Input id="name" value={newCustomerName} onChange={e => setNewCustomerName(e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="phone">Phone</Label>
                            <Input id="phone" value={newCustomerPhone} onChange={e => setNewCustomerPhone(e.target.value)} />
                        </div>
                        <Button onClick={handleCreateCustomer}>Save Customer</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
