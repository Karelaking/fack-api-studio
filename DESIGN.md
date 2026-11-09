---
name: Fack API Studio
description: A precise specimen-sheet design system for a developer-first mock API studio.
colors:
  background: "oklch(1 0 0)"
  foreground: "oklch(0.145 0 0)"
  card: "oklch(1 0 0)"
  card-foreground: "oklch(0.145 0 0)"
  popover: "oklch(1 0 0)"
  popover-foreground: "oklch(0.145 0 0)"
  primary: "oklch(0.5 0.2 260)"
  primary-hover: "oklch(0.45 0.2 260)"
  primary-foreground: "oklch(0.985 0 0)"
  secondary: "oklch(0.97 0 0)"
  secondary-foreground: "oklch(0.205 0 0)"
  muted: "oklch(0.97 0 0)"
  muted-foreground: "oklch(0.45 0 0)"
  accent: "oklch(0.97 0 0)"
  accent-foreground: "oklch(0.205 0 0)"
  destructive: "oklch(0.525 0.245 27.325)"
  border: "oklch(0.922 0 0)"
  input: "oklch(0.922 0 0)"
  ring: "oklch(0.5 0.2 260)"
  success: "oklch(0.448 0.17 152)"
  warning: "oklch(0.482 0.18 85)"
  info: "oklch(0.47 0.15 245)"
  danger: "oklch(0.442 0.245 25)"
  method-get: "oklch(0.448 0.17 152)"
  method-post: "oklch(0.47 0.15 245)"
  method-put: "oklch(0.482 0.18 85)"
  method-patch: "oklch(0.488 0.18 55)"
  method-delete: "oklch(0.442 0.245 27.325)"
  canvas-dot: "oklch(0.72 0.02 260)"
  canvas-minimap-node: "oklch(0.5 0.2 260)"
  canvas-minimap-group: "oklch(0.9 0.01 260)"
  canvas-mask: "oklch(0.96 0.005 260 / 70%)"
typography:
  display:
    fontFamily: "var(--font-bricolage), 'Bricolage Grotesque', sans-serif"
    fontSize: "clamp(2rem, 9vw, 5rem)"
    fontWeight: 500
    lineHeight: 0.92
    letterSpacing: "-0.045em"
  headline:
    fontFamily: "var(--font-sans), Inter, sans-serif"
    fontSize: "clamp(1.875rem, 5vw, 4.5rem)"
    fontWeight: 800
    lineHeight: 1.02
    letterSpacing: "-0.03em"
  title:
    fontFamily: "var(--font-sans), Inter, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.015em"
  body:
    fontFamily: "var(--font-sans), Inter, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0em"
  label:
    fontFamily: "var(--font-sans), Inter, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "0.05em"
  code:
    fontFamily: "var(--font-geist-mono), 'Geist Mono', monospace"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.5
rounded:
  sm: "0.3rem"
  md: "0.4rem"
  lg: "0.5rem"
  xl: "0.7rem"
  "2xl": "0.9rem"
  full: "9999px"
spacing:
  "1": "4px"
  "1.5": "6px"
  "2": "8px"
  "2.5": "10px"
  "3": "12px"
  "4": "16px"
  "5": "20px"
  "6": "24px"
  "8": "32px"
  "10": "40px"
  "12": "48px"
  "16": "64px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.lg}"
    height: "32px"
    padding: "0 10px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.lg}"
  button-outline:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    height: "32px"
    padding: "0 10px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    height: "32px"
    padding: "0 10px"
  input:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    height: "32px"
    padding: "0 10px"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.xl}"
    padding: "16px"
  tabs-active:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
  switch-on:
    backgroundColor: "{colors.primary}"
    rounded: "{rounded.full}"
    height: "18px"
    width: "32px"
---

# Design System: Fack API Studio

## Overview

**Creative North Star: "The Specimen Sheet"**

