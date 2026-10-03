// Builds a self-contained static preview (dist-preview/) of the app shell + world.
// Same components as the Next.js app; next/dynamic is shimmed with React.lazy.
import { build } from "esbuild";
import { execSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const out = resolve(root, "dist-preview");
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

await build({
  entryPoints: [resolve(root, "src/preview/main.tsx")],
  bundle: true,
  minify: true,
  format: "iife",
  target: "es2020",
  jsx: "automatic",
  outfile: resolve(out, "app.js"),
  alias: { "@": resolve(root, "src"), "next/dynamic": resolve(root, "src/preview/dynamic-shim.tsx") },
  define: { "process.env.NODE_ENV": '"production"' },
  loader: { ".json": "json" },
  logLevel: "warning",
});

execSync(`npx @tailwindcss/cli -i src/app/globals.css -o dist-preview/app.css --minify`, { cwd: root, stdio: "inherit" });

const font = readFileSync(resolve(root, "node_modules/@fontsource-variable/nunito/files/nunito-latin-wght-normal.woff2")).toString("base64");
cpSync(resolve(root, "public/assets"), resolve(out, "assets"), { recursive: true });

writeFileSync(
  resolve(out, "index.html"),
  `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="theme-color" content="#fbf4ec" />
<title>Cibu</title>
<style>@font-face{font-family:"Nunito Variable";font-style:normal;font-display:swap;font-weight:200 1000;src:url(data:font/woff2;base64,${font}) format("woff2")}</style>
<link rel="stylesheet" href="app.css" />
</head>
<body class="h-full font-sans antialiased">
<div id="root"></div>
<script>window.__CIBU_ASSET_BASE__ = ".";</script>
<script src="app.js"></script>
</body>
</html>
`,
);
// artifact variant: page content only (the host adds the document skeleton)
writeFileSync(
  resolve(out, "cibu.html"),
  `<title>Cibu</title>
<style>@font-face{font-family:"Nunito Variable";font-style:normal;font-display:swap;font-weight:200 1000;src:url(data:font/woff2;base64,${font}) format("woff2")}
html,body{height:100%;margin:0;background:#fbf4ec;font-family:"Nunito Variable",ui-rounded,system-ui,sans-serif}</style>
<link rel="stylesheet" href="app.css" />
<div id="root"></div>
<script>window.__CIBU_ASSET_BASE__ = ".";</script>
<script src="app.js"></script>
`,
);
rmSync(resolve(out, "assets/cibu/wear"), { recursive: true, force: true });
console.log("preview built →", out);
