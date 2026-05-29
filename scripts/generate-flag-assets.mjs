import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const outDir = join(process.cwd(), "assets", "flags");

const flags = {
  algeria: { type: "vertical", colors: ["#006233", "#ffffff"], mark: { shape: "crescent", color: "#d21034", cutout: "#ffffff", star: true } },
  argentina: { type: "horizontal", colors: ["#74acdf", "#ffffff", "#74acdf"], mark: { shape: "circle", color: "#f6b40e", r: 12 } },
  australia: { type: "australia" },
  austria: { type: "horizontal", colors: ["#ed2939", "#ffffff", "#ed2939"] },
  belgium: { type: "vertical", colors: ["#000000", "#fae042", "#ed2939"] },
  bosnia: { type: "bosnia" },
  brazil: { type: "solid", color: "#009b3a", diamond: "#ffdf00", mark: { shape: "circle", color: "#002776", r: 15 } },
  canada: { type: "vertical", colors: ["#ff0000", "#ffffff", "#ff0000"], mark: { shape: "leaf", color: "#ff0000" } },
  cape_verde: { type: "capeVerde" },
  colombia: { type: "horizontal", colors: ["#fcd116", "#fcd116", "#003893", "#ce1126"] },
  croatia: { type: "horizontal", colors: ["#ff0000", "#ffffff", "#171796"], mark: { shape: "checker", colors: ["#ff0000", "#ffffff"] } },
  curacao: { type: "curacao" },
  czechia: { type: "horizontal", colors: ["#ffffff", "#d7141a"], triangle: "#11457e" },
  dr_congo: { type: "diagonal", color: "#007fff", stripe: "#f7d618", stripe2: "#ce1021", mark: { shape: "star", color: "#f7d618", cx: 25, cy: 25, r: 11 } },
  ecuador: { type: "horizontal", colors: ["#ffdd00", "#ffdd00", "#034ea2", "#ed1c24"], mark: { shape: "circle", color: "#8d5a2b", r: 9 } },
  egypt: { type: "horizontal", colors: ["#ce1126", "#ffffff", "#000000"], mark: { shape: "circle", color: "#c09300", r: 7 } },
  england: { type: "cross", base: "#ffffff", cross: "#ce1124" },
  france: { type: "vertical", colors: ["#0055a4", "#ffffff", "#ef4135"] },
  germany: { type: "horizontal", colors: ["#000000", "#dd0000", "#ffce00"] },
  ghana: { type: "horizontal", colors: ["#ce1126", "#fcd116", "#006b3f"], mark: { shape: "star", color: "#000000", r: 12 } },
  haiti: { type: "horizontal", colors: ["#00209f", "#d21034"], mark: { shape: "box", color: "#ffffff", stroke: "#d0b36a" } },
  iran: { type: "horizontal", colors: ["#239f40", "#ffffff", "#da0000"] },
  iraq: { type: "horizontal", colors: ["#ce1126", "#ffffff", "#000000"] },
  ivory_coast: { type: "vertical", colors: ["#f77f00", "#ffffff", "#009e60"] },
  japan: { type: "solid", color: "#ffffff", disc: "#bc002d" },
  jordan: { type: "horizontal", colors: ["#000000", "#ffffff", "#007a3d"], triangle: "#ce1126" },
  mexico: { type: "vertical", colors: ["#006847", "#ffffff", "#ce1126"], mark: { shape: "circle", color: "#8c6a2f", r: 8 } },
  morocco: { type: "solid", color: "#c1272d", mark: { shape: "starOutline", color: "#006233", r: 18 } },
  netherlands: { type: "horizontal", colors: ["#ae1c28", "#ffffff", "#21468b"] },
  new_zealand: { type: "newZealand" },
  norway: { type: "cross", base: "#ba0c2f", cross: "#ffffff", innerCross: "#00205b", crossX: 33 },
  panama: { type: "quarters", colors: ["#ffffff", "#d21034", "#005293", "#ffffff"], mark: { shape: "panamaStars" } },
  paraguay: { type: "horizontal", colors: ["#d52b1e", "#ffffff", "#0038a8"], mark: { shape: "circle", color: "#d0b36a", r: 8 } },
  portugal: { type: "vertical", colors: ["#006600", "#ff0000"], split: 0.42, mark: { shape: "circle", color: "#ffcc00", cx: 42, cy: 50, r: 12 } },
  qatar: { type: "vertical", colors: ["#ffffff", "#8a1538"], split: 0.32 },
  saudi_arabia: { type: "solid", color: "#006c35", mark: { shape: "sword", color: "#ffffff" } },
  scotland: { type: "saltire", base: "#005eb8", cross: "#ffffff" },
  senegal: { type: "vertical", colors: ["#00853f", "#fdef42", "#e31b23"], mark: { shape: "star", color: "#00853f", r: 12 } },
  south_africa: { type: "southAfrica" },
  south_korea: { type: "solid", color: "#ffffff", mark: { shape: "taegeuk" } },
  sweden: { type: "cross", base: "#006aa7", cross: "#fecc00", crossX: 33 },
  switzerland: { type: "swiss", base: "#d52b1e", cross: "#ffffff" },
  tunisia: { type: "solid", color: "#e70013", disc: "#ffffff", mark: { shape: "crescent", color: "#e70013", cutout: "#ffffff", star: true, cx: 46, cy: 50, r: 12 } },
  turkiye: { type: "solid", color: "#e30a17", mark: { shape: "crescent", color: "#ffffff", cutout: "#e30a17", star: true, cx: 42, cy: 48, r: 16 } },
  uruguay: { type: "uruguay" },
  usa: { type: "horizontal", colors: Array.from({ length: 13 }, (_, index) => index % 2 === 0 ? "#b22234" : "#ffffff"), canton: "#3c3b6e" },
  uzbekistan: { type: "horizontal", colors: ["#1eb6e7", "#ffffff", "#009a44"], mark: { shape: "crescent", color: "#ffffff", cutout: "#1eb6e7", cx: 24, cy: 17, r: 9 } }
};

