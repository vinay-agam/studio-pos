import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";

export default function LoginPage() {
    const { login } = useAuth();
    const [pin, setPin] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        if (await login(pin)) {
            navigate("/");
        } else {
            setError("Invalid PIN");
            setPin("");
        }
    };

    return (
        <div className="h-screen w-full flex items-center justify-center bg-muted/40">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Lock className="h-6 w-6 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl">StudioPOS Access</CardTitle>
                    <CardDescription>Enter your PIN to continue</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <Input
                            type="password"
                            placeholder="Enter PIN (e.g. 1234)"
                            value={pin}
                            onChange={(e) => setPin(e.target.value)}
                            className="text-center text-lg tracking-widest"
                            autoFocus
                        />
                        {error && <p className="text-sm text-destructive text-center">{error}</p>}
                        <Button type="submit" className="w-full" size="lg">
                            Login
                        </Button>
                        {/* <div className="text-xs text-center text-muted-foreground mt-4">
                            Default Admin PIN: 1234
                        </div> */}
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
