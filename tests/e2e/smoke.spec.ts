import { expect, test } from "@playwright/test";

test("landing, sample disclosure and explore destination", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page).toHaveTitle("SECTOR — A different view of the race");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Every fraction.Tells a story.",
  );
  await expect(page.getByText("SAMPLE DATA / DESIGN PREVIEW")).toBeVisible();
  await page.getByRole("link", { name: "Explore SECTOR" }).click();
  await expect(page).toHaveURL(/#platform$/);
  await expect(
    page.getByRole("heading", { name: "Follow your curiosity." }),
  ).toBeInViewport();
  await page.mouse.move(0, 0);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    path: testInfo.outputPath("landing.png"),
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("all navigation destinations work and show their current state", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  for (const [label, path] of [
    ["Calendar", "/calendar"],
    ["Championship", "/championship"],
    ["Race Center", "/race-center"],
    ["Telemetry Lab", "/telemetry-lab"],
    ["Overview", "/"],
  ]) {
    if (testInfo.project.name === "mobile")
      await page.getByRole("button", { name: "Open navigation" }).click();
    const nav = page.getByRole("navigation", {
      name:
        testInfo.project.name === "mobile"
          ? "Mobile navigation"
          : "Main navigation",
      exact: true,
    });
    await nav
      .getByRole("link", {
        name: label,
        exact: testInfo.project.name !== "mobile",
      })
      .click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    if (path !== "/") {
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        `${label}.`,
      );
      await expect(
        page.getByText("This part of SECTOR is in development.", {
          exact: false,
        }),
      ).toBeVisible();
      await expect(page).toHaveTitle(`${label} — SECTOR`);
    }
    if (testInfo.project.name === "mobile")
      await expect(page.getByRole("dialog")).toHaveCount(0);
    else
      await expect(
        nav.getByRole("link", { name: label, exact: true }),
      ).toHaveAttribute("aria-current", "page");
  }
});

test("keyboard skip link and mobile dialog focus behavior", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
  if (testInfo.project.name === "mobile") {
    const trigger = page.getByRole("button", { name: "Open navigation" });
    await trigger.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Shift+Tab");
    await expect(
      page.getByRole("dialog").getByRole("link", { name: /Telemetry Lab/ }),
    ).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(trigger).toBeFocused();
  }
});

test("responsive layouts do not overflow at supported widths", async ({
  page,
}) => {
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.goto("/championship");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
});

test("reduced motion and unknown routes have usable fallbacks", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  expect(
    await page.evaluate(
      () => getComputedStyle(document.documentElement).scrollBehavior,
    ),
  ).toBe("auto");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const response = await page.goto("/unknown-route");
  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { name: "Off the racing line." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Back to overview" }).click();
  await expect(page).toHaveURL("/");
});