mkdirSync(outDir, { recursive: true });

const rect = (attrs) => `<rect ${attrs}/>`;

const renderStripes = (colors, vertical = false) => colors.map((color, index) => {
  const size = 100 / colors.length;
  return vertical
    ? rect(`x="${index * size}" y="0" width="${size}" height="100" fill="${color}"`)
    : rect(`x="0" y="${index * size}" width="100" height="${size}" fill="${color}"`);
}).join("");

const starPath = (cx, cy, r) => {
  const points = Array.from({ length: 10 }, (_, index) => {
    const radius = index % 2 === 0 ? r : r * 0.42;
    const angle = -Math.PI / 2 + index * Math.PI / 5;
    return `${cx + Math.cos(angle) * radius},${cy + Math.sin(angle) * radius}`;
  });
  return `M${points.join("L")}Z`;
};

const renderStar = ({ color, cx = 50, cy = 50, r = 10, stroke }) =>
  `<path d="${starPath(cx, cy, r)}" fill="${color}"${stroke ? ` stroke="${stroke}" stroke-width="3"` : ""}/>`;

const renderUnionJack = (x, y, width, height) => {
  const hStripe = height * 0.18;
  const vStripe = width * 0.18;
  return [
    rect(`x="${x}" y="${y}" width="${width}" height="${height}" fill="#012169"`),
    `<path d="M${x} ${y} ${x + width} ${y + height}M${x + width} ${y} ${x} ${y + height}" stroke="#ffffff" stroke-width="${height * 0.22}"/>`,
    `<path d="M${x} ${y} ${x + width} ${y + height}M${x + width} ${y} ${x} ${y + height}" stroke="#c8102e" stroke-width="${height * 0.1}"/>`,
    rect(`x="${x}" y="${y + height / 2 - hStripe / 2}" width="${width}" height="${hStripe}" fill="#ffffff"`),
    rect(`x="${x + width / 2 - vStripe / 2}" y="${y}" width="${vStripe}" height="${height}" fill="#ffffff"`),
    rect(`x="${x}" y="${y + height / 2 - hStripe * 0.45 / 2}" width="${width}" height="${hStripe * 0.45}" fill="#c8102e"`),
    rect(`x="${x + width / 2 - vStripe * 0.45 / 2}" y="${y}" width="${vStripe * 0.45}" height="${height}" fill="#c8102e"`)
  ].join("");
};

