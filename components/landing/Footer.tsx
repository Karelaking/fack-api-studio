import React from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/brand/BrandLogo";

const CURRENT_YEAR = 2026;

const LINK_CLASSES =
  "hover:text-foreground focus-visible:ring-ring/50 rounded-sm transition-colors focus-visible:ring-3 focus-visible:outline-none";

/**
 * Landing page footer: brand block plus navigation columns above a slim
 * copyright bar.
 */
export const Footer = (): React.JSX.Element => {
  return (
    <footer
      id="site-footer"
      className="border-border/40 bg-background text-foreground relative z-20 block w-full overflow-hidden border-t"
      aria-label="Site footer"
    >
      <div className="border-border/40 relative mx-auto max-w-7xl border-x">
        <div className="grid grid-cols-1 items-start gap-16 px-8 py-20 sm:px-14 sm:py-28 lg:grid-cols-12 lg:gap-12 lg:px-20 lg:py-28">
          <div className="max-w-md space-y-5 lg:col-span-7">
            <div className="flex items-center gap-3">
              <BrandLogo size={34} aria-hidden="true" />
              <span className="text-foreground text-lg font-extrabold tracking-tight">
                Fack API Studio
              </span>
            </div>
            <p className="text-muted-foreground text-base leading-relaxed">
              Design mocked APIs on a canvas and serve them from your own
              machine. Open source under the MIT license.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-10 text-sm font-medium lg:col-span-5">
            <div className="space-y-4">
              <h3 className="text-foreground text-sm font-semibold">
                Platform
              </h3>
              <ul className="text-muted-foreground space-y-3">
                <li>
                  <a href="#showcase" className={LINK_CLASSES}>
                    Visual Flow Canvas
                  </a>
                </li>
                <li>
                  <a href="#features" className={LINK_CLASSES}>
                    Faker.js Engine
                  </a>
                </li>
                <li>
                  <a href="#features" className={LINK_CLASSES}>
                    DTO &amp; Schema Export
                  </a>
                </li>
                <li>
                  <a href="#features" className={LINK_CLASSES}>
                    Chaos Injector
                  </a>
                </li>
                <li>
                  <a href="#pricing" className={LINK_CLASSES}>
                    Storage &amp; Privacy
                  </a>
                </li>
                <li>
                  <Link href="/dashboard" className={LINK_CLASSES}>
                    Workspace
                  </Link>
                </li>
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="text-foreground text-sm font-semibold">
                Ecosystem
              </h3>
              <ul className="text-muted-foreground space-y-3">
                <li>
                  <a
                    href="https://github.com/Karelaking/fack-api"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={LINK_CLASSES}
                  >
                    GitHub Repository
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/Karelaking/fack-api/releases"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={LINK_CLASSES}
                  >
                    Release Notes
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/Karelaking"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={LINK_CLASSES}
                  >
                    Author GitHub
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/Karelaking/fack-api/blob/main/LICENSE"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={LINK_CLASSES}
                  >
                    MIT License
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="border-border/40 border-t" />

        <div className="text-muted-foreground flex flex-col items-center justify-between gap-4 px-4 py-8 text-xs font-medium sm:flex-row sm:text-sm">
          <p>
            ©{CURRENT_YEAR} Fack API Studio. MIT licensed. Crafted by{" "}
            <a
              href="https://github.com/Karelaking"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground focus-visible:ring-ring/50 rounded-sm font-semibold transition-colors focus-visible:ring-3 focus-visible:outline-none"
            >
              M.K Katiyar
            </a>
            .
          </p>

          <nav
            className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2"
            aria-label="Footer links"
          >
            <Link href="/dashboard" className={LINK_CLASSES}>
              Dashboard
            </Link>
            <a
              href="https://github.com/Karelaking/fack-api"
              target="_blank"
              rel="noopener noreferrer"
              className={LINK_CLASSES}
            >
              GitHub
            </a>
            <a
              href="https://github.com/Karelaking/fack-api/blob/main/LICENSE"
              target="_blank"
              rel="noopener noreferrer"
              className={LINK_CLASSES}
            >
              License
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
