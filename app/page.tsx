import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { HeroSection } from "@/components/landing/HeroSection";
import { LazyInteractiveCanvasDemo } from "@/components/landing/LazyInteractiveCanvasDemo";
import { HowToStartSection } from "@/components/landing/HowToStartSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { Footer } from "@/components/landing/Footer";

const LogoCloudSection = dynamic(() =>
  import("@/components/landing/LogoCloudSection").then(
    (mod) => mod.LogoCloudSection,
  ),
);

export const metadata: Metadata = {
  title: "Fack API Studio | Visual Mock API Platform & Schema Builder",
  description:
    "Design mock REST APIs on a visual node canvas, generate Faker.js payloads, simulate chaos latency, and export TypeScript contracts with zero setup.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Fack API Studio | Visual Mock API Platform & Schema Builder",
    description:
      "Design mock REST APIs on a visual node canvas, generate Faker.js payloads, simulate chaos latency, and export TypeScript contracts with zero setup.",
    url: "./",
    siteName: "Fack API",
    type: "website",
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
    title: "Fack API Studio | Visual Mock API Platform & Schema Builder",
    description:
      "Design mock REST APIs on a visual node canvas, generate Faker.js payloads, simulate chaos latency, and export TypeScript contracts with zero setup.",
    images: ["/og-image.jpg"],
  },
};

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Fack API Studio",
    operatingSystem: "Web, macOS, Windows, Linux, Docker",
    applicationCategory: "DeveloperApplication",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    description:
      "Self-hostable mock API platform with a visual node canvas, nested JSON schema builder, Faker.js generators, chaos testing, and TypeScript export.",
    url: "https://fackapi.studio",
    codeRepository: "https://github.com/Karelaking/fack-api",
    license: "https://opensource.org/licenses/MIT",
    featureList: [
      "Visual Node Mock API Canvas",
      "Nested JSON Schema Builder",
      "Faker.js Payload Synthesis Engine",
      "Network Chaos and Latency Simulator",
      "Local-First SQLite Engine with Zero Configuration",
      "TypeScript Contract and OpenAPI Export",
      "Bounded In-Memory LRU Cache Layer",
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Fack API Studio",
    url: "https://fackapi.studio",
    description: "Visual Mock API Platform & Schema Builder",
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What is Fack API?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Fack API is an open-source, self-hostable mock backend platform that allows frontend and mobile developers to build and test applications independently before real backend services are ready.",
        },
      },
      {
        "@type": "Question",
        name: "Does Fack API require an external database or cloud account?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No. By default, Fack API runs in local-first mode using a private SQLite file on disk. No API keys, cloud accounts, or database servers are required. Optional cloud synchronization is supported via Turso.",
        },
      },
      {
        "@type": "Question",
        name: "How does Fack API generate realistic mock data?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Fack API combines standard JSON Schema definitions with Faker.js data generators to automatically synthesize realistic names, addresses, dates, internet handles, commerce items, and UUIDs.",
        },
      },
      {
        "@type": "Question",
        name: "Can I simulate network latency and API failure rates?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Every route includes chaos simulation controls to set minimum and maximum latency delays and configurable error rates to test application resilience.",
        },
      },
      {
        "@type": "Question",
        name: "How do client applications call mock routes?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Mock routes can be called directly over HTTP using path-based namespaces (http://localhost:3000/:projectSlug/...) or subdomain routing (http://:projectSlug.localhost:3000/...).",
        },
      },
    ],
  },
];

/**
 * Root Landing Page for Fack API's.
 * Composed from modular landing sections (header, hero, quick start,
 * features, pricing, footer).
 */
export default function HomePage(): React.JSX.Element {
  return (
    <div className="bg-background text-foreground selection:bg-primary/20 selection:text-primary flex min-h-screen flex-col font-sans antialiased">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingHeader />
      <main className="w-full flex-1" id="main-content">
        <HeroSection />
        <LazyInteractiveCanvasDemo />
        <HowToStartSection />
        <LogoCloudSection />
        <FeaturesSection />
        <PricingSection />
      </main>
      <Footer />
    </div>
  );
}
