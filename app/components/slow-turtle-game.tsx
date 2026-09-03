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
    const width = canvas.width; const ground = 68;
    let frame = 0; let last = performance.now(); let turtleY = 51; let velocity = 0; let points = 0; let crashUntil = 0;
    const obstacles = [{ x: width * .58, width: 18, height: 24 }, { x: width * .84, width: 25, height: 17 }];
    const jump = () => { if (turtleY >= 50 && performance.now() > crashUntil) velocity = -10.5; };
    jumpRef.current = jump;
    const key = (event: KeyboardEvent) => { if (event.code === "Space" && visible) { event.preventDefault(); jump(); } };
    window.addEventListener("keydown", key);
    const drawTurtle = (x: number, y: number, crashed: boolean, now: number) => {
      const flash = crashed && Math.floor(now / 110) % 2 === 0;
      const step = Math.sin(now / 75) * 2.2;
      const bob = Math.abs(Math.sin(now / 150)) * 1.4;
      context.save();
      context.translate(0, -bob);
      if (crashed) { context.shadowColor = "#ef4444"; context.shadowBlur = flash ? 16 : 5; }
      context.fillStyle = crashed ? (flash ? "#ef4444" : "#fb7185") : "#22c55e"; context.beginPath(); context.ellipse(x + 18, y, 18, 10, 0, 0, Math.PI * 2); context.fill();
      context.fillStyle = crashed ? "#991b1b" : "#14532d"; context.beginPath(); context.ellipse(x + 17, y - 2, 12, 7, 0, 0, Math.PI * 2); context.fill();
      context.strokeStyle = crashed ? "#fecaca" : "#4ade80"; context.lineWidth = 1.3; context.beginPath(); context.moveTo(x + 8, y - 2); context.lineTo(x + 26, y - 2); context.moveTo(x + 17, y - 8); context.lineTo(x + 17, y + 4); context.stroke();
      context.fillStyle = crashed ? "#fca5a5" : "#4ade80"; context.beginPath(); context.arc(x + 37, y - 1, 6.5, 0, Math.PI * 2); context.fill();
      context.fillStyle = "#111827"; context.fillRect(x + 35, y - 3, 1.8, 1.8);
      context.fillStyle = crashed ? "#dc2626" : "#16a34a"; context.fillRect(x + 5 + step, y + 7, 7, 3); context.fillRect(x + 25 - step, y + 7, 7, 3);
      context.restore();
    };
    const loop = (now: number) => {
      const delta = Math.min(2, (now - last) / 16.67); last = now;
      velocity += .62 * delta; turtleY = Math.min(51, turtleY + velocity * delta); if (turtleY === 51) velocity = 0;
      context.clearRect(0, 0, width, 86);
      const sky = context.createLinearGradient(0, 0, 0, 86); sky.addColorStop(0, "#faf7ff"); sky.addColorStop(1, "#f0eaff"); context.fillStyle = sky; context.fillRect(0, 0, width, 86);
      context.fillStyle = "rgba(255,255,255,.72)";
      for (const cloud of [{ x: width * .18, y: 18 }, { x: width * .68, y: 25 }]) { const x = (cloud.x - now * .008 + width) % width; context.beginPath(); context.arc(x, cloud.y, 8, 0, Math.PI * 2); context.arc(x + 10, cloud.y - 4, 11, 0, Math.PI * 2); context.arc(x + 22, cloud.y, 8, 0, Math.PI * 2); context.fill(); }
      context.fillStyle = "rgba(196,181,253,.25)"; context.beginPath(); context.moveTo(0, ground); for (let x = 0; x <= width; x += 80) context.quadraticCurveTo(x + 40, 35 + (x % 160) / 8, x + 80, ground); context.lineTo(width, ground); context.closePath(); context.fill();
      context.strokeStyle = "#c4b5fd"; context.lineWidth = 2; context.beginPath(); context.moveTo(0, ground); context.lineTo(width, ground); context.stroke();
      context.fillStyle = "#ddd6fe"; context.beginPath(); for (let x = -((now / 15) % 28); x < width; x += 28) context.roundRect(x, 76, 15, 3, 2); context.fill();
      const turtleX = 76 + Math.sin(now / 620) * 24;
      for (const obstacle of obstacles) {
        obstacle.x -= 5.6 * delta;
        if (obstacle.x < -35) { obstacle.x = width + Math.random() * 260; points += 1; setScore(points); }
        const rock = context.createLinearGradient(obstacle.x, ground - obstacle.height, obstacle.x + obstacle.width, ground); rock.addColorStop(0, "#a78bfa"); rock.addColorStop(1, "#6d28d9"); context.fillStyle = rock; context.beginPath(); context.roundRect(obstacle.x, ground - obstacle.height, obstacle.width, obstacle.height, 5); context.fill();
        context.fillStyle = "rgba(255,255,255,.32)"; context.beginPath(); context.arc(obstacle.x + obstacle.width * .35, ground - obstacle.height * .65, 2.5, 0, Math.PI * 2); context.fill();
        const hit = turtleX + 42 > obstacle.x && turtleX < obstacle.x + obstacle.width && turtleY + 10 > ground - obstacle.height;
        if (hit && now > crashUntil) { crashUntil = now + 900; points = 0; setScore(0); obstacle.x = width + 120; velocity = -4; }
      }
      drawTurtle(turtleX, turtleY, now < crashUntil, now); frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("keydown", key); };
  }, [visible, dismissed]);

  const jump = useCallback(() => jumpRef.current(), []);
  if (!visible || dismissed) return null;
  return <aside className="fixed inset-x-0 bottom-0 z-[80] overflow-hidden rounded-t-2xl border-x-0 border-b-0 border-t border-violet-200 bg-white/95 shadow-[0_-16px_45px_rgba(76,29,149,.14)] backdrop-blur-xl" aria-live="polite">
    <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-2.5">
      <div className="flex min-w-0 items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-violet-700"><Gauge className="h-4 w-4" /></span><p className="truncate text-sm font-semibold text-gray-900">{finishing ? "Hazır! İşlemin başarıyla tamamlandı." : "Dosyan hazırlanıyor — beklerken küçük bir mola."}</p></div>
      <div className="flex items-center gap-3"><span className="text-xs font-semibold text-violet-700">Skor {score}</span><button onClick={() => setDismissed(true)} aria-label="Oyunu kapat" className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"><X className="h-4 w-4" /></button></div>
    </div>
    <button type="button" onClick={jump} className="block w-full cursor-pointer border-t border-violet-100 text-left" aria-label="Kaplumbağayı zıplat"><canvas ref={canvasRef} width={1600} height={86} className="block h-[86px] w-full" /><span className="sr-only">Zıplamak için alana dokunun veya boşluk tuşuna basın.</span></button>
  </aside>;
}
