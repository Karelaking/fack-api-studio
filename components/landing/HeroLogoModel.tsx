"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

export interface HeroLogoModelProps {
  className?: string;
}

/**
 * Interactive 3D Model representing the official Fack API Logo Icon.
 *
 * Faithfully recreates "The Isometric Payload Stack" from public/logo.png:
 * - Geometric Alignment: Vertical side edges (100% vertical) with -26.565deg (1:2)
 *   top/bottom slopes via authentic isometric shearing (skewY(-26.565deg)).
 * - Exact Color Palette matching the official logo icon:
 *   • Plate 1 (Back): Matte slate grey (#70747d -> #464951)
 *   • Plate 2 (Middle): Neutral graphite grey (#8a8e97 -> #5a5e66)
 *   • Plate 3 (Front): Deep obsidian charcoal (#2d3038 -> #14161b)
 * - Emblem: Centered 4-pointed AI synthesis star (#ffffff) with hyperbolic curves,
 *   standing upright with vertical axis and sheared lateral tips.
 *
 * Features an authored assembly/building animation where the 3 plates fly in
 * along the 3D isometric axis and lock into the iconic emblem, with real-time
 * pointer 3D parallax tracking and accessible replay controls.
 */
export const HeroLogoModel = ({
  className,
}: HeroLogoModelProps): React.JSX.Element => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [isAssembled, setIsAssembled] = useState<boolean>(false);
  const [starLit, setStarLit] = useState<boolean>(false);
  const [prefersReducedMotion, setPrefersReducedMotion] =
    useState<boolean>(false);

  const targetRotRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const currentRotRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const rafIdRef = useRef<number | undefined>(undefined);
  const stepTiltRef = useRef<() => void>(() => {});

  // Physics loop writing 3D tilt directly to the stage DOM node (zero React re-renders)
  useEffect(() => {
    const stepTilt = (): void => {
      const factor = 0.12;
      currentRotRef.current.x +=
        (targetRotRef.current.x - currentRotRef.current.x) * factor;
      currentRotRef.current.y +=
        (targetRotRef.current.y - currentRotRef.current.y) * factor;

      if (stageRef.current) {
        const nextX = Number(currentRotRef.current.x.toFixed(2));
        const nextY = Number(currentRotRef.current.y.toFixed(2));
        stageRef.current.style.transform = `rotateX(${nextX}deg) rotateY(${nextY}deg)`;
      }

      const diff =
        Math.abs(targetRotRef.current.x - currentRotRef.current.x) +
        Math.abs(targetRotRef.current.y - currentRotRef.current.y);

      if (diff > 0.04) {
        rafIdRef.current = requestAnimationFrame(stepTilt);
      } else {
        rafIdRef.current = undefined;
      }
    };

    stepTiltRef.current = stepTilt;
    return () => {
      if (rafIdRef.current !== undefined) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = undefined;
      }
    };
  }, []);

  // Entrance assembly sequence & reduced-motion listener
  useEffect((): (() => void) => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = (e: MediaQueryListEvent): void => {
      setPrefersReducedMotion(e.matches);
      if (e.matches) {
        setIsAssembled(true);
        setStarLit(true);
        if (stageRef.current) {
          stageRef.current.style.transform = "rotateX(0deg) rotateY(0deg)";
        }
      }
    };
    mediaQuery.addEventListener("change", handleChange);

    if (mediaQuery.matches) {
      const reducedTimer = setTimeout((): void => {
        setPrefersReducedMotion(true);
        setIsAssembled(true);
        setStarLit(true);
      }, 0);
      return (): void => {
        clearTimeout(reducedTimer);
        mediaQuery.removeEventListener("change", handleChange);
      };
    }

    // Step 1: Trigger 3 plates assembly sequence
    const assembleTimer = setTimeout((): void => {
      setIsAssembled(true);
    }, 200);

    // Step 2: Ignite the white 4-pointed star once plates lock into place
    const starTimer = setTimeout((): void => {
      setStarLit(true);
    }, 750);

    return (): void => {
      clearTimeout(assembleTimer);
      clearTimeout(starTimer);
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>): void => {
      if (prefersReducedMotion || !containerRef.current) {
        return;
      }

      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        return;
      }

      const px = (event.clientX - rect.left) / rect.width - 0.5;
      const py = (event.clientY - rect.top) / rect.height - 0.5;

      // Subtle 3D tilt: ±14deg in X, ±16deg in Y creates parallax between the 3 layers
      targetRotRef.current = {
        x: -py * 14,
        y: px * 16,
      };

      if (rafIdRef.current === undefined) {
        rafIdRef.current = requestAnimationFrame(stepTiltRef.current);
      }
    },
    [prefersReducedMotion],
  );

  const handlePointerLeave = useCallback((): void => {
    // Smoothly settle back to 0, 0: the exact resting pose of the logo icon
    targetRotRef.current = { x: 0, y: 0 };
    if (rafIdRef.current === undefined) {
      rafIdRef.current = requestAnimationFrame(stepTiltRef.current);
    }
  }, []);

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={cn(
        "relative flex h-100 w-full max-w-115 select-none flex-col items-center justify-center sm:h-112.5 lg:h-120",
        className,
      )}
      style={{ perspective: "1200px" }}
      aria-label="Fack API Isometric Logo Model"
    >
      {/* Ambient Radial Spotlight echoing the logo presence */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
      >
        <div
          className={cn(
            "size-80 rounded-full blur-3xl transition-all duration-1000",
            isAssembled ? "bg-white/10 opacity-70" : "bg-white/5 opacity-30",
          )}
        />
        <div className="bg-primary/10 absolute size-64 translate-x-12 translate-y-8 rounded-full blur-2xl" />
      </div>

      {/* 3D Isometric Stage Container */}
      <div
        ref={stageRef}
        className="group relative flex size-full items-center justify-center transition-transform duration-150 ease-out"
        style={{
          transform: "rotateX(0deg) rotateY(0deg)",
          transformStyle: "preserve-3d",
        }}
      >
        {/* Scaled uniform container to guarantee exact pixel geometry across viewports */}
        <div
          className="xs:scale-[0.90] relative flex scale-[0.82] items-center justify-center sm:scale-100 lg:scale-[1.04]"
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* ========================================================= */}
          {/* PLATE 1 (BACK LAYER): MATTE SLATE GREY                    */}
          {/* Exact gradient and tone from logo.png: #70747d -> #464951 */}
          {/* ========================================================= */}
          <div
            className={cn(
              "absolute transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
            )}
            style={{
              transform: isAssembled
                ? "translate3d(-64px, -44px, -50px) scale(1)"
                : "translate3d(-150px, -100px, -130px) scale(0.90)",
              opacity: isAssembled ? 1 : 0.45,
              zIndex: 10,
              transformStyle: "preserve-3d",
            }}
          >
            <div
              className={cn(
                "relative h-46 w-54 rounded-[28px] border sm:rounded-[32px]",
                "border-white/18 shadow-[0_12px_24px_-6px_rgba(0,0,0,0.5)]",
              )}
              style={{
                transform: "skewY(-26.565deg)",
                transformOrigin: "center center",
                background:
                  "linear-gradient(135deg, #70747d 0%, #5d616a 50%, #464951 100%)",
              }}
            >
              {/* Subtle Top-Edge Specular Sheen */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-[32px] bg-linear-to-r from-transparent via-white/20 to-transparent" />
            </div>
          </div>

          {/* ========================================================= */}
          {/* PLATE 2 (MIDDLE LAYER): NEUTRAL GRAPHITE GREY             */}
          {/* Exact gradient and tone from logo.png: #8a8e97 -> #5a5e66 */}
          {/* ========================================================= */}
          <div
            className={cn(
              "absolute transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
            )}
            style={{
              transform: isAssembled
                ? "translate3d(0px, 0px, 0px) scale(1)"
                : "translate3d(-20px, 35px, -30px) scale(0.95)",
              opacity: isAssembled ? 1 : 0.7,
              zIndex: 20,
              transformStyle: "preserve-3d",
            }}
          >
            <div
              className={cn(
                "relative h-46 w-54 rounded-[28px] border sm:rounded-[32px]",
                "border-white/24 shadow-[0_18px_36px_-8px_rgba(0,0,0,0.65)]",
              )}
              style={{
                transform: "skewY(-26.565deg)",
                transformOrigin: "center center",
                background:
                  "linear-gradient(135deg, #8a8e97 0%, #757983 50%, #5a5e66 100%)",
              }}
            >
              {/* Subtle Top-Edge Specular Sheen */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-[32px] bg-linear-to-r from-transparent via-white/30 to-transparent" />
            </div>
          </div>

          {/* ========================================================= */}
          {/* PLATE 3 (FRONT LAYER): DEEP OBSIDIAN CHARCOAL + WHITE STAR*/}
          {/* Exact gradient and tone from logo.png: #2d3038 -> #14161b */}
          {/* ========================================================= */}
          <div
            className={cn(
              "absolute transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
            )}
            style={{
              transform: isAssembled
                ? "translate3d(64px, 44px, 50px) scale(1)"
                : "translate3d(145px, 95px, 140px) scale(1.08)",
              opacity: isAssembled ? 1 : 0.7,
              zIndex: 30,
              transformStyle: "preserve-3d",
            }}
          >
            <div
              className={cn(
                "relative h-46 w-54 rounded-[28px] border sm:rounded-[32px]",
                "border-white/30 shadow-[0_24px_48px_-10px_rgba(0,0,0,0.85),0_0_20px_rgba(0,0,0,0.45)]",
              )}
              style={{
                transform: "skewY(-26.565deg)",
                transformOrigin: "center center",
                background:
                  "linear-gradient(135deg, #2d3038 0%, #21232a 50%, #14161b 100%)",
              }}
            >
              {/* Top-Edge White Bevel Highlight */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-[32px] bg-linear-to-r from-transparent via-white/45 to-transparent" />

              {/* Centerpiece: The Official Pure White 4-Point AI Synthesis Star */}
              <div className="relative flex size-full items-center justify-center">
                {/* Ambient Star Glow */}
                <div
                  aria-hidden="true"
                  className={cn(
                    "absolute size-24 rounded-full blur-xl transition-all duration-700",
                    starLit
                      ? "scale-100 bg-white/35 opacity-100"
                      : "scale-50 bg-white/0 opacity-0",
                  )}
                />

                {/* High-Precision SVG Curved 4-Point Star geometry matching logo.png */}
                <svg
                  viewBox="0 0 100 100"
                  className={cn(
                    "size-14 transition-all duration-700 sm:size-16",
                    starLit
                      ? "scale-100 opacity-100 drop-shadow-[0_0_16px_rgba(255,255,255,0.85)]"
                      : "scale-65 opacity-25",
                  )}
                  fill="none"
                  aria-label="Fack API Star Emblem"
                >
                  {/* Star Outer Geometry: 4 concave hyperbolic curves */}
                  <path
                    d="M50 14 Q50 50 86 50 Q50 50 50 86 Q50 50 14 50 Q50 50 50 14 Z"
                    fill="#ffffff"
                  />
                  {/* Inner Specular Core */}
                  <path
                    d="M50 26 Q50 50 74 50 Q50 50 50 74 Q50 50 26 50 Q50 50 50 26 Z"
                    fill="#ffffff"
                    opacity="0.95"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