const renderMark = (mark) => {
  if (!mark) return "";
  if (mark.shape === "circle") {
    return `<circle cx="${mark.cx ?? 50}" cy="${mark.cy ?? 50}" r="${mark.r ?? 10}" fill="${mark.color}"/>`;
  }
  if (mark.shape === "star") return renderStar(mark);
  if (mark.shape === "starOutline") {
    return `<path d="${starPath(mark.cx ?? 50, mark.cy ?? 50, mark.r ?? 16)}" fill="none" stroke="${mark.color}" stroke-width="5" stroke-linejoin="round"/>`;
  }
  if (mark.shape === "stars") {
    return mark.points.map(([cx, cy, r]) => renderStar({ color: mark.color, cx, cy, r, stroke: mark.stroke })).join("");
  }
  if (mark.shape === "crescent") {
    const cx = mark.cx ?? 50;
    const cy = mark.cy ?? 50;
    const r = mark.r ?? 14;
    const crescent = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${mark.color}"/><circle cx="${cx + r * 0.42}" cy="${cy - r * 0.06}" r="${r * 0.82}" fill="${mark.cutout}"/>`;
    const star = mark.star ? renderStar({ color: mark.color, cx: cx + r * 1.1, cy, r: r * 0.38 }) : "";
    return crescent + star;
  }
  if (mark.shape === "leaf") {
    return `<path d="M50 32 53 45 61 43 57 52 64 54 55 56 53 61 52 61 52 68 48 68 48 61 47 61 45 56 36 54 43 52 39 43 47 45Z" fill="${mark.color}"/>`;
  }
  if (mark.shape === "checker") {
    const size = 8;
    let body = "";
    for (let row = 0; row < 4; row += 1) {
      for (let col = 0; col < 4; col += 1) {
        body += rect(`x="${34 + col * size}" y="${34 + row * size}" width="${size}" height="${size}" fill="${mark.colors[(row + col) % 2]}"`);
      }
    }
    return body;
  }
  if (mark.shape === "box") {
    return rect(`x="36" y="40" width="28" height="20" fill="${mark.color}"${mark.stroke ? ` stroke="${mark.stroke}" stroke-width="3"` : ""}`);
  }
  if (mark.shape === "panamaStars") {
    return renderStar({ color: "#005293", cx: 25, cy: 25, r: 8 }) + renderStar({ color: "#d21034", cx: 75, cy: 75, r: 8 });
  }
  if (mark.shape === "sword") {
    return `<path d="M24 66H76" stroke="${mark.color}" stroke-width="5" stroke-linecap="round"/><path d="M70 62 78 66 70 70Z" fill="${mark.color}"/>`;
  }
  if (mark.shape === "taegeuk") {
    return `<path d="M50 34a16 16 0 1 1 0 32 8 8 0 1 0 0-16 8 8 0 1 1 0-16Z" fill="#c60c30"/><path d="M50 66a16 16 0 1 1 0-32 8 8 0 1 0 0 16 8 8 0 1 1 0 16Z" fill="#003478"/>`;
  }
  return "";
};

