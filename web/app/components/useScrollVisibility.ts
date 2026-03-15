"use client";

import { useEffect, useState } from "react";

const TOP_OFFSET = 16;
const SCROLL_DELTA = 8;

export default function useScrollVisibility() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    let lastScrollY = window.scrollY;

    function handleScroll() {
      const currentScrollY = window.scrollY;
      const scrollDifference = currentScrollY - lastScrollY;

      if (Math.abs(scrollDifference) < SCROLL_DELTA) {
        return;
      }

      if (currentScrollY <= TOP_OFFSET) {
        setIsVisible(true);
      } else {
        setIsVisible(scrollDifference < 0);
      }

      lastScrollY = currentScrollY;
    }

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return isVisible;
}
