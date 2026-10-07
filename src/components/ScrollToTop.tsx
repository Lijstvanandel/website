import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Only reset window scroll position to top when navigating to a different page/route (pathname change)
    // Do not scroll to top on in-page query string changes (such as selecting a topic, filter, or tab)
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant" as ScrollBehavior,
    });
  }, [pathname]);

  return null;
}