Fack Studio is an instrument, not a poster. Its surface behaves like a carefully
ruled specimen sheet: a neutral paper ground, one indigo signal, measured type,
and drawings that exist only to explain the mechanism. The product is a visual
API studio, so the interface must feel drafted — hairline rules, blueprint grids,
monospace paths, method-coded status — while staying quiet enough that the user's
own schema is the loudest thing on screen.

The system is deliberately low-chroma. Neutrals carry almost all surface area;
indigo appears as the single signal for primary action, selection, focus, and the
live graph. Depth is expressed with rings and tonal layering rather than heavy
shadows, so dense dashboards and canvases stay legible. Density is high in the
studio and generous on marketing surfaces, but both share the same grid, type
scale, and radius vocabulary.

Motion is functional and brief. Entrances are the one authored moment (hero
lines rise, dashboard cards settle, agent drafts fade in sequence); everything
else is a 100–200ms state change. Ambient status pings and pulses are the only
permitted loops, and they always carry `motion-reduce:animate-none` so the
reduced-motion state is a static dot. Nothing else loops.

**Key Characteristics:**

- Neutral OKLCH paper-and-graphite surfaces with a single indigo signal.
- Ring-defined cards and controls instead of heavy borders or shadows.
- Compact 32px controls, 8px default radius, 1px press feedback.
- Inter for the product, Bricolage Grotesque only at poster scale on the landing hero.
- HTTP verbs own a fixed, colorblind-safe hue spectrum.
- Blueprint grids, hairline rules, and monospace paths as the recurring visual motif.

## Colors

A near-monochrome system interrupted by one confident indigo and a disciplined
set of status hues; every color is authored in OKLCH so tints stay perceptually
even in light and dark themes.

### Primary

- **Signal Indigo** (`oklch(0.5 0.2 260)`): Primary actions, selected states,
  focus rings, the live graph node, and brand marks. Dark mode lifts it to
  `oklch(0.7 0.2 260)` with dark ink so the hue keeps its presence without
  dropping contrast.
- **Signal Indigo Deep** (`oklch(0.45 0.2 260)`): Solid hover for primary CTAs
  where compositing the base at 80% behind white text would fall below AA.

### Neutral

- **Paper** (`oklch(1 0 0)`): Light-mode page and card ground.
- **Graphite** (`oklch(0.145 0 0)`): Primary text in light mode, page ground in dark mode.
- **Ash** (`oklch(0.45 0 0)`): Secondary text, metadata, and quiet labels.
- **Rule** (`oklch(0.922 0 0)`): Borders, inputs, and hairline dividers.
- **Tint** (`oklch(0.97 0 0)`): Muted fills, hover surfaces, and tab tracks.

### Semantic Status

- **Verified Green** (`oklch(0.448 0.17 152)`): 2xx responses, success, connected.
- **Caution Amber** (`oklch(0.482 0.18 85)`): 3xx responses and warnings.
- **Protocol Blue** (`oklch(0.47 0.15 245)`): Informational states.
- **Fault Red** (`oklch(0.442 0.245 25)`): 4xx/5xx responses, destructive actions, validation errors.

### HTTP Method Spectrum

- **GET Green**, **POST Blue**, **PUT Amber**, **PATCH Orange**, **DELETE Red**
  (`--method-get` … `--method-delete`): A fixed, colorblind-aware mapping used on
  canvas nodes, method chips, filters, and request logs. The hue is the method's
  identity; it is never reassigned for decoration.

### Canvas Chrome

- **`--canvas-dot`**, **`--canvas-minimap-node`**, **`--canvas-minimap-group`**,
  **`--canvas-mask`**: React Flow's dot grid, minimap nodes, endpoint-group
  blocks, and the viewport mask. They live in the theme tokens so the canvas
  follows light/dark instead of carrying hex values in component code.

### Named Rules

**The One Signal Rule.** Indigo is reserved for primary action, selection, focus,
and the live node. If two indigo elements compete on one screen, one of them is
wrong.

