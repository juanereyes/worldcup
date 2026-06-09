import { cp, copyFile } from "node:fs/promises";
import { join } from "node:path";

const pages = [
  "groups.html",
  "matches.html",
  "bracket.html",
  "lobby.html",
  "my-lobbies.html",
  "predictions.html",
  "point-system.html",
  "custom-settings.html"
];

await Promise.all(
  pages.map((page) => copyFile(join("dist", "index.html"), join("dist", page)))
);

await cp(join("assets", "flags"), join("dist", "assets", "flags"), {
  recursive: true
});
