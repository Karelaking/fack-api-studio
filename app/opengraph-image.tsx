import { ImageResponse } from "next/og";
import fs from "node:fs";
import path from "node:path";

export const alt = "Fack API's — Mock API Platform";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  const logoBuffer = fs.readFileSync(
    path.join(process.cwd(), "public", "logo.png"),
  );
  const logoBase64 = `data:image/png;base64,${logoBuffer.toString("base64")}`;

  return new ImageResponse(
    <div
      style={{
        fontSize: 48,
        background: "#09090b",
        color: "#ffffff",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "sans-serif",
        fontWeight: 700,
      }}
    >
      {/* Isometric Payload Stack Brand Logo */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoBase64}
        width="130"
        height="141"
        style={{ marginBottom: 28 }}
        alt="Fack API Logo"
      />
      <div
        style={{
          display: "flex",
          fontSize: 60,
          color: "#ffffff",
          marginBottom: 12,
          letterSpacing: "-0.03em",
        }}
      >
        fackapi<span style={{ color: "#06b6d4" }}>.</span>studio
      </div>
      <div style={{ fontSize: 24, color: "#94a3b8", fontWeight: 500 }}>
        Visual Node-Based Mock API &amp; Schema Synthesis Platform
      </div>
    </div>,
    {
      ...size,
    },
  );
}
