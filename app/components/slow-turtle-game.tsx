"use client";

import { Gauge, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const START_EVENT = "convertly:slow-start";
const END_EVENT = "convertly:slow-end";

export function useSlowOperation(active: boolean, id: string) {
  useEffect(() => {
    if (!active) return;
    let announced = false;
    const timer = window.setTimeout(() => {
      announced = true;
      window.dispatchEvent(new CustomEvent(START_EVENT, { detail: { id } }));
    }, 6000);
    return () => {
      window.clearTimeout(timer);
      if (announced) window.dispatchEvent(new CustomEvent(END_EVENT, { detail: { id } }));
    };
  }, [active, id]);
}

export default function SlowTurtleGame() {
  const [visible, setVisible] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [score, setScore] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const active = useRef(new Set<string>());
  const hideTimer = useRef<number | null>(null);
  const jumpRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (...args) => {
      const id = `fetch-${crypto.randomUUID()}`;
      let announced = false;
      const timer = window.setTimeout(() => {
        announced = true;
        window.dispatchEvent(new CustomEvent(START_EVENT, { detail: { id } }));
      }, 6000);
      try { return await originalFetch(...args); }
      finally {
        window.clearTimeout(timer);
        if (announced) window.dispatchEvent(new CustomEvent(END_EVENT, { detail: { id } }));
      }
    };
    return () => { window.fetch = originalFetch; };
  }, []);

  useEffect(() => {
    const start = (event: Event) => {
      const id = (event as CustomEvent<{ id: string }>).detail?.id;
      if (!id) return;
      const wasEmpty = active.current.size === 0;
      active.current.add(id);
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
      setFinishing(false); setDismissed(false); if (wasEmpty) setScore(0); setVisible(true);
    };
    const end = (event: Event) => {
      const id = (event as CustomEvent<{ id: string }>).detail?.id;
      if (id) active.current.delete(id);
      if (active.current.size === 0) {
        setFinishing(true);
        hideTimer.current = window.setTimeout(() => { setVisible(false); setFinishing(false); }, 1800);
      }
    };
    window.addEventListener(START_EVENT, start); window.addEventListener(END_EVENT, end);
    return () => { window.removeEventListener(START_EVENT, start); window.removeEventListener(END_EVENT, end); if (hideTimer.current) window.clearTimeout(hideTimer.current); };
  }, []);

  useEffect(() => {
    if (!visible || dismissed) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const context = canvas.getContext("2d"); if (!context) return;
    let frame = 0; let last = performance.now(); let turtleY = 58; let velocity = 0; let points = 0;
    const obstacles = [{ x: 610, width: 16, height: 22 }, { x: 920, width: 22, height: 15 }];
    const jump = () => { if (turtleY >= 57) velocity = -10.5; };
    jumpRef.current = jump;
    const key = (event: KeyboardEvent) => { if (event.code === "Space" && visible) { event.preventDefault(); jump(); } };
    window.addEventListener("keydown", key);
    const drawTurtle = (x: number, y: number) => {
      context.fillStyle = "#22c55e"; context.beginPath(); context.ellipse(x + 16, y, 16, 9, 0, 0, Math.PI * 2); context.fill();
      context.fillStyle = "#14532d"; context.beginPath(); context.ellipse(x + 15, y - 1, 11, 6, 0, 0, Math.PI * 2); context.fill();
      context.fillStyle = "#4ade80"; context.beginPath(); context.arc(x + 33, y - 1, 6, 0, Math.PI * 2); context.fill();
      context.fillStyle = "#111827"; context.fillRect(x + 35, y - 3, 1.8, 1.8);
      context.fillStyle = "#16a34a"; context.fillRect(x + 5, y + 6, 6, 3); context.fillRect(x + 23, y + 6, 6, 3);
    };
    const loop = (now: number) => {
      const delta = Math.min(2, (now - last) / 16.67); last = now;
      velocity += .62 * delta; turtleY = Math.min(58, turtleY + velocity * delta); if (turtleY === 58) velocity = 0;
      context.clearRect(0, 0, 620, 92);
      context.fillStyle = "#faf7ff"; context.fillRect(0, 0, 620, 92);
      context.strokeStyle = "#ddd6fe"; context.lineWidth = 2; context.beginPath(); context.moveTo(0, 75); context.lineTo(620, 75); context.stroke();
      context.fillStyle = "#ede9fe"; for (let x = -((now / 30) % 24); x < 620; x += 24) context.fillRect(x, 80, 12, 2);
      for (const obstacle of obstacles) {
        obstacle.x -= 4.2 * delta;
        if (obstacle.x < -30) { obstacle.x = 620 + Math.random() * 220; points += 1; setScore(points); }
        context.fillStyle = "#8b5cf6"; context.beginPath(); context.roundRect(obstacle.x, 75 - obstacle.height, obstacle.width, obstacle.height, 4); context.fill();
        const hit = 48 + 37 > obstacle.x && 48 < obstacle.x + obstacle.width && turtleY + 9 > 75 - obstacle.height;
        if (hit) { points = 0; setScore(0); obstacle.x = 650; }
      }
      drawTurtle(48, turtleY); frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("keydown", key); };
  }, [visible, dismissed]);

  const jump = useCallback(() => jumpRef.current(), []);
  if (!visible || dismissed) return null;
  return <aside className="fixed inset-x-4 bottom-4 z-[80] mx-auto max-w-2xl overflow-hidden rounded-2xl border border-violet-200 bg-white/95 shadow-2xl shadow-violet-950/15 backdrop-blur-xl" aria-live="polite">
    <div className="flex items-center justify-between gap-3 border-b border-violet-100 px-4 py-2.5">
      <div className="flex min-w-0 items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-violet-700"><Gauge className="h-4 w-4" /></span><p className="truncate text-sm font-semibold text-gray-900">{finishing ? "İşlem tamamlandı — kaplumbağa görevini yaptı!" : "Biraz kaplumbağa hızındayız… Beklerken zıpla!"}</p></div>
      <div className="flex items-center gap-3"><span className="text-xs font-semibold text-violet-700">Skor {score}</span><button onClick={() => setDismissed(true)} aria-label="Oyunu kapat" className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"><X className="h-4 w-4" /></button></div>
    </div>
    <button type="button" onClick={jump} className="block w-full cursor-pointer text-left" aria-label="Kaplumbağayı zıplat"><canvas ref={canvasRef} width={620} height={92} className="block h-[92px] w-full" /><span className="sr-only">Zıplamak için alana dokunun veya boşluk tuşuna basın.</span></button>
  </aside>;
}
