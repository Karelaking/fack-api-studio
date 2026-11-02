import { ImageResponse } from "next/og";
import fs from "node:fs";
import path from "node:path";

export const alt = "Fack API: Visual Mock API Builder";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image(): Promise<ImageResponse> {
  const imageBuffer = fs.readFileSync(
    path.join(process.cwd(), "public", "social-preview.png"),
  );
  const base64 = `data:image/png;base64,${imageBuffer.toString("base64")}`;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#09090b",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={base64}
        width="1200"
        height="630"
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
        alt={alt}
      />
    </div>,
    {
      ...size,
    },
  );
}
