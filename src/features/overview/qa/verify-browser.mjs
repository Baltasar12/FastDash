/**
 * Run after pnpm build: node src/features/overview/qa/verify-browser.mjs
 * Tests isolated SSR feature markup; it does not claim app route integration.
 * Production shared CSS/fonts are served unchanged; Vite compiles feature CSS.
 * Screenshots and evidence are written only to the operating-system temp folder.
 */
import assert from "node:assert/strict";
import { cp, mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import react from "@vitejs/plugin-react";
import { createServer } from "vite";

const projectRoot = path.resolve(
  fileURLToPath(new URL("../../../../", import.meta.url)),
);
const staticRoot = path.join(projectRoot, ".next", "static");
const staticFiles = await readdir(staticRoot, { recursive: true });
const cssFiles = staticFiles.filter((file) => file.endsWith(".css"));
assert(cssFiles.length > 0, "Run pnpm build before browser verification.");
const pageHtml = await readFile(
  path.join(projectRoot, ".next", "server", "app", "index.html"),
  "utf8",
);
const fontClasses = /<html[^>]*class="([^"]*)"/.exec(pageHtml)?.[1] ?? "";
const output = await mkdtemp(path.join(tmpdir(), "sector-overview-qa-"));
const evidence = [];
const browserErrors = [];
const renderedPages = new Map();

const vite = await createServer({
  root: projectRoot,
  configFile: false,
  plugins: [
    react(),
    {
      name: "sector-overview-isolated-qa",
      configureServer(server) {
        server.middlewares.use(async (request, response, next) => {
          const url = new URL(request.url ?? "/", "http://127.0.0.1");
          if (url.pathname.startsWith("/_next/static/")) {
            const asset = path.resolve(
              staticRoot,
              decodeURIComponent(url.pathname.slice("/_next/static/".length)),
            );
            if (!asset.startsWith(`${staticRoot}${path.sep}`)) {
              response.writeHead(404).end();
              return;
            }
            response.setHeader(
              "Content-Type",
              asset.endsWith(".css") ? "text/css" : "font/woff2",
            );
            const stream = createReadStream(asset);
            stream.on("error", () => response.writeHead(404).end());
            stream.pipe(response);
            return;
          }
          if (url.pathname !== "/__overview-qa") return next();
          try {
            const preview = await server.ssrLoadModule(
              "/src/features/overview/qa/preview.tsx",
            );
            const markup = await preview.renderPreview(url.searchParams);
            const links = cssFiles
              .map(
                (file) =>
                  `<link rel="stylesheet" href="/_next/static/${file.replaceAll(path.sep, "/")}">`,
              )
              .join("");
            response.setHeader("Content-Type", "text/html; charset=utf-8");
            const html = `<!doctype html><html lang="en" class="${fontClasses}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SECTOR isolated Overview verification</title>${links}<link rel="stylesheet" href="/src/features/overview/overview.module.css?direct"></head><body><a class="skip-link" href="#main-content">Skip to content</a><main id="main-content" tabindex="-1"><div class="container">${markup}</div></main></body></html>`;
            renderedPages.set(
              url.searchParams.get("scenario") ?? "success",
              html,
            );
            response.end(html);
          } catch (error) {
            server.ssrFixStacktrace(error);
            response.writeHead(500).end(String(error));
          }
        });
      },
    },
  ],
  resolve: { alias: { "@": path.join(projectRoot, "src") } },
  server: { host: "127.0.0.1", port: 0, strictPort: false },
});

