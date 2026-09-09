import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { toast } from "sonner";
import { safeLocalStorage, safeSessionStorage } from "@/lib/safeStorage";

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
  billingStatus?: "paid" | "pending" | "exempt" | "failed" | "cancelled";
  paidAmount?: number;
  paidAt?: string;
  paidUntil?: string;
  stripeCustomerId?: string;
  stripeSessionId?: string;
  isFullMember?: boolean;
  isLid?: boolean;
  membershipState?: "active" | "pending_24h" | "unpaid";
  hoursRemaining24h?: number;
  activatedAt?: string | null;
  membershipNotice?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (user: User, token: string, rememberMe?: boolean) => void;
  logout: () => void;
  updateUser: (partialUser: Partial<User>, newToken?: string) => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on mount (from localStorage or sessionStorage)
    const storedToken =
      safeLocalStorage.getItem("auth_token") || safeSessionStorage.getItem("auth_token");
    const storedUser =
      safeLocalStorage.getItem("auth_user") || safeSessionStorage.getItem("auth_user");
    
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

          // Valideer het token direct bij de backend
          fetch("/api/me", {
            headers: { Authorization: `Bearer ${storedToken}` },
          })
            .then((res) => {
              if (res.status === 401) {
                // Token is ongeldig of verlopen na bijv. een server herstart
                console.warn("[Auth] Sessietoken is verlopen of ongeldig, sessie gewist.");
                safeLocalStorage.removeItem("auth_token");
                safeLocalStorage.removeItem("auth_user");
                safeSessionStorage.removeItem("auth_token");
                safeSessionStorage.removeItem("auth_user");
                setToken(null);
                setUser(null);
              } else if (res.ok) {
                return res.json().then((freshData) => {
                  if (freshData?.user) {
                    setUser(freshData.user);
                    if (safeLocalStorage.getItem("auth_remember") === "true" || safeLocalStorage.getItem("auth_token")) {
                      safeLocalStorage.setItem("auth_user", JSON.stringify(freshData.user));
                    } else {
                      safeSessionStorage.setItem("auth_user", JSON.stringify(freshData.user));
                    }
                  }
                });
              }
            })
            .catch(() => {})
            .finally(() => {
              setLoading(false);
            });
          return;
        } else {
          throw new Error("Ongeldige gebruiker");
        }
      } catch (_error) {
        safeLocalStorage.removeItem("auth_token");
        safeLocalStorage.removeItem("auth_user");
        safeSessionStorage.removeItem("auth_token");
        safeSessionStorage.removeItem("auth_user");
      }
    } else if (storedToken === "undefined" || storedToken === "null") {
      safeLocalStorage.removeItem("auth_token");
      safeLocalStorage.removeItem("auth_user");
      safeSessionStorage.removeItem("auth_token");
      safeSessionStorage.removeItem("auth_user");
    }
    setLoading(false);
  }, []);

  const login = useCallback((userData: User, authToken: string, rememberMe = true) => {
    setUser(userData);
    setToken(authToken);

    if (rememberMe) {
      safeLocalStorage.setItem("auth_user", JSON.stringify(userData));
      safeLocalStorage.setItem("auth_token", authToken);
      safeLocalStorage.setItem("auth_remember", "true");
      safeSessionStorage.removeItem("auth_user");
      safeSessionStorage.removeItem("auth_token");
    } else {
      safeSessionStorage.setItem("auth_user", JSON.stringify(userData));
      safeSessionStorage.setItem("auth_token", authToken);
      safeLocalStorage.removeItem("auth_remember");
      safeLocalStorage.removeItem("auth_user");
      safeLocalStorage.removeItem("auth_token");
    }
  }, []);

  const updateUser = useCallback((partialUser: Partial<User>, newToken?: string) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...partialUser };
      if (safeLocalStorage.getItem("auth_token")) {
        safeLocalStorage.setItem("auth_user", JSON.stringify(updated));
      } else {
        safeSessionStorage.setItem("auth_user", JSON.stringify(updated));
      }
      return updated;
    });
    if (newToken) {
      setToken(newToken);
      if (safeLocalStorage.getItem("auth_token")) {
        safeLocalStorage.setItem("auth_token", newToken);
      } else {
        safeSessionStorage.setItem("auth_token", newToken);
      }
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    safeLocalStorage.removeItem("auth_user");
    safeLocalStorage.removeItem("auth_token");
    safeLocalStorage.removeItem("auth_remember");
    safeSessionStorage.removeItem("auth_user");
    safeSessionStorage.removeItem("auth_token");
    toast.success("U bent uitgelogd.");
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser, isAuthenticated: !!token, loading }}>
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
