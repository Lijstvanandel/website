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
  billingStatus?: "paid" | "pending" | "exempt" | "failed" | "cancelled";
  paidAmount?: number;
  paidAt?: string;
  paidUntil?: string;
  stripeCustomerId?: string;
  stripeSessionId?: string;
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
      localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
    const storedUser =
      localStorage.getItem("auth_user") || sessionStorage.getItem("auth_user");
    
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
                localStorage.removeItem("auth_token");
                localStorage.removeItem("auth_user");
                sessionStorage.removeItem("auth_token");
                sessionStorage.removeItem("auth_user");
                setToken(null);
                setUser(null);
              } else if (res.ok) {
                return res.json().then((freshData) => {
                  if (freshData?.user) {
                    setUser(freshData.user);
                    if (localStorage.getItem("auth_remember") === "true" || localStorage.getItem("auth_token")) {
                      localStorage.setItem("auth_user", JSON.stringify(freshData.user));
                    } else {
                      sessionStorage.setItem("auth_user", JSON.stringify(freshData.user));
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
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_user");
        sessionStorage.removeItem("auth_token");
        sessionStorage.removeItem("auth_user");
      }
    } else if (storedToken === "undefined" || storedToken === "null") {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
      sessionStorage.removeItem("auth_token");
      sessionStorage.removeItem("auth_user");
    }
    setLoading(false);
  }, []);

  const login = useCallback((userData: User, authToken: string, rememberMe = true) => {
    setUser(userData);
    setToken(authToken);

    if (rememberMe) {
      localStorage.setItem("auth_user", JSON.stringify(userData));
      localStorage.setItem("auth_token", authToken);
      localStorage.setItem("auth_remember", "true");
      sessionStorage.removeItem("auth_user");
      sessionStorage.removeItem("auth_token");
    } else {
      sessionStorage.setItem("auth_user", JSON.stringify(userData));
      sessionStorage.setItem("auth_token", authToken);
      localStorage.removeItem("auth_remember");
      localStorage.removeItem("auth_user");
      localStorage.removeItem("auth_token");
    }
  }, []);

  const updateUser = useCallback((partialUser: Partial<User>, newToken?: string) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...partialUser };
      if (localStorage.getItem("auth_token")) {
        localStorage.setItem("auth_user", JSON.stringify(updated));
      } else {
        sessionStorage.setItem("auth_user", JSON.stringify(updated));
      }
      return updated;
    });
    if (newToken) {
      setToken(newToken);
      if (localStorage.getItem("auth_token")) {
        localStorage.setItem("auth_token", newToken);
      } else {
        sessionStorage.setItem("auth_token", newToken);
      }
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("auth_user");
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_remember");
    sessionStorage.removeItem("auth_user");
    sessionStorage.removeItem("auth_token");
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
