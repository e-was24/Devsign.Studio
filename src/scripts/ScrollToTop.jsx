import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);

    const rootElement = document.getElementById("root");
    if (rootElement) {
        rootElement.scrollTop = 0;
    }

    const mainContainers = document.querySelectorAll("main, .app-container, .landing-page");
    mainContainers.forEach((container) => {
        container.scrollTop = 0;
    })
  }, [pathname]);

  return null
}
