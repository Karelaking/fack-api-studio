import { Bricolage_Grotesque, Inter } from "next/font/google";
import { GeistMono } from "geist/font/mono";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { ThemeProvider } from "@/components/ThemeProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";

/**
 * `viewportFit: "cover"` is what makes `env(safe-area-inset-*)` report real
 * values on notched devices. Without it the insets are always 0, so the mobile
 * bottom nav sits under the home indicator. Next emits `width=device-width` and
 * `initial-scale=1` alongside this automatically.
 */
export const viewport: Viewport = {
  viewportFit: "cover",
};

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

/**
 * The landing hero's display voice. Bricolage Grotesque carries a soft,
 * slightly irregular grotesque skeleton with ink traps that stay visible at
 * poster sizes — a specimen-sheet character the interface otherwise never
 * uses, kept to the hero so the working dashboard keeps its neutral sans.
 */
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});

/**
 * Runs before first paint to apply the persisted theme class, preventing a
 * flash of the wrong theme (FOUC). Kept in sync with ThemeProvider: same
 * storage key ("theme") and supported values (light | dark | system).
 */
const themeInitScript = `(function(){try{var stored=localStorage.getItem("theme");var prefersDark=window.matchMedia("(prefers-color-scheme: dark)").matches;var isDark=stored==="dark"||((stored===null||stored==="system")&&prefersDark);var root=document.documentElement;root.classList.toggle("dark",isDark);root.style.colorScheme=isDark?"dark":"light";}catch(e){}})();`;

function resolveSiteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "https://fackapi.studio");

  if (!raw.startsWith("http://") && !raw.startsWith("https://")) {
    return `https://${raw}`;
  }
  return raw.replace(/\/+$/, "");
}

const defaultSiteUrl = resolveSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(defaultSiteUrl),
  title: {
    default: "Fack API Studio | Visual Mock API Platform and Schema Designer",
    template: "%s | Fack API",
  },
  description:
    "Self-hostable mock API platform with a visual node canvas, nested JSON schema builder, Faker.js generators, chaos testing, and TypeScript export.",
  keywords: [
    "mock api",
    "mock backend",
    "mock server",
    "visual schema builder",
    "faker js",
    "chaos testing",
    "json schema",
    "react flow",
    "typescript dto",
    "rest api simulator",
    "self-hosted",
    "sqlite",
  ],
  authors: [
    { name: "Fack API", url: "https://github.com/Karelaking/fack-api" },
  ],
  creator: "Fack API",
  verification: {
    google: "nrArqHdbOXWOZAbBTFZHODCRWz3jmmrv8HvTBs8x1FE",
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "./",
    siteName: "Fack API",
    title: "Fack API Studio | Visual Mock API Platform and Schema Designer",
    description:
      "Self-hostable mock API platform with a visual node canvas, nested JSON schema builder, Faker.js generators, chaos testing, and TypeScript export.",
    images: [
      {
        url: "/og-image.jpg",
        secureUrl: "/og-image.jpg",
        width: 1200,
        height: 630,
        type: "image/jpeg",
        alt: "Fack API Studio: Visual Mock API Platform and Schema Designer",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Fack API Studio | Visual Mock API Platform and Schema Designer",
    description:
      "Self-hostable mock API platform with a visual node canvas, nested JSON schema builder, Faker.js generators, chaos testing, and TypeScript export.",
    images: ["/og-image.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${bricolage.variable} ${GeistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <link rel="image_src" href={`${defaultSiteUrl}/og-image.jpg`} />
        {/*
          Blocking inline script: sets the theme class before the browser
          paints, avoiding a flash of the default (light) theme.
        */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="bg-background text-foreground flex min-h-full flex-col">
        <a
          href="#main-content"
          className="bg-background text-foreground focus:ring-ring/50 sr-only rounded-md px-4 py-2 font-medium shadow-lg focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:ring-3 focus:outline-none"
        >
          Skip to main content
        </a>
        <NuqsAdapter>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <TooltipProvider>
              {/* Only Vercel serves the analytics script; rendering it
                  elsewhere makes the client request /_vercel/insights/script.js
                  and log a 404 in the console. */}
              {process.env.VERCEL ? <Analytics /> : null}
              {children}
              <Toaster position="top-right" richColors />
            </TooltipProvider>
          </ThemeProvider>
        </NuqsAdapter>
      </body>
    </html>
  );
}
