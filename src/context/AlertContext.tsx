import { createContext, useContext, useState, type ReactNode } from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AlertOptions {
    title: string;
    message?: string;
    onConfirm?: () => void;
    variant?: 'default' | 'destructive'; // For styling confirm button
}

interface AlertContextType {
    alert: (title: string, message?: string) => Promise<void>;
    confirm: (title: string, message?: string, variant?: 'default' | 'destructive') => Promise<boolean>;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const useAlert = () => {
    const context = useContext(AlertContext);
    if (!context) {
        throw new Error("useAlert must be used within an AlertProvider");
    }
    return context;
};

export const AlertProvider = ({ children }: { children: ReactNode }) => {
    const [open, setOpen] = useState(false);
    const [config, setConfig] = useState<AlertOptions & { type: 'alert' | 'confirm', resolve: (value: any) => void } | null>(null);

    const alert = (title: string, message?: string) => {
        return new Promise<void>((resolve) => {
            setConfig({ title, message, type: 'alert', resolve });
            setOpen(true);
        });
    };

    const confirm = (title: string, message?: string, variant: 'default' | 'destructive' = 'default') => {
        return new Promise<boolean>((resolve) => {
            setConfig({ title, message, type: 'confirm', variant, resolve });
            setOpen(true);
        });
    };

    const handleClose = (result: boolean) => {
        setOpen(false);
        if (config) {
            config.resolve(result); // Resolve promise
            setTimeout(() => setConfig(null), 300); // Clear after animation
        }
    };

    return (
        <AlertContext.Provider value={{ alert, confirm }}>
            {children}
            {config && (
                <AlertDialog open={open} onOpenChange={(val) => !val && handleClose(false)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>{config.title}</AlertDialogTitle>
                            {config.message && (
                                <AlertDialogDescription>
                                    {config.message}
                                </AlertDialogDescription>
                            )}
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            {config.type === 'confirm' && (
                                <AlertDialogCancel onClick={() => handleClose(false)}>Cancel</AlertDialogCancel>
                            )}
                            <AlertDialogAction
                                onClick={() => handleClose(true)}
                                className={config.variant === 'destructive' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
                            >
                                {config.type === 'confirm' ? 'Confirm' : 'OK'}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </AlertContext.Provider>
    );
};