**The Tint-Not-Fill Rule.** Method and status chips use a 10–15% hue tint with
hue-colored text and a 20–25% hue border. Saturated fills are reserved for
8px status dots and solid primary buttons.

**The Method Speaks Rule.** A method's hue never changes across surfaces. GET is
always the same green in the canvas, the sidebar, the log, and the marketing demo.

## Typography

**Display Font:** Bricolage Grotesque (with system sans fallback)
**Body Font:** Inter (with system sans fallback)
**Label/Mono Font:** Geist Mono

**Character:** Inter keeps the working studio neutral and scannable; Bricolage
Grotesque appears only at poster scale on the landing hero, where its soft,
slightly irregular skeleton and ink traps give the promise a specimen-sheet
voice. Geist Mono marks anything the machine owns — paths, payloads, status
codes, parameters.

### Hierarchy

- **Display** (500, `clamp(2rem, 9vw, 5rem)`, 0.92, -0.045em): Landing hero only.
  Two sentences at poster scale, the second pair in muted ink.
- **Headline** (800, `clamp(1.875rem, 5vw, 4.5rem)`, 1.02, -0.03em): Marketing
  section headings; balanced, tight, never used inside the dashboard.
- **Title** (600, `1.5rem`, 1.3, -0.015em): Page headings via `PageHeading`;
  card titles step down to `1rem`/`0.8125rem` at small card sizes.
- **Body** (400, `0.875rem`, 1.5): The working size. Supporting copy uses
  `0.8125rem`; dense devtool rows use `0.75rem`.
- **Label** (700, `0.6875rem`, 1.3, 0.05em, uppercase): Micro-labels, section
  eyebrows, metadata keys, and method chips.
- **Mini** (700, `0.625rem`, 1.3, 0.05em, uppercase): Dense metadata inside
  logs, chips, and inspector rows where `Label` would crowd the line.
- **Micro** (700, `0.5625rem`, 1.3, 0.05em, uppercase): The floor: timestamps,
  counters, and badge text that must fit a single dense row.
- **Code** (500, `0.75rem`, 1.5): Endpoint paths, JSON keys, mock URLs, query
  parameters, and status codes.

### Named Rules

**The Two Voices Rule.** Bricolage Grotesque is a marketing voice. It never
appears in the dashboard, canvas, dialogs, or settings — those surfaces stay
Inter so the product reads as one continuous tool.

**The Micro-Label Rule.** Metadata is uppercase, 9–11px (`micro`/`mini`/
`caption`), bold, and tracked wide (`0.05em`). If a label needs a sentence, it is
body copy, not a label.

## Layout

The dashboard frame is `PageShell`: a centered column capped at `1760px`, with
`24px` vertical rhythm, horizontal padding that scales `16px → 24px → 32px →
48px → 64px`, and vertical padding `24px → 32px → 40px` across breakpoints.
Every dashboard page uses it so the project grid, settings, and secondary
surfaces share one page rhythm.

Marketing surfaces use a narrower `max-w-7xl` column with vertical `border-x`
rules; the hero fills at least `100svh - 5rem` and lets the blueprint grid bleed
inside those rules, not past them. The canvas is full-bleed and edge-to-edge by
contrast; its nodes are laid out on a fixed pixel rhythm and are never reflowed
by page padding.

Spacing follows the 4px Tailwind scale: `4px` between micro elements, `6–8px`
inside inline groups, `16px` between form fields, `20–24px` between cards and
sections, and `32–64px` for page-level breathing room. Density is intentional:
the studio is a devtool, so compact rows are the default and air is added at the
page frame, not inside every control.

Breakpoints are Tailwind defaults: `sm 640`, `md 768`, `lg 1024`, `xl 1280`,
`2xl 1536`. Touch devices get 44px hit targets via `pointer: coarse` overrides
without changing the visual size of in-card controls.

## Elevation & Depth