let browser;
try {
  await vite.listen();
  const address = vite.httpServer?.address();
  assert(address && typeof address !== "string");
  const origin = `http://127.0.0.1:${address.port}`;
  browser = await chromium.launch();
  const context = await browser.newContext();
  await context.route("**/*", (route) => {
    return route.request().url().startsWith(origin)
      ? route.continue()
      : route.abort("blockedbyclient");
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => browserErrors.push(error.message));

  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const scenario of [
      "success",
      "long-names",
      "loading",
      "empty",
      "not-covered",
      "error",
      "stale",
      "partial",
      "event-stale",
      "mixed-synthetic-event",
      "mixed-external-event",
    ]) {
      const response = await page.goto(
        `${origin}/__overview-qa?scenario=${scenario}`,
      );
      assert.equal(response?.status(), 200, `${scenario} SSR response`);
      await page.evaluate(() => document.fonts.ready);
      const dimensions = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        scroll: document.documentElement.scrollWidth,
      }));
      assert(
        dimensions.scroll <= dimensions.viewport,
        `Overflow in ${scenario} at ${width}px: ${JSON.stringify(dimensions)}`,
      );
      assert.equal(await page.locator("h1").count(), 1, "One meaningful h1");
      if (
        scenario === "success" ||
        scenario === "long-names" ||
        scenario === "stale"
      ) {
        const nextRegion = page.getByRole("region", {
          name: "Next Grand Prix",
        });
        const title = await nextRegion
          .getByRole("heading", { level: 3 })
          .boundingBox();
        const round = await nextRegion
          .locator('span[aria-hidden="true"]')
          .boundingBox();
        assert(title && round);
        const overlaps =
          title.x < round.x + round.width &&
          title.x + title.width > round.x &&
          title.y < round.y + round.height &&
          title.y + title.height > round.y;
        assert.equal(
          overlaps,
          false,
          `Decorative round must not overlap the next-event title at ${width}px`,
        );
      }
      const accessibility = await page.evaluate(() => {
        const ids = [...document.querySelectorAll("[id]")].map(
          (element) => element.id,
        );
        const hiddenOverflow = [...document.querySelectorAll("main *")]
          .filter((element) => {
            const style = getComputedStyle(element);
            return (
              style.textOverflow === "ellipsis" ||
              (style.webkitLineClamp !== "none" && style.webkitLineClamp !== "")
            );
          })
          .map((element) => element.textContent?.trim());
        function rgb(color) {
          return (color.match(/[\d.]+/g) ?? []).map(Number);
        }
        function luminance(channels) {
          return channels
            .slice(0, 3)
            .map((value) => {
              const normalized = value / 255;
              return normalized <= 0.04045
                ? normalized / 12.92
                : ((normalized + 0.055) / 1.055) ** 2.4;
            })
            .reduce(
              (sum, value, index) =>
                sum + value * [0.2126, 0.7152, 0.0722][index],
              0,
            );
        }
        const contrastFailures = [];
        for (const element of document.querySelectorAll("main *")) {
          if (element.closest('[aria-hidden="true"]')) continue;
          if (
            ![...element.childNodes].some(
              (node) =>
                node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
            )
          )
            continue;
          const style = getComputedStyle(element);
          if (
            !element.getBoundingClientRect().width ||
            !element.getBoundingClientRect().height ||
            style.visibility === "hidden"
          )
            continue;
          if (element.closest(":disabled")) continue;
          let background = element;
          let backgroundColor = rgb(
            getComputedStyle(background).backgroundColor,
          );
          while (
            background.parentElement &&
            (backgroundColor[3] === 0 || backgroundColor.length < 3)
          ) {
            background = background.parentElement;
            backgroundColor = rgb(getComputedStyle(background).backgroundColor);
          }
          if (backgroundColor[3] === 0) backgroundColor = [242, 240, 233];
          const foregroundColor = rgb(style.color);
          const light = luminance(foregroundColor);
          const dark = luminance(backgroundColor);
          const ratio =
            (Math.max(light, dark) + 0.05) / (Math.min(light, dark) + 0.05);
          const large =
            parseFloat(style.fontSize) >= 24 ||
            (parseFloat(style.fontSize) >= 18.66 &&
              Number(style.fontWeight) >= 700);
          if (ratio < (large ? 3 : 4.5))
            contrastFailures.push({
              text: element.textContent?.trim().slice(0, 80),
              ratio,
              color: style.color,
              background: getComputedStyle(background).backgroundColor,
            });
        }
        return {
          duplicateIds: ids.filter((id, index) => ids.indexOf(id) !== index),
          hiddenOverflow,
          contrastFailures,
        };
      });
      assert.deepEqual(accessibility.duplicateIds, [], "Unique accessible IDs");
      assert.deepEqual(
        accessibility.hiddenOverflow,
        [],
        "No name truncation or line clamping",
      );
      assert.deepEqual(
        accessibility.contrastFailures,
        [],
        `Text contrast in ${scenario} at ${width}px`,
      );
      if (scenario !== "loading") {
        assert.match(await page.locator("main").innerText(), /synthetic/i);
      }
      if (scenario === "event-stale") {
        const results = page.getByRole("region", {
          name: "Latest race results.",
        });
        assert.equal(await results.getByRole("table").count(), 1);
        const event = results.getByRole("group", {
          name: "Event context provenance",
        });
        const classification = results.getByRole("group", {
          name: "Classification provenance",
        });
        assert.match(await event.innerText(), /Stale snapshot/);
        assert.match(await event.innerText(), /Provisional/);
        assert.match(await event.innerText(), /Partial dataset/);
        assert.match(await classification.innerText(), /Source marked final/);
        assert.match(
          await classification.innerText(),
          /Complete supplied dataset/,
        );
      }
      if (
        scenario === "mixed-synthetic-event" ||
        scenario === "mixed-external-event"
      ) {
        const results = page.getByRole("region", {
          name: "Latest race results.",
        });
        assert.equal(await results.getByRole("table").count(), 0);
        assert.match(
          await results.getByRole("status").innerText(),
          /different source kinds/,
        );
        assert.equal(
          await results.getByText("Synthetic preview", { exact: true }).count(),
          scenario === "mixed-synthetic-event" ? 1 : 0,
        );
        const event = results.getByRole("group", {
          name: "Event context provenance",
        });
        const classification = results.getByRole("group", {
          name: "Classification provenance",
        });
        assert.match(
          await event.innerText(),
          scenario === "mixed-synthetic-event"
            ? /SYNTHETIC SAMPLE/
            : /External provider test double/,
        );
        assert.match(
          await classification.innerText(),
          scenario === "mixed-synthetic-event"
            ? /External provider test double/
            : /SYNTHETIC SAMPLE/,
        );
      }
      const screenshot = path.join(output, `${scenario}-${width}.png`);
      await page.screenshot({ path: screenshot, fullPage: true });
      evidence.push({
        scenario,
        width,
        ...dimensions,
        screenshot,
        accessibility,
      });
    }
  }

  await page.goto(`${origin}/__overview-qa?scenario=long-names`);
  await page.keyboard.press("Tab");
  assert.equal(
    await page.locator(":focus").innerText(),
    "Skip to content",
    "Skip link is the first keyboard target",
  );
  await page.keyboard.press("Enter");
  assert.equal(await page.locator(":focus").getAttribute("id"), "main-content");
  await page.keyboard.press("Tab");
  const focus = await page.locator(":focus").evaluate((element) => ({
    tag: element.tagName,
    outline: getComputedStyle(element).outlineStyle,
  }));
  assert.notEqual(focus.outline, "none", "Keyboard control has visible focus");
  const selector = page.getByRole("combobox", { name: "Season" });
  await selector.selectOption("2098");
  await page.getByRole("button", { name: /view|apply|season/i }).click();
  await page.waitForURL(/season=2098/);
  assert.match(page.url(), /season=2098/, "Native season GET form navigates");

  await page.goto(`${origin}/__overview-qa`);
  const raceLinks = await page
    .locator('a[href^="/race-center?"]')
    .evaluateAll((links) => links.map((link) => link.getAttribute("href")));
  assert(
    raceLinks.some(
      (href) => href?.includes("season=2099") && href.includes("round=2"),
    ),
  );
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  assert(
    await page.evaluate(() => window.scrollY > 0),
    "Native page scrolling works",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  const motion = await page
    .locator("main a")
    .first()
    .evaluate((element) => ({
      transition: getComputedStyle(element).transitionDuration,
      animation: getComputedStyle(element).animationName,
      scroll: getComputedStyle(document.documentElement).scrollBehavior,
    }));
  assert(
    motion.transition
      .split(",")
      .every((duration) => Number.parseFloat(duration) === 0),
  );
  assert.equal(motion.animation, "none");
  assert.notEqual(motion.scroll, "smooth");
  const touchContext = await browser.newContext({
    viewport: { width: 320, height: 900 },
    hasTouch: true,
    isMobile: true,
  });
  const touchPage = await touchContext.newPage();
  await touchPage.goto(`${origin}/__overview-qa`);
  const touchTarget = touchPage.locator('a[href^="/race-center?"]').first();
  const targetSize = await touchTarget.boundingBox();
  assert(
    targetSize && targetSize.height >= 44,
    "Touch navigation target is at least 44px tall",
  );
  await touchContext.route("**/race-center?*", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<main><h1>Isolated Race Center destination stub</h1></main>",
    }),
  );
  await touchTarget.tap();
  await touchPage.waitForURL(/\/race-center\?season=2099&round=2/);
  assert.equal(
    browserErrors.length,
    0,
    `Browser errors: ${browserErrors.join(", ")}`,
  );
  const featureCss = await fetch(
    `${origin}/src/features/overview/overview.module.css?direct`,
  ).then((response) => response.text());
  await writeFile(path.join(output, "overview.css"), featureCss);
  await cp(staticRoot, path.join(output, "_next", "static"), {
    recursive: true,
  });
  for (const [scenario, html] of renderedPages) {
    await writeFile(
      path.join(output, `${scenario}.html`),
      html
        .replaceAll('href="/_next/', 'href="./_next/')
        .replace(
          'href="/src/features/overview/overview.module.css?direct"',
          'href="./overview.css"',
        ),
    );
  }
  await writeFile(
    path.join(output, "evidence.json"),
    JSON.stringify(
      {
        mode: "isolated SSR feature; production shared CSS and fonts; feature CSS via Vite",
        routeIntegration:
          "not exercised: integration coordinator owns application routes",
        evidence,
        keyboard:
          "skip link, main focus, visible control focus, native season form",
        contextualNavigation: raceLinks,
        reducedMotion: motion,
        nativeScroll: "passed",
        touchTarget: {
          ...targetSize,
          nativeTap: "passed; isolated destination stub",
        },
        browserErrors,
      },
      null,
      2,
    ),
  );
  process.stdout.write(
    `Overview browser verification passed. Evidence: ${output}\n`,
  );
} finally {
  await browser?.close();
  await vite.close();
}
