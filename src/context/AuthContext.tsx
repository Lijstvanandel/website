import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { toast } from "sonner";

export interface User {
  id: string;
  username: string;
  fullName: string;
  salutation?: string;
  address?: string;
  city?: string;
  email?: string;
  role?: string;
  isActive?: boolean;
  remarks?: string;
  directDebit?: boolean;
  newsletterSubscribed?: boolean;
  createdAt?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (partialUser: Partial<User>, newToken?: string) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is logged in on mount
    const storedToken = localStorage.getItem("auth_token");
    const storedUser = localStorage.getItem("auth_user");
    
    if (
      storedToken &&
      storedUser &&
      storedToken !== "undefined" &&
      storedToken !== "null" &&
      storedToken.trim() !== ""
    ) {
      try {
        const parsed = JSON.parse(storedUser);
        if (parsed && typeof parsed === "object") {
          setToken(storedToken);
          setUser(parsed);
        } else {
          throw new Error("Ongeldige gebruiker");
        }
      } catch (error) {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_user");
      }
    } else if (storedToken === "undefined" || storedToken === "null") {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
    }
  }, []);

  const login = useCallback((userData: User, authToken: string) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem("auth_user", JSON.stringify(userData));
    localStorage.setItem("auth_token", authToken);
  }, []);

  const updateUser = useCallback((partialUser: Partial<User>, newToken?: string) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...partialUser };
      localStorage.setItem("auth_user", JSON.stringify(updated));
      return updated;
    });
    if (newToken) {
      setToken(newToken);
      localStorage.setItem("auth_token", newToken);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("auth_user");
    localStorage.removeItem("auth_token");
    toast.success("U bent uitgelogd.");
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser, isAuthenticated: !!token }}>
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
