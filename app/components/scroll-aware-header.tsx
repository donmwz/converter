"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export default function ScrollAwareHeader({ children, className = "" }: { children: ReactNode; className?: string }) {
  const [visible, setVisible] = useState(true);
  const previousY = useRef(0);

  useEffect(() => {
    previousY.current = window.scrollY;
    const onScroll = () => {
      const currentY = window.scrollY;
      const delta = currentY - previousY.current;
      if (currentY < 80 || delta < -4) setVisible(true);
      else if (currentY > 120 && delta > 8) setVisible(false);
      previousY.current = currentY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return <>
    <div aria-hidden="true" className="h-20" />
    <header className={`fixed inset-x-0 top-0 z-50 transition-transform duration-300 ease-out ${visible ? "translate-y-0" : "-translate-y-full"} ${className}`}>
      {children}
    </header>
  </>;
}
