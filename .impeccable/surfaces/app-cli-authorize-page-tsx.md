---
version: 1
slug: "app-cli-authorize-page-tsx"
primary_target: "app/cli/authorize/page.tsx"
related_targets: ["app/api/cli/auth/device/route.ts","app/(dashboard)/keys/page.tsx"]
---

# CLI device authorization — /cli/authorize

Scope: Operate. A signed-in studio user approves or denies one terminal's
one-time code so the CLI can list projects and pull bundles and keys.

Audience: A developer who just ran `fack login`, has an eight-character code in
their terminal, and lands here from the browser that already holds their Studio
session.

Job: confirm the code and the requesting device, approve with one action, and
know the terminal continues on its own. Deny is equally reachable.

Constraints: Extends the incumbent studio world — shadcn token system, Inter UI
face, restrained violet primary, hairline rings, light/dark parity. Standalone
auth-adjacent frame without the dashboard sidebar. Signed-out visitors bounce
through /sign-in and return to the same code. One task card, no marketing.

Unresolved: none.

## Direction contract

THESIS: A terminal handshake rendered as one trust checkpoint — code, requester,
approve — refusing dashboard chrome and the generic OAuth consent wall.

OWN-WORLD: Studio tokens only: `bg-background` ground, card with
`ring-foreground/10`, violet primary, Inter, 1px hairline rules, 12px radius, and
one mono voice reserved for the code and command. No new palette.

STORY: The visitor recognizes the code they were given, checks the device name
and platform, and approves; the card turns into a terminal-continues state that
names the exact command to return to.

FIRST VIEWPORT: A centered 440px column. Brand glyph and wordmark at the top,
then one card: heading "Authorize Fack CLI", a one-line explanation, an
eight-character tracked-mono code field (auto-formatted as XXXX-XXXX), a quiet
device row (name · platform · requested time), a primary "Authorize terminal"
and a ghost "Deny". Below the card, one muted line pointing to `fack login` as
the source of the code. No sidebar, no footer clutter.

FORM: Extension of the existing sign-in frame (brand bar above, task centered),
not a new visual world.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish
review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
