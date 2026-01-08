import React, { createContext, useContext, useState, useEffect } from "react";
import { db, type User } from "@/db/db";

interface AuthContextType {
    user: User | null;
    login: (pin: string) => Promise<boolean>;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Restore session from localStorage if exists
        const stored = localStorage.getItem("studio_user");
        if (stored) {
            setUser(JSON.parse(stored));
        }
        setIsLoading(false);
    }, []);

    const login = async (pin: string): Promise<boolean> => {
        // Find user by PIN (In a real app, hash this comparison!)
        const users = await db.users.toArray();
        const found = users.find(u => u.pinHash === pin);

        if (found) {
            setUser(found);
            localStorage.setItem("studio_user", JSON.stringify(found));
            return true;
        }
        return false;
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem("studio_user");
    };

    if (isLoading) return <div className="h-screen w-full flex items-center justify-center">Loading...</div>;

    return (
        <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
