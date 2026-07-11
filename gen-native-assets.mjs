// Genera los PNG fuente para @capacitor/assets a partir del logo SBS.
// Corrida: node gen-native-assets.mjs  (produce archivos en resources/)
import fs from "fs";
import sharp from "sharp";

const NAVY = "#13284E";
const GOLD = "#C9A84C";

const iconSvg = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${NAVY}"/>
  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle"
    font-family="Georgia,serif" font-size="${Math.round(size * 0.38)}"
    font-weight="bold" fill="${GOLD}">SBS</text>
</svg>`;

// Foreground para icono adaptativo: solo texto centrado, transparente atras.
// Se deja el 66% interior visible (zona segura del icono adaptativo).
const iconForegroundSvg = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle"
    font-family="Georgia,serif" font-size="${Math.round(size * 0.28)}"
    font-weight="bold" fill="${GOLD}">SBS</text>
</svg>`;

const splashSvg = (size, dark) => {
  const bg = dark ? "#0A1828" : NAVY;
  const badge = Math.round(size * 0.28);
  const badgeX = (size - badge) / 2;
  const badgeY = (size - badge) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${bg}"/>
  <rect x="${badgeX}" y="${badgeY}" width="${badge}" height="${badge}" rx="${Math.round(badge * 0.18)}" fill="${NAVY}" stroke="${GOLD}" stroke-width="${Math.round(badge * 0.02)}"/>
  <text x="50%" y="${badgeY + badge * 0.6}" dominant-baseline="middle" text-anchor="middle"
    font-family="Georgia,serif" font-size="${Math.round(badge * 0.42)}"
    font-weight="bold" fill="${GOLD}">SBS</text>
</svg>`;
};

async function svgToPng(svg, out) {
  await sharp(Buffer.from(svg)).png().toFile(out);
  console.log("  ->", out);
}

async function main() {
  fs.mkdirSync("resources", { recursive: true });
  console.log("Generando iconos y splash...");
  await svgToPng(iconSvg(1024), "resources/icon.png");
  await svgToPng(iconSvg(1024), "resources/icon-background.png"); // color solido navy con letras
  await svgToPng(iconForegroundSvg(1024), "resources/icon-foreground.png");
  await svgToPng(splashSvg(2732, false), "resources/splash.png");
  await svgToPng(splashSvg(2732, true), "resources/splash-dark.png");
  console.log("Listo. Ahora: npm run cap:assets");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