The system is flat at rest and ring-defined. Cards use a 1px `ring` at 10%
foreground instead of a border or drop shadow; popovers and dialogs add a soft
shadow and a `black/10` backdrop with `backdrop-blur-xs`. Shadows are extremely
low-contrast (3–8% black) and exist to separate overlays from the page, not to
decorate surfaces.

Dark mode swaps the ring to white at 10% and raises card surfaces to
`oklch(0.205 0 0)` against a `0.145` page ground, so depth reads as tonal
layering rather than shadow. Canvas nodes add a method-colored glow only on
hover, and the live node gets an 8px halo.

### Shadow Vocabulary

- **`xs`** (`0 1px 2px 0 oklch(0 0 0 / 3%)`): Inputs, chips, and pressed-in details.
- **`sm`** (`0 1px 3px 0 oklch(0 0 0 / 6%), 0 1px 2px -1px oklch(0 0 0 / 6%)`): Raised controls and active tabs.
- **`md`** (`0 4px 6px -1px oklch(0 0 0 / 6%), 0 2px 4px -2px oklch(0 0 0 / 6%)`): Dropdowns and popovers.
- **`lg`** (`0 10px 15px -3px oklch(0 0 0 / 6%), 0 4px 6px -4px oklch(0 0 0 / 6%)`): Hovered cards and floating panels.
- **`xl`** (`0 20px 25px -5px oklch(0 0 0 / 8%), 0 8px 10px -6px oklch(0 0 0 / 8%)`): Dialogs and command palettes.

### Named Rules

**The Ring-Not-Border Rule.** Cards, popovers, and dialogs are defined by a 1px
`ring` at 10% foreground, not by a solid border. Borders are for inputs,
dividers, and dashed empty states.

**The Flat-At-Rest Rule.** Surfaces are flat until state demands otherwise.
Hover may add a shadow; focus adds a ring; nothing floats permanently except
overlays.

## Shapes

Corners are gently rounded and consistent: the base radius is `0.5rem` (8px),
with a derived scale from `0.3rem` for micro chips to `0.9rem` for large
containers. Buttons and inputs sit at `0.5rem`; cards and dialogs at `0.7rem`;
badges and landing CTAs use full pills. The system never mixes sharp corners
with rounded ones on the same surface.

Form language is linear and drafted: 1px rules, dashed panels for empty states,
hairline grids in the hero, and circular nodes on the canvas. Icons are drawn at
14–16px and inherit `currentColor`.

### Named Rules

**The Eight-Pixel Default Rule.** If a new surface needs a radius and there is no
reason to deviate, use `0.5rem`. Larger containers step up one or two rungs;
pills are only for badges, avatars, and marketing CTAs.

## Components

### Buttons

- **Shape:** Gently rounded (`0.5rem`), 32px tall by default, 10px horizontal padding, 6px icon gap.
- **Primary:** Signal Indigo fill with near-white ink; hover deepens to
  `--primary-hover`; active translates down 1px.
- **Outline:** Paper fill, `border-border`, hover fills with muted tint.
- **Ghost:** Transparent until hover; used for icon actions and toolbar controls.
- **Destructive:** Tinted, not solid — `destructive/10` fill with destructive
  text and a destructive focus ring. Solid red is reserved for confirmation
  buttons in destructive dialogs.
- **Sizes:** `xs 24px`, `sm 28px`, `default/lg 32/36px`, square `icon` variants
  from 24–36px. Focus is a 3px ring at 50% ring color plus a ring-colored border.
- **Touch:** Under `pointer: coarse`, square `icon` variants grow to a minimum
  `44px` hit target (`pointer-coarse:min-h-11 pointer-coarse:min-w-11`) while the
  glyph stays the same size.

### Chips / Badges

- **Style:** 20px tall, full pill, 12px medium text, 1px transparent border.
- **Method chips:** 10% method tint, method text, 25% method border, uppercase
  micro-label weight. A matching 8px dot carries a soft hue glow on the canvas.
- **Status chips:** Same tint grammar keyed to the response class — green 2xx,
  amber 3xx, red 4xx/5xx, muted unknown.
