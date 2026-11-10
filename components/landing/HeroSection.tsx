import React from "react";
import { ArrowDown } from "lucide-react";
import { RiGithubFill } from "@remixicon/react";
import { CollaborateButton } from "@/components/landing/CollaborateButton";
import { HeroMotion } from "@/components/landing/HeroMotion";
import { HeroLogoModel } from "@/components/landing/HeroLogoModel";

/**
 * The landing hero: one viewport of type, air, and the interactive isometric logo model.
 *
 * Composition pairs bold display type on the left with an interactive 3D model
 * of Fack API's Isometric Payload Stack on the right, featuring an authored
 * building/assembly animation, dynamic pointer tilt, and docking tech satellites.
 */
export const HeroSection = (): React.JSX.Element => {
  return (
    <HeroMotion>
      <section
        id="hero"
        aria-label="Hero Introduction"
        className="hero-atmosphere border-border/40 bg-background relative isolate -mt-20 w-full overflow-hidden border-b pt-20"
      >
        {/* Pointer-tracked atmosphere, clipped to the same max-w-7xl column that
            draws the hero's side borders. Static — no JS, reduced motion, or a
            pointer that never moves — it rests composed around 68% / 34%. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 mx-auto max-w-7xl overflow-hidden"
        >
          <div className="hero-grid absolute inset-0" />
          <div className="hero-spotlight absolute inset-0" />
        </div>

        <div className="border-border/40 relative z-10 mx-auto flex min-h-[calc(100svh-5rem)] w-full max-w-7xl flex-col border-x px-4 sm:px-6 lg:px-8">
          <div className="flex flex-1 flex-col items-center justify-center gap-8 py-10 sm:py-14 lg:flex-row lg:items-center lg:justify-between lg:gap-4 lg:py-16 xl:gap-8">
            <div className="flex flex-col justify-center">
              <h1 className="font-display text-foreground text-[clamp(2rem,9vw,5rem)] leading-[0.92] font-medium tracking-[-0.045em]">
                <span className="hero-line block whitespace-nowrap">
                  Design the mock API
                </span>
                <span className="hero-line hero-line--2 block whitespace-nowrap">
                  on a canvas.
                </span>
                <span className="hero-line hero-line--3 text-muted-foreground mt-[0.14em] block whitespace-nowrap">
                  Serve it from your
                </span>
                <span className="hero-line hero-line--4 text-muted-foreground block whitespace-nowrap">
                  own machine.
                </span>
              </h1>

              <p className="hero-tier hero-tier--lead text-muted-foreground mt-6 max-w-[38ch] text-base leading-relaxed text-pretty sm:mt-8 sm:text-lg">
                Build and test independently of a backend that is not ready.
              </p>

              <div className="hero-tier hero-tier--actions mt-7 flex flex-col items-start gap-3 sm:mt-9 sm:flex-row sm:items-center sm:gap-4">
                <CollaborateButton
                  href="/dashboard"
                  label="Open the canvas"
                  size="lg"
                  className="w-full sm:w-auto"
                />
                <a
                  href="https://github.com/Karelaking/fack-api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group border-border/40 text-foreground hover:border-border hover:bg-muted/50 focus-visible:ring-ring/50 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border px-6 text-sm font-semibold transition-colors focus-visible:ring-3 focus-visible:outline-none sm:w-auto"
                >
                  <RiGithubFill
                    className="size-4 transition-transform duration-300 group-hover:-rotate-6"
                    aria-hidden="true"
                  />
                  <span>View the source</span>
                </a>
              </div>
            </div>

            <div className="hero-tier hero-tier--actions flex shrink-0 items-center justify-center lg:-translate-x-42 xl:-translate-x-58">
              <HeroLogoModel />
            </div>
          </div>

          <div className="hero-tier hero-tier--meta border-border/40 flex flex-col gap-4 border-t py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted-foreground text-caption">
              Self-hosted, one SQLite file, MIT licensed.
            </p>

            <a
              href="#how-to-start"
              className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 group text-caption inline-flex min-h-6 w-fit items-center gap-2 py-1.5 transition-colors focus-visible:ring-3 focus-visible:outline-none"
            >
              <span>How to start</span>
              <ArrowDown
                className="size-3.5 transition-transform duration-300 group-hover:translate-y-0.5"
                aria-hidden="true"
              />
            </a>
          </div>
        </div>
      </section>
    </HeroMotion>
  );
};
