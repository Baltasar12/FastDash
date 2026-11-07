import { expect, test } from "@playwright/test";

test("the streaming dashboard exposes loading before provider availability resolves", async ({
  page,
}, testInfo) => {
  const season = testInfo.project.name === "mobile" ? 2023 : 2024;
  await page.goto(`/overview?season=${season}`, { waitUntil: "commit" });
  await expect(
    page.getByRole("status").filter({ hasText: "Loading the season overview" }),
  ).toBeVisible();
  await expect(page.getByText("Loading the season overview…")).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Season");
  await expect(page.getByText("Data unavailable").first()).toBeVisible();
});

test("Overview and Race Center preserve season/event context in shareable URLs", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/overview?season=2026");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Season");
  await expect(
    page.getByRole("heading", { name: "Next on calendar" }),
  ).toBeVisible();
  await expect(page.getByText("Next Example Grand Prix")).toBeVisible();
  await expect(page.getByText("Published Example Grand Prix")).toBeVisible();
  await expect(page.getByText(/Finality unknown/).first()).toBeVisible();
  await page.getByRole("link", { name: /Explore race results/ }).click();
  await expect(page).toHaveURL(/\/race-center\?season=2026&round=1/);
  await expect(
    page.getByRole("heading", { name: "Published Example Grand Prix" }),
  ).toBeVisible();
  await expect(page.getByRole("table")).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Published Example Grand Prix" }),
  ).toBeVisible();
  await page.getByRole("link", { name: /Back to season overview/ }).click();
  await expect(page).toHaveURL(/\/overview\?season=2026$/);
  expect(errors).toEqual([]);
});

test("qualifying remains accessible without a reported calendar session", async ({
  page,
}) => {
  await page.goto("/race-center?season=2026&round=1&session=qualifying");
  await expect(
    page.getByRole("heading", { name: "Qualifying results", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(/Qualifying is not listed in the reported schedule/),
  ).toBeVisible();
  await expect(page.getByRole("table")).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^Qualifying\s*Status/ }),
  ).toHaveCount(0);
  await expect(page.getByText(/Scheduled start:/)).toHaveCount(0);
  await page.goto("/race-center?season=2026&round=2&session=qualifying");
  await expect(
    page.getByRole("heading", { name: "Qualifying results unavailable" }),
  ).toBeVisible();
  await expect(page.getByRole("table")).toHaveCount(0);
});

test("reported selectors keep URLs shareable and sprint never substitutes main-race results", async ({
  page,
}) => {
  await page.goto("/race-center?season=2026&round=3");
  await page
    .getByRole("button", { name: /^Qualifying\s*Status unknown/ })
    .click();
  await expect(page).toHaveURL(/season=2026&round=3&session=qualifying/);
  await expect(page.getByRole("table")).toBeVisible();
  await page.getByRole("button", { name: /^Sprint\s*Status unknown/ }).click();
  await expect(page).toHaveURL(/session=sprint/);
  await expect(
    page.getByText(/practice and sprint results are not/),
  ).toBeVisible();
  await expect(page.getByRole("table")).toHaveCount(0);
});

test("invalid selectors and failed requests remain explicit with no sample fallback", async ({
  page,
}) => {
  for (const query of [
    "season=2026&round=0",
    "season=2026&season=2025",
    "season=2026&round=1&session=telemetry",
  ]) {
    await page.goto(`/race-center?${query}`);
    await expect(
      page.getByRole("heading", { name: "Selection unavailable" }),
    ).toBeVisible();
    await expect(page.getByRole("table")).toHaveCount(0);
  }
  await page.goto("/overview?season=invalid");
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(
    "Invalid season. Use one year from 1950 to 9999.",
  );
  await page.goto("/overview?season=2025");
  await expect(
    page.getByText(/Jolpica could not be reached/).first(),
  ).toBeVisible();
  await expect(
    page.getByText(/Synthetic preview|Synthetic sample/),
  ).toHaveCount(0);
  await expect(page.getByRole("table")).toHaveCount(0);
});

test("dashboard keyboard, reduced motion and layouts work at 320, 768 and 1440px", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of [
      "/overview?season=2026",
      "/race-center?season=2026&round=1&session=qualifying",
    ]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      expect(
        await page.evaluate(
          () => getComputedStyle(document.documentElement).scrollBehavior,
        ),
      ).toBe("auto");
      await page.screenshot({
        path: testInfo.outputPath(
          `${path.startsWith("/overview") ? "overview" : "race-center"}-${width}.png`,
        ),
        fullPage: true,
      });
    }
  }
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/overview?season=2026");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
  const season = page.getByLabel("Season", { exact: true });
  await season.focus();
  await expect(season).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "View season" })).toBeFocused();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Open navigation" }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("link", { name: /Race Center/ })
    .click();
  await expect(page).toHaveURL(/\/race-center$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