- **State:** Selected filter chips swap the tint for a stronger 15–20% tint; they
  never invert to a solid fill.

### Cards / Containers

- **Corner Style:** `0.7rem` (`rounded-xl`).
- **Background:** `--card`, ringed with `foreground/10`.
- **Shadow Strategy:** Flat at rest; `interactive` cards add `shadow-lg` on hover.
- **Border:** None by default; `dashed` variant uses a 1px dashed border for
  empty or provisional containers; `danger` uses a destructive tint.
- **Internal Padding:** `--card-spacing`, 16px default and 12px for `sm` cards;
  headers and footers align to the same token.

### Inputs / Fields

- **Style:** 32px tall, transparent fill on paper (dark mode `input/30`), 1px
  `border-input`, `0.5rem` radius, 10px horizontal padding.
- **Focus:** Border shifts to `ring` and a 3px `ring/50` glow appears.
- **Error:** Destructive border and 3px destructive ring at 20% (40% in dark).
- **Disabled:** 50% opacity with a muted fill; pointer events off.
- **Mono variant:** Endpoint and payload fields switch to Geist Mono without
  changing size or padding.

### Navigation

- **Sidebar:** The studio's persistent rail. Compact rows with icon + label,
  muted text at rest, muted tint on hover, and an indigo-tinted active state.
  Project rows show method dots and truncated monospace paths.
- **Top bar:** Breadcrumb and page actions; same 32px control height as the page.
- **Mobile:** A bottom navigation bar replaces the rail; targets grow to 44px
  under `pointer: coarse` while the visual glyphs stay small.
- **Marketing header:** Pill CTA, borderless nav links, and a single indigo
  action; it borrows the dashboard's controls but not its density.

### Signature: HTTP Method Badge

The method badge is the system's most repeated signature: a 20px pill or 4px
chip in the verb's hue, uppercase micro type, a 25% hue border, and a 10% hue
fill. On the canvas it pairs with a glowing 8px dot and a method-colored hover
glow on the whole node. It appears identically in the canvas, sidebar, request
log, filters, and marketing demo — that consistency is the point.

### Signature: Route Node

A canvas card with a method-coded left edge, a monospace path, a status chip, and
up to four field badges. It is flat at rest, lifts with a method-colored glow on
hover, mirrors the focus ring from React Flow's wrapper onto the card, and fades
in sequence when the AI architect proposes a draft.

### Signature: Empty State

A quiet dashed panel on `card/30`: a 56px indigo-tinted icon circle, a plain
title, one sentence of muted copy, and at most one primary action. It is the
single empty-state pattern for every secondary surface.

## Do's and Don'ts

### Do:

- **Do** use `PageShell` for every dashboard page so padding and max width stay identical.
- **Do** keep controls at 32px height with `0.5rem` radius unless a size variant says otherwise.
- **Do** use the OKLCH tokens in `app/globals.css`; never hard-code a hex, `rgb()`, or a Tailwind palette color.
- **Do** express depth with `ring-1 ring-foreground/10` and tonal layering before reaching for a shadow.
- **Do** keep method and status colors on their fixed hues and tint grammar.
- **Do** pair every animation with a `prefers-reduced-motion` resting state.
- **Do** use Geist Mono for anything the machine owns: paths, payloads, params, status codes.
- **Do** verify tinted text against the page with `node scripts/contrast.mjs` after changing a semantic hue.

### Don't:

- **Don't** use Bricolage Grotesque outside the landing hero.
- **Don't** introduce a second accent hue; indigo is the only signal color.
- **Don't** fill method or status chips with saturated color — tint them.
- **Don't** put a solid border and a ring on the same card.
- **Don't** use heavy or dark drop shadows; the ceiling is 8% black.
- **Don't** mix sharp and rounded corners on one surface.
- **Don't** add ambient looping motion to the dashboard or canvas.
- **Don't** reflow canvas nodes with page padding; the canvas is a fixed-rhythm workspace.
