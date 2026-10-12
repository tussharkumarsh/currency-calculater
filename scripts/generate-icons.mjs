// Renders the PWA/Apple PNG icons into public/icons. Run with: node scripts/generate-icons.mjs
import { writeFile, mkdir } from "node:fs/promises";
import { createElement as h } from "react";
import { ImageResponse } from "next/og.js";

const OUT = new URL("../public/icons/", import.meta.url);

function icon(size, { maskable = false, rounded = true } = {}) {
  // Maskable icons need the glyph inside the central 80% safe zone and a full-bleed background.
  const glyph = Math.round(size * (maskable ? 0.46 : 0.6));
  return new ImageResponse(
    h(
      "div",
      {
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1d1d1f",
          borderRadius: rounded && !maskable ? Math.round(size * 0.22) : 0,
          color: "#f6f5f2",
          fontSize: glyph,
          fontWeight: 600,
          paddingBottom: Math.round(size * 0.04),
        },
      },
      "₹",
    ),
    { width: size, height: size },
  );
}

const targets = [
  ["icon-192.png", icon(192)],
  ["icon-512.png", icon(512)],
  ["icon-maskable-512.png", icon(512, { maskable: true })],
  ["apple-touch-icon.png", icon(180, { rounded: false })],
];

await mkdir(OUT, { recursive: true });
for (const [name, response] of targets) {
  await writeFile(new URL(name, OUT), Buffer.from(await response.arrayBuffer()));
  console.log(`wrote public/icons/${name}`);
}
