"use client";
import { useEffect } from "react";
import confetti from "canvas-confetti";

interface Props {
  trigger: boolean;
  type?: "basic" | "fireworks" | "stars";
}

export function ConfettiBlast({ trigger, type = "basic" }: Props) {
  useEffect(() => {
    if (!trigger) return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) return;

    if (type === "fireworks") {
      const end = Date.now() + 2000;
      const frame = () => {
        confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors: ["#16a34a", "#fbbf24", "#ffffff"] });
        confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors: ["#16a34a", "#fbbf24", "#ffffff"] });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
    } else if (type === "stars") {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        shapes: ["star"],
        colors: ["#16a34a", "#fbbf24", "#84cc16"],
      });
    } else {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#16a34a", "#fbbf24", "#ffffff", "#86efac"],
      });
    }
  }, [trigger, type]);

  return null;
}