const renderFlag = (flag) => {
  let body = "";
  if (flag.type === "horizontal") body += renderStripes(flag.colors);
  if (flag.type === "vertical") {
    if (flag.split) {
      body += rect(`x="0" y="0" width="${flag.split * 100}" height="100" fill="${flag.colors[0]}"`);
      body += rect(`x="${flag.split * 100}" y="0" width="${100 - flag.split * 100}" height="100" fill="${flag.colors[1]}"`);
    } else {
      body += renderStripes(flag.colors, true);
    }
  }
  if (flag.type === "solid") body += rect(`x="0" y="0" width="100" height="100" fill="${flag.color}"`);
  if (flag.type === "cross") {
    const crossX = flag.crossX ?? 41;
    const innerCrossX = crossX + 4;
    body += rect(`x="0" y="0" width="100" height="100" fill="${flag.base}"`);
    body += rect(`x="0" y="41" width="100" height="18" fill="${flag.cross}"`);
    body += rect(`x="${crossX}" y="0" width="18" height="100" fill="${flag.cross}"`);
    if (flag.innerCross) {
      body += rect(`x="0" y="45" width="100" height="10" fill="${flag.innerCross}"`);
      body += rect(`x="${innerCrossX}" y="0" width="10" height="100" fill="${flag.innerCross}"`);
    }
  }
  if (flag.type === "saltire") {
    body += rect(`x="0" y="0" width="100" height="100" fill="${flag.base}"`);
    body += `<path d="M0 18 100 82M100 18 0 82" stroke="${flag.cross}" stroke-width="12" stroke-linecap="butt"/>`;
  }
  if (flag.type === "swiss") {
    body += rect(`x="0" y="0" width="100" height="100" fill="${flag.base}"`);
    body += rect(`x="42" y="22" width="16" height="56" fill="${flag.cross}"`);
    body += rect(`x="22" y="42" width="56" height="16" fill="${flag.cross}"`);
  }
  if (flag.type === "quarters") {
    body += rect(`x="0" y="0" width="50" height="50" fill="${flag.colors[0]}"`);
    body += rect(`x="50" y="0" width="50" height="50" fill="${flag.colors[1]}"`);
    body += rect(`x="0" y="50" width="50" height="50" fill="${flag.colors[2]}"`);
    body += rect(`x="50" y="50" width="50" height="50" fill="${flag.colors[3]}"`);
  }
  if (flag.type === "diagonal") {
    body += rect(`x="0" y="0" width="100" height="100" fill="${flag.color}"`);
    body += `<path d="M-10 108 108 -10" stroke="${flag.stripe}" stroke-width="28"/>`;
    body += `<path d="M-10 108 108 -10" stroke="${flag.stripe2}" stroke-width="12"/>`;
  }
  if (flag.type === "australia") {
    body += rect(`x="0" y="0" width="100" height="100" fill="#012169"`);
    body += renderUnionJack(0, 0, 48, 42);
    body += renderStar({ color: "#ffffff", cx: 24, cy: 72, r: 10 });
    body += renderStar({ color: "#ffffff", cx: 70, cy: 22, r: 5 });
    body += renderStar({ color: "#ffffff", cx: 83, cy: 42, r: 5 });
    body += renderStar({ color: "#ffffff", cx: 70, cy: 62, r: 5 });
    body += renderStar({ color: "#ffffff", cx: 56, cy: 48, r: 5 });
    body += renderStar({ color: "#ffffff", cx: 83, cy: 78, r: 4 });
  }
  if (flag.type === "curacao") {
    body += rect(`x="0" y="0" width="100" height="100" fill="#002b7f"`);
    body += rect(`x="0" y="72" width="100" height="10" fill="#f9e814"`);
    body += renderStar({ color: "#ffffff", cx: 32, cy: 28, r: 8 });
    body += renderStar({ color: "#ffffff", cx: 47, cy: 38, r: 5 });
  }
  if (flag.type === "newZealand") {
    body += rect(`x="0" y="0" width="100" height="100" fill="#00247d"`);
    body += renderUnionJack(0, 0, 48, 42);
    body += renderStar({ color: "#cc142b", stroke: "#ffffff", cx: 68, cy: 28, r: 6 });
    body += renderStar({ color: "#cc142b", stroke: "#ffffff", cx: 84, cy: 50, r: 5 });
    body += renderStar({ color: "#cc142b", stroke: "#ffffff", cx: 68, cy: 72, r: 5 });
    body += renderStar({ color: "#cc142b", stroke: "#ffffff", cx: 52, cy: 58, r: 5 });
  }
  if (flag.type === "bosnia") {
    body += rect(`x="0" y="0" width="100" height="100" fill="#002395"`);
    body += `<path d="M42 0 100 0 100 100Z" fill="#fecb00"/>`;
    body += renderStar({ color: "#ffffff", cx: 34, cy: 7, r: 4 });
    body += renderStar({ color: "#ffffff", cx: 42, cy: 20, r: 4 });
    body += renderStar({ color: "#ffffff", cx: 50, cy: 33, r: 4 });
    body += renderStar({ color: "#ffffff", cx: 58, cy: 46, r: 4 });
    body += renderStar({ color: "#ffffff", cx: 66, cy: 59, r: 4 });
    body += renderStar({ color: "#ffffff", cx: 74, cy: 72, r: 4 });
    body += renderStar({ color: "#ffffff", cx: 82, cy: 85, r: 4 });
  }
  if (flag.type === "capeVerde") {
    body += rect(`x="0" y="0" width="100" height="100" fill="#003893"`);
    body += rect(`x="0" y="50" width="100" height="20" fill="#ffffff"`);
    body += rect(`x="0" y="57" width="100" height="6" fill="#cf2027"`);
    body += Array.from({ length: 10 }, (_, index) => {
      const angle = -Math.PI / 2 + index * Math.PI * 2 / 10;
      return renderStar({
        color: "#f7d116",
        cx: 34 + Math.cos(angle) * 15,
        cy: 58 + Math.sin(angle) * 15,
        r: 3
      });
    }).join("");
  }
  if (flag.type === "uruguay") {
    body += renderStripes(["#ffffff", "#0038a8", "#ffffff", "#0038a8", "#ffffff", "#0038a8", "#ffffff", "#0038a8", "#ffffff"]);
    body += rect(`x="0" y="0" width="42" height="45" fill="#ffffff"`);
    body += `<circle cx="21" cy="22.5" r="10" fill="#fcd116"/>`;
  }
  if (flag.type === "southAfrica") {
    body += rect(`x="0" y="0" width="100" height="50" fill="#de3831"`);
    body += rect(`x="0" y="50" width="100" height="50" fill="#002395"`);
    body += `<path d="M0 2 48 50H100M0 98 48 50" fill="none" stroke="#ffffff" stroke-width="30" stroke-linejoin="round"/>`;
    body += `<path d="M0 12 43 50H100M0 88 43 50" fill="none" stroke="#007a4d" stroke-width="18" stroke-linejoin="round"/>`;
    body += `<path d="M0 8 28 50 0 92Z" fill="#000000"/>`;
    body += `<path d="M0 18 32 50 0 82" fill="none" stroke="#ffb612" stroke-width="7" stroke-linecap="butt" stroke-linejoin="miter"/>`;
  }
  if (flag.triangle) body += `<path d="M0 0 48 50 0 100Z" fill="${flag.triangle}"/>`;
  if (flag.diamond) body += `<path d="M50 15 86 50 50 85 14 50Z" fill="${flag.diamond}"/>`;
  if (flag.disc) body += `<circle cx="50" cy="50" r="24" fill="${flag.disc}"/>`;
  if (flag.canton) body += rect(`x="0" y="0" width="42" height="54" fill="${flag.canton}"`);
  body += renderMark(flag.mark);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img">${body}</svg>\n`;
};

for (const [slug, flag] of Object.entries(flags)) {
  writeFileSync(join(outDir, `${slug}.svg`), renderFlag(flag));
}
