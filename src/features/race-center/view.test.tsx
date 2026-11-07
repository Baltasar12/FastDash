import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createFixtureF1DataProvider } from "@/data/fixtures/fixture-provider";
import {
  sampleMetadata,
  samplePartialResult,
  sampleStaleResult,
} from "@/data/fixtures/results";
import { RaceCenterLoading } from "./loading";
import { loadRaceCenter } from "./query-model";
import { RaceCenterView } from "./view";
import { DatasetMetadata } from "./data-state";

describe("Race Center visible data states", () => {
  it("announces loading without showing placeholder results or invented metrics", () => {
    render(<RaceCenterLoading />);
    expect(
      screen.getByRole("region", { name: "Race center loading" }),
    ).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading reported events",
    );
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it.each([
    ["empty", "Season list has no entries"],
    ["not-published", "Season list unavailable"],
    ["not-covered", "Season list unavailable"],
    ["cancelled", "Season list unavailable"],
    ["error", "Season list could not be loaded"],
  ] as const)(
    "provides %s state copy and retains synthetic disclosure",
    async (scenario, heading) => {
      const model = await loadRaceCenter(
        createFixtureF1DataProvider({ scenario }),
      );
      render(<RaceCenterView model={model} />);
      expect(screen.getByRole("heading", { name: heading })).toBeVisible();
      expect(
        screen.getByText("Synthetic sample — invented data", { exact: true }),
      ).toBeVisible();
      expect(screen.getByLabelText("Season", { exact: true })).toBeDisabled();
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
    },
  );

  it("renders independent calendar, event and results warnings at the correct scope", async () => {
    const fixture = createFixtureF1DataProvider();
    const model = await loadRaceCenter({
      ...fixture,
      getSeasonCalendar: async (request) => {
        const result = await fixture.getSeasonCalendar(request);
        return result.status === "success"
          ? { ...result, metadata: { ...sampleMetadata, freshness: "stale" } }
          : result;
      },
      getRaceResults: async () => samplePartialResult,
    });
    render(<RaceCenterView model={model} />);
    const calendar = screen.getByLabelText("Calendar data provenance");
    const results = screen.getByLabelText("Results data provenance");
    expect(
      within(calendar).getByText("Stale data", { exact: true }),
    ).toBeVisible();
    expect(
      within(calendar).queryByText("Partial dataset", { exact: true }),
    ).not.toBeInTheDocument();
    expect(
      within(results).getByText("Partial dataset", { exact: true }),
    ).toBeVisible();
    expect(
      within(results).getByText("Provisional", { exact: true }),
    ).toBeVisible();
    expect(
      within(results).queryByText("Stale data", { exact: true }),
    ).not.toBeInTheDocument();
  });

  it("reports the last successful retrieval and failed refresh for stale results", async () => {
    const model = await loadRaceCenter({
      ...createFixtureF1DataProvider(),
      getRaceResults: async () => sampleStaleResult,
    });
    render(<RaceCenterView model={model} />);
    const results = screen.getByLabelText("Results data provenance");
    expect(
      within(results).getByText(/Last successful retrieval/),
    ).toHaveTextContent("2099-05-01T12:00:00Z");
    expect(within(results).getByText(/latest refresh failed/)).toBeVisible();
  });

  it("shows source attribution and distinguishes attempt time for rate-limited results", async () => {
    const fixture = createFixtureF1DataProvider({
      scenario: "error",
      errorCode: "rate-limited",
    });
    const model = await loadRaceCenter({
      ...createFixtureF1DataProvider(),
      getRaceResults: fixture.getRaceResults,
    });
    render(<RaceCenterView model={model} />);
    expect(screen.getByText(/Retry after/)).toHaveTextContent(
      "Retry after 2099-05-01T12:01:00Z (UTC)",
    );
    const details = within(screen.getByLabelText("Results data provenance"))
      .getByText("Results: source & retrieval details")
      .closest("details");
    if (!details) throw new Error("Expected provenance disclosure");
    details.setAttribute("open", "");
    expect(
      within(details).getByText(
        /SECTOR synthetic fixtures; no real championship data/,
      ),
    ).toBeVisible();
    expect(within(details).getByText(/Attempted:/)).toHaveTextContent(
      "2099-05-01T12:00:00Z",
    );
  });

  it("provides useful messages for successful empty season and event collections", async () => {
    const fixture = createFixtureF1DataProvider();
    const seasons = await loadRaceCenter({
      ...fixture,
      getSupportedSeasons: async () => ({
        status: "success",
        data: [],
        metadata: sampleMetadata,
      }),
    });
    const { unmount } = render(<RaceCenterView model={seasons} />);
    expect(
      screen.getByRole("heading", { name: "No seasons available" }),
    ).toBeVisible();
    unmount();
    const events = await loadRaceCenter({
      ...fixture,
      getSeasonCalendar: async () => ({
        status: "success",
        data: [],
        metadata: sampleMetadata,
      }),
    });
    render(<RaceCenterView model={events} />);
    expect(
      screen.getByRole("heading", { name: "No Grand Prix records" }),
    ).toBeVisible();
    expect(screen.getByLabelText("Grand Prix", { exact: true })).toBeDisabled();
  });

  it("exposes invalid selection without silently rendering a default result table", async () => {
    const model = await loadRaceCenter(createFixtureF1DataProvider(), {
      season: 2099,
      round: 2,
      session: "practice-3",
    });
    render(<RaceCenterView model={model} />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "This session was not reported",
    );
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("identifies qualifying as an available result dataset without creating a reported session or scheduled start", async () => {
    const calendar = createFixtureF1DataProvider({
      scenario: "missing-qualifying",
    });
    const model = await loadRaceCenter(
      {
        ...createFixtureF1DataProvider(),
        getSeasonCalendar: calendar.getSeasonCalendar,
        getEventDetails: calendar.getEventDetails,
      },
      { season: 2099, round: 1, session: "qualifying" },
    );
    render(<RaceCenterView model={model} />);
    expect(
      screen.getByRole("heading", { name: "Qualifying results" }),
    ).toBeVisible();
    expect(screen.getByText("INDEPENDENT RESULT DATASET")).toBeVisible();
    expect(screen.getByText(/Qualifying is not listed/)).toHaveTextContent(
      "no session time or weekend format has been inferred",
    );
    const reported = screen.getByRole("form", {
      name: "Choose a reported session",
    });
    expect(
      within(reported).queryByRole("button", { name: /qualifying/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Scheduled start:/)).not.toBeInTheDocument();
    expect(screen.getByRole("table")).toHaveAccessibleName(
      /Sample Meadow Grand Prix.*Qualifying/i,
    );
    expect(
      within(screen.getByLabelText("Results data provenance")).getByText(
        "Synthetic sample — invented data",
        { exact: true },
      ),
    ).toBeVisible();
  });

  it("shows unavailable qualifying coverage without suggesting the unreported session is selectable", async () => {
    const model = await loadRaceCenter(
      createFixtureF1DataProvider({ scenario: "missing-qualifying" }),
      { season: 2099, round: 1, session: "qualifying" },
    );
    render(<RaceCenterView model={model} />);
    expect(screen.getByText("INDEPENDENT RESULT REQUEST")).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Qualifying results unavailable" }),
    ).toBeVisible();
    expect(screen.getByText(/does not cover this dataset/)).toBeVisible();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(
      within(
        screen.getByRole("form", { name: "Choose a reported session" }),
      ).queryByRole("button", { name: /qualifying/i }),
    ).not.toBeInTheDocument();
  });

  it.each(["Seasons", "Calendar", "Event", "Results"])(
    "keeps partial %s provenance warning accurate for its dataset",
    (label) => {
      render(<DatasetMetadata result={samplePartialResult} label={label} />);
      const provenance = screen.getByLabelText(`${label} data provenance`);
      expect(
        within(provenance).getByText("Partial dataset", { exact: true }),
      ).toBeVisible();
      expect(provenance).toHaveTextContent(/Some records are missing/);
      expect(provenance).not.toHaveTextContent(/full classification/);
    },
  );

  it.each([
    "empty",
    "not-published",
    "not-covered",
    "cancelled",
    "error",
  ] as const)(
    "offers usable recovery for %s discovery instead of directing visitors to disabled selectors",
    async (scenario) => {
      const model = await loadRaceCenter(
        createFixtureF1DataProvider({ scenario }),
      );
      render(<RaceCenterView model={model} />);
      expect(screen.getByLabelText("Season", { exact: true })).toBeDisabled();
      expect(
        screen.getByLabelText("Grand Prix", { exact: true }),
      ).toBeDisabled();
      const availability = screen.getByRole("region", {
        name: "Season availability",
      });
      expect(availability).not.toHaveTextContent(
        /Choose another (?:event|session|season)|submitting your selection/i,
      );
      expect(availability).toHaveTextContent(
        /check (?:again|back)|reload|retry/i,
      );
      if (scenario === "error") {
        expect(
          within(availability).getByRole("button", {
            name: "Retry data request",
          }),
        ).toBeEnabled();
      }
    },
  );
});
