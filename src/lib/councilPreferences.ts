import { useState, useEffect, useCallback } from "react";

export type PageSizeOption = 10 | 20 | 50;
export type SortByOption = "relevance" | "az" | "za" | "date_desc" | "date_asc";

export interface CouncilPreferences {
  pageSize: PageSizeOption;
  sortBy: SortByOption;
}

const STORAGE_KEY_PAGE_SIZE = "council_search_pageSize";
const STORAGE_KEY_SORT_BY = "council_search_sortBy";

const DEFAULT_PREFERENCES: CouncilPreferences = {
  pageSize: 10,
  sortBy: "relevance",
};

/**
 * Read preferences from localStorage safely
 */
export function getStoredCouncilPreferences(): CouncilPreferences {
  try {
    const rawPageSize = localStorage.getItem(STORAGE_KEY_PAGE_SIZE);
    const rawSortBy = localStorage.getItem(STORAGE_KEY_SORT_BY) as SortByOption | null;

    let pageSize: PageSizeOption = 10;
    if (rawPageSize === "20") pageSize = 20;
    else if (rawPageSize === "50") pageSize = 50;

    let sortBy: SortByOption = "relevance";
    if (rawSortBy && ["relevance", "az", "za", "date_desc", "date_asc"].includes(rawSortBy)) {
      sortBy = rawSortBy;
    }

    return { pageSize, sortBy };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

/**
 * Persist preferences to localStorage and server if authenticated
 */
export async function persistCouncilPreferences(
  updates: Partial<CouncilPreferences>,
  token?: string | null
): Promise<CouncilPreferences> {
  const current = getStoredCouncilPreferences();
  const merged: CouncilPreferences = { ...current, ...updates };

  try {
    localStorage.setItem(STORAGE_KEY_PAGE_SIZE, String(merged.pageSize));
    localStorage.setItem(STORAGE_KEY_SORT_BY, merged.sortBy);
  } catch (err) {
    console.error("Could not write to localStorage:", err);
  }

  // Dispatch event so all components update synchronously
  window.dispatchEvent(
    new CustomEvent("council-preferences-updated", { detail: merged })
  );

  // Sync with server if token is available
  const activeToken =
    token ||
    localStorage.getItem("auth_token") ||
    sessionStorage.getItem("auth_token") ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("token");

  if (activeToken) {
    try {
      fetch("/api/council/preferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${activeToken}`,
        },
        body: JSON.stringify(merged),
      }).catch(() => {
        // Background sync error, local state remains valid
      });
    } catch {
      // Ignore background network error
    }
  }

  return merged;
}

/**
 * React hook to access and manage council preferences
 */
export function useCouncilPreferences() {
  const [preferences, setPreferences] = useState<CouncilPreferences>(() =>
    getStoredCouncilPreferences()
  );

  useEffect(() => {
    // Initial fetch from backend if user logged in
    const activeToken =
      localStorage.getItem("auth_token") ||
      sessionStorage.getItem("auth_token") ||
      localStorage.getItem("token") ||
      sessionStorage.getItem("token");

    if (activeToken) {
      fetch("/api/council/preferences", {
        headers: { Authorization: `Bearer ${activeToken}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((serverPrefs) => {
          if (serverPrefs && serverPrefs.pageSize) {
            persistCouncilPreferences(serverPrefs);
          }
        })
        .catch(() => {});
    }

    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<CouncilPreferences>;
      if (customEvent.detail) {
        setPreferences(customEvent.detail);
      } else {
        setPreferences(getStoredCouncilPreferences());
      }
    };

    window.addEventListener("council-preferences-updated", handler);
    window.addEventListener("storage", handler);

    return () => {
      window.removeEventListener("council-preferences-updated", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const setPageSize = useCallback((size: PageSizeOption) => {
    setPreferences((prev) => ({ ...prev, pageSize: size }));
    persistCouncilPreferences({ pageSize: size });
  }, []);

  const setSortBy = useCallback((sort: SortByOption) => {
    setPreferences((prev) => ({ ...prev, sortBy: sort }));
    persistCouncilPreferences({ sortBy: sort });
  }, []);

  return {
    pageSize: preferences.pageSize,
    sortBy: preferences.sortBy,
    setPageSize,
    setSortBy,
  };
}
