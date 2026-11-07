import { expect, test } from "@playwright/test";

test("updates driver, lap and historical context selections without provider traffic", async ({
  page,
}) => {
  const externalRequests: string[] = [];
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("request", (request) => {
    if (!request.url().startsWith("http://127.0.0.1:3102/"))
      externalRequests.push(request.url());
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  const chart = page.getByRole("img", { name: "Speed — synthetic sample" });
  const initial = await chart.locator('[data-driver="A"]').getAttribute("d");
  await page
    .getByRole("combobox", { name: "Lap A", exact: true })
    .selectOption("13");
  await expect(chart.locator('[data-driver="A"]')).not.toHaveAttribute(
    "d",
    initial ?? "",
  );
  await page
    .getByRole("combobox", { name: "Driver A", exact: true })
    .selectOption("mercer");
  await expect(
    page.getByRole("combobox", { name: "Lap A", exact: true }),
  ).toHaveValue("8");
  await expect(
    page.getByRole("combobox", { name: "Lap B", exact: true }),
  ).toHaveValue("18");
  for (const channel of ["Speed", "Throttle", "Braking", "Gear"]) {
    await expect(
      page
        .getByRole("region", { name: channel, exact: true })
        .getByText("A / Jules Mercer / lap 8", { exact: true }),
    ).toBeVisible();
  }
  await page
    .getByRole("combobox", { name: "Historical event", exact: true })
    .selectOption("monza-2023");
  await page
    .getByRole("combobox", { name: "Session", exact: true })
    .selectOption("practice");
  await expect(chart).toBeVisible();
  const partialPath = await chart
    .locator('[data-driver="A"]')
    .getAttribute("d");
  expect(partialPath?.match(/M/g)?.length).toBeGreaterThan(1);
  await page.getByRole("button", { name: "Reset comparison" }).click();
  await expect(
    page.getByRole("combobox", { name: "Driver A", exact: true }),
  ).toHaveValue("vale");
  expect(externalRequests).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test("provides complete chart alternatives and preserves unavailable samples", async ({
  page,
}) => {
  await page.goto("/");
  for (const channel of ["Speed", "Throttle", "Braking", "Gear"]) {
    await expect(
      page.getByRole("img", { name: `${channel} — synthetic sample` }),
    ).toBeVisible();
    const chartSection = page.getByRole("region", {
      name: channel,
      exact: true,
    });
    await expect(
      chartSection.getByText("A / Alex Vale / lap 12", { exact: true }),
    ).toBeVisible();
    await expect(
      chartSection.getByText("B / Rin Sato / lap 18", { exact: true }),
    ).toBeVisible();
    await page.getByText(`View ${channel.toLowerCase()} data table`).click();
    const table = page.getByRole("table", {
      name: `${channel} — synthetic samples; elapsed from each lap start`,
    });
    await expect(table).toBeVisible();
    await expect(
      table.getByRole("columnheader", { name: "Elapsed (s)" }),
    ).toBeVisible();
    await expect(table.getByRole("row")).toHaveCount(99);
    await expect(
      table.getByRole("cell", { name: "Unavailable", exact: true }),
    ).toHaveCount(3);
    await page.getByText(`View ${channel.toLowerCase()} data table`).click();
  }
  await expect(
    page.getByRole("heading", { name: "Track-distance delta" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /Provenance.*accuracy/i }),
  ).toBeVisible();
});

test("renders manual loading, unavailable and error states with recovery and no stale charts", async ({
  page,
}) => {
  await page.goto("/");
  const preview = page.getByRole("combobox", {
    name: "State preview",
    exact: true,
  });
  for (const state of ["loading", "unavailable", "error"]) {
    await preview.selectOption(state);
    await expect(page.getByRole("img")).toHaveCount(0);
    await expect(page.getByRole("table")).toHaveCount(0);
    await expect(page.getByText(/synthetic/i).first()).toBeVisible();
    await page.screenshot({
      path: test.info().outputPath(`telemetry-${state}.png`),
      fullPage: true,
    });
    const recovery = page.getByRole("button", { name: "Return to sample" });
    await recovery.focus();
    await expect(recovery).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("img", { name: "Speed — synthetic sample" }),
    ).toBeVisible();
    await expect(preview).toBeFocused();
  }
  await page
    .getByRole("combobox", { name: "Session", exact: true })
    .selectOption("race");
  await preview.selectOption("ready");
  await expect(page.getByRole("img")).toHaveCount(0);
  const raceRecovery = page.getByRole("button", { name: "Return to sample" });
  await raceRecovery.focus();
  await expect(raceRecovery).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("combobox", { name: "Session", exact: true }),
  ).toHaveValue("qualifying");
  await expect(
    page.getByRole("img", { name: "Speed — synthetic sample" }),
  ).toBeVisible();
  await expect(preview).toBeFocused();
});

for (const width of [320, 768, 1440]) {
  test(`preserves readable content and native scrolling at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    for (const label of [
      "Historical event",
      "Session",
      "Driver A",
      "Driver B",
      "Lap A",
      "Lap B",
      "State preview",
    ]) {
      await expect(
        page.getByRole("combobox", { name: label, exact: true }),
      ).toBeVisible();
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.getByText("View speed data table").click();
    await expect(
      page.getByRole("table", { name: /Speed — synthetic samples/ }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.getByText("View speed data table").click();
    await page.screenshot({
      path: test.info().outputPath(`telemetry-${width}.png`),
      fullPage: true,
    });
  });
}

test("supports keyboard navigation, visible focus and reduced motion", async ({
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
  const driver = page.getByRole("combobox", { name: "Driver A", exact: true });
  await driver.focus();
  await page.keyboard.press("Home");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(driver).toBeFocused();
  await expect(driver).toHaveValue("mercer");
  expect(
    await driver.evaluate((element) => getComputedStyle(element).outlineStyle),
  ).not.toBe("none");
  const summary = page.getByText("View speed data table");
  await summary.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("table", { name: /Speed — synthetic samples/ }),
  ).toBeVisible();
  await expect(summary).toBeFocused();
  expect(
    await summary.evaluate((element) =>
      parseFloat(getComputedStyle(element).transitionDuration),
    ),
  ).toBe(0);
  expect(
    await page.evaluate(
      () => getComputedStyle(document.documentElement).scrollBehavior,
    ),
  ).toBe("auto");
});

test("supports touch controls with at least 44px targets", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:3102/");
  for (const label of [
    "Historical event",
    "Session",
    "Driver A",
    "Driver B",
    "Lap A",
    "Lap B",
    "State preview",
  ]) {
    const bounds = await page
      .getByRole("combobox", { name: label, exact: true })
      .boundingBox();
    expect(bounds?.height).toBeGreaterThanOrEqual(44);
    expect(bounds?.width).toBeGreaterThanOrEqual(44);
  }
  const summary = page.getByText("View speed data table");
  expect((await summary.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  await summary.tap();
  await expect(
    page.getByRole("table", { name: /Speed — synthetic samples/ }),
  ).toBeVisible();
  await context.close();
});
