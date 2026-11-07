import { expect, test } from "@playwright/test";

test("explores events, selects qualifying and never substitutes sprint results", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(page.getByRole("table")).toBeVisible();
  await page.getByLabel("Grand Prix", { exact: true }).selectOption("2");
  await page.getByRole("button", { name: "Explore Grand Prix" }).click();
  await expect(page).toHaveURL(/round=2/);
  await expect(
    page.getByText("Sample Ridge Circuit", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /sample practice-3/i }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: /sample sprint-qualifying/i }).click();
  await expect(page).toHaveURL(/session=sprint-qualifying/);
  await expect(page.getByRole("table")).toHaveCount(0);
  await expect(
    page.getByText(/practice and sprint results are not/i),
  ).toBeVisible();
  await page.getByRole("button", { name: /^sample qualifying/i }).click();
  await expect(
    page.getByRole("columnheader", { name: "Q1", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("columnheader", { name: "Q2", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("columnheader", { name: "Q3", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "No time", exact: true }),
  ).toBeVisible();
  const constructor = page.getByLabel("Constructor", { exact: true });
  await constructor.selectOption({ label: "Sample Alder Racing" });
  await expect(page.getByRole("row")).toHaveCount(2);
  await expect(
    page.getByRole("cell", { name: "No time", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.getByRole("row")).toHaveCount(3);
  await expect(constructor).toHaveValue("");
});

test("filters results and recovers from an empty local search", async ({
  page,
}) => {
  await page.goto("/");
  const search = page.getByLabel("Search drivers or constructors");
  await search.fill("aria");
  await expect(page.getByRole("row")).toHaveCount(2);
  await expect(page.getByText("Aria Sample", { exact: true })).toBeVisible();
  await search.fill("no matching driver");
  await expect(page.getByText(/no.*match/i)).toBeVisible();
  await search.fill("");
  await expect(page.getByRole("row")).toHaveCount(7);
  await expect(
    page.getByRole("cell", { name: "DSQ", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "Pit lane", exact: true }),
  ).toBeVisible();
});

for (const width of [320, 768, 1440]) {
  test(`keeps readable tables and native scrolling at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByLabel("Season", { exact: true })).toBeVisible();
    await expect(page.getByRole("table")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    const region = page.getByRole("region", { name: /results/i });
    await expect(region).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: /points/i }),
    ).toHaveCount(1);
    const firstEntry = page.getByRole("row").nth(1);
    const firstEntryBounds = await firstEntry.boundingBox();
    expect(firstEntryBounds?.height).toBeLessThan(180);
    const constructorCell = page
      .getByRole("cell", { name: "Sample Alder Racing", exact: true })
      .first();
    const constructorLines = await constructorCell.evaluate((element) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      return range.getClientRects().length;
    });
    expect(constructorLines).toBeGreaterThan(0);
    expect(constructorLines).toBeLessThanOrEqual(3);
    await page.screenshot({
      path: test.info().outputPath(`race-center-${width}.png`),
      fullPage: true,
    });
  });
}

test("supports keyboard filtering, visible focus, skip navigation and reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
  const driver = page.locator("summary").filter({ hasText: "Aria Sample" });
  await driver.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByText("Racing number: 12", { exact: true }),
  ).toBeVisible();
  await expect(driver).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    page.getByText("Racing number: 12", { exact: true }),
  ).toBeHidden();
  await expect(driver).toBeFocused();
  const region = page.getByRole("region", { name: /results/i });
  await region.focus();
  await page.keyboard.press("ArrowRight");
  await expect
    .poll(() => region.evaluate((element) => element.scrollLeft))
    .toBeGreaterThan(0);
  const search = page.getByLabel("Search drivers or constructors");
  expect(
    await search.evaluate(
      (element) =>
        element instanceof HTMLInputElement && element.labels?.length,
    ),
  ).toBe(1);
  const constructor = page.getByLabel("Constructor", { exact: true });
  expect(
    await constructor.evaluate(
      (element) =>
        element instanceof HTMLSelectElement && element.labels?.length,
    ),
  ).toBe(1);
  await search.focus();
  await page.keyboard.type("aria");
  await expect(page.getByRole("row")).toHaveCount(2);
  expect(
    await search.evaluate((element) => getComputedStyle(element).outlineStyle),
  ).not.toBe("none");
  expect(
    await search.evaluate((element) =>
      parseFloat(getComputedStyle(element).transitionDuration),
    ),
  ).toBe(0);
  expect(
    await page.evaluate(
      () => getComputedStyle(document.documentElement).scrollBehavior,
    ),
  ).toBe("auto");
});

test("supports touch selection with sufficiently large controls", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:3101/");
  const qualifying = page.getByRole("button", { name: /^sample qualifying/i });
  const bounds = await qualifying.boundingBox();
  expect(bounds?.height).toBeGreaterThanOrEqual(44);
  await qualifying.tap();
  await expect(
    page.getByRole("columnheader", { name: "Q1", exact: true }),
  ).toBeVisible();
  await context.close();
});

test("exposes synthetic, stale, partial and provisional status at display", async ({
  page,
}) => {
  await page.goto("/?scenario=stale");
  await expect(page.getByText(/synthetic sample/i).first()).toBeVisible();
  await expect(page.getByText(/stale/i).first()).toBeVisible();
  await expect(page.getByText(/2099-05-01T12:00:00Z/).first()).toBeVisible();
  await page.goto("/?scenario=partial");
  await expect(page.getByText(/partial/i).first()).toBeVisible();
  await expect(page.getByText(/provisional/i).first()).toBeVisible();
  await expect(page.getByRole("table")).toHaveCount(0);
});

test("distinguishes confirmed empty, unavailable and operational failure", async ({
  page,
}) => {
  for (const scenario of ["empty", "not-published", "error"]) {
    await page.goto(`/?scenario=${scenario}`);
    await expect(page.getByRole("table")).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByText(/synthetic sample/i).first()).toBeVisible();
  }
});
