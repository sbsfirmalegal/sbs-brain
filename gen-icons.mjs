import fs from "fs";

const makeSVG = (size) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.18)}" fill="#13284E"/>
  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle"
    font-family="Georgia,serif" font-size="${Math.round(size * 0.38)}"
    font-weight="bold" fill="#C9A84C">SBS</text>
</svg>`;

fs.writeFileSync("public/icon-192.svg", makeSVG(192));
fs.writeFileSync("public/icon-512.svg", makeSVG(512));
console.log("SVGs creados: icon-192.svg, icon-512.svg");
