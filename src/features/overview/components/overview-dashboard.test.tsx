import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import {
  available,
  FIXTURE_SEASON,
  sampleSeason,
  sampleRegularEvent,
  sampleSprintEvent,
} from "@/data/fixtures/f1";
import { createFixtureF1DataProvider } from "@/data/fixtures/fixture-provider";
import {
  sampleErrors,
  sampleMetadata,
  sampleSource,
} from "@/data/fixtures/results";
import { createOverviewDemoProvider, OVERVIEW_DEMO_NOW } from "../data/demo";
import type { DataSource } from "@/types/f1-provider";
import type { OverviewModel } from "../types";
import { queryOverview } from "../query";
import { OverviewDashboard } from "./overview-dashboard";
import { OverviewLoading } from "./overview-loading";

async function fixtureModel() {
  return queryOverview(createFixtureF1DataProvider(), {
    season: FIXTURE_SEASON,
    now: OVERVIEW_DEMO_NOW,
  });
}

const externalTestSource: DataSource = {
  id: "qa-external-source",
  name: "External provider test double",
  kind: "external",
  attribution: ["QA-only external provenance; no real results fetched"],
};

describe("Overview dashboard", () => {
  it("labels an unknown-status calendar event accurately and never implies a completed race from its date", async () => {
    const events = [sampleRegularEvent, sampleSprintEvent].map((event) => ({
      ...event,
      sessions:
        event.sessions.status === "available"
          ? available(
              event.sessions.value.map((session) => ({
                ...session,
                status: "unknown" as const,
              })),
            )
          : event.sessions,
    }));
    const provider = createFixtureF1DataProvider();
    const model = await queryOverview(
      {
        ...provider,
        getSeasonCalendar: async () => ({
          status: "success",
          data: events,
          metadata: {
            ...sampleMetadata,
            finality: "unknown",
            completeness: "partial",
            freshness: "stale",
          },
        }),
      },
      { season: FIXTURE_SEASON, now: OVERVIEW_DEMO_NOW },
    );
    render(<OverviewDashboard model={model} />);
    const region = screen.getByRole("region", { name: "Next on calendar" });
    expect(within(region).getByText(sampleSprintEvent.name)).toBeVisible();
    expect(within(region).getByText("RACE STATUS NOT REPORTED")).toBeVisible();
    expect(
      within(region).queryByText("SCHEDULED MAIN RACE"),
    ).not.toBeInTheDocument();
    expect(within(region).getByText("SYNTHETIC SAMPLE")).toBeVisible();
    expect(within(region).getByText("Stale snapshot")).toBeVisible();
    expect(within(region).getByText(/Partial dataset/)).toBeVisible();
    const results = screen.getByRole("region", {
      name: "Latest race results.",
    });
    expect(within(results).getByRole("table")).toBeVisible();
    expect(screen.queryByText(/reported completed/)).not.toBeInTheDocument();
    expect(screen.getByText("Not reported", { selector: "dd" })).toBeVisible();
  });

  it("provides one page heading, named sections and synthetic labels beside displayed data", async () => {
    render(<OverviewDashboard model={await fixtureModel()} />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    for (const name of [
      "Next Grand Prix",
      "Driver championship",
      "Constructor championship",
      "Latest race results.",
    ]) {
      const region = screen.getByRole("region", { name });
      expect(within(region).getByText("SYNTHETIC SAMPLE")).toBeVisible();
    }
    const drivers = screen.getByRole("region", { name: "Driver championship" });
    expect(
      within(drivers).getByText(
        "Sample Alder Racing / Sample Boreal Motorsport",
      ),
    ).toBeVisible();
    expect(within(drivers).getByText("As of round 2")).toBeVisible();
    expect(screen.queryByText(/live feed/i)).not.toBeInTheDocument();
  });

  it("keeps unknown points distinct from actual reported zeros", async () => {
    const model = await fixtureModel();
    if (model.drivers.status !== "success")
      throw new Error("Fixture drivers must succeed");
    render(
      <OverviewDashboard
        model={{
          ...model,
          drivers: {
            ...model.drivers,
            data: model.drivers.data.map((row) => ({
              ...row,
              points: { status: "missing" },
            })),
          },
        }}
      />,
    );
    const driverRegion = screen.getByRole("region", {
      name: "Driver championship",
    });
    const driverRow = within(driverRegion).getByRole("row", {
      name: /Aria Sample/,
    });
    expect(
      within(driverRow).getByRole("cell", { name: "Not reported" }),
    ).toBeVisible();
    expect(
      within(driverRow).queryByRole("cell", { name: "0" }),
    ).not.toBeInTheDocument();
    const constructors = screen.getByRole("region", {
      name: "Constructor championship",
    });
    const zeroRow = within(constructors).getByRole("row", {
      name: /Sample Boreal Motorsport/,
    });
    expect(within(zeroRow).getAllByRole("cell", { name: "0" })).toHaveLength(2);
  });

  it("retains nonnumeric classifications, finish descriptions and separate time units", async () => {
    render(<OverviewDashboard model={await fixtureModel()} />);
    const results = screen.getByRole("region", {
      name: "Latest race results.",
    });
    for (const classification of ["R", "DNS", "DSQ"]) {
      expect(
        within(results).getByRole("cell", { name: classification }),
      ).toBeVisible();
    }
    expect(
      within(results).getByText(/Sample mechanical failure/i),
    ).toBeVisible();
    expect(
      within(results).getByRole("cell", { name: "1:30:00" }),
    ).toBeVisible();
    expect(
      within(results).getByRole("cell", { name: "+2.15 s" }),
    ).toBeVisible();
    expect(within(results).getByRole("cell", { name: "+1 lap" })).toBeVisible();
  });

  it("keeps successful standings visible when a sibling resource fails", async () => {
    const model = await fixtureModel();
    render(
      <OverviewDashboard
        model={{
          ...model,
          drivers: {
            status: "error",
            error: sampleErrors.timeout,
            metadata: {
              source: sampleSource,
              attemptedAt: sampleMetadata.retrievedAt,
            },
          },
        }}
      />,
    );
    expect(
      within(
        screen.getByRole("region", { name: "Driver championship" }),
      ).getByRole("status"),
    ).toHaveTextContent(/timed out/i);
    expect(
      within(
        screen.getByRole("region", { name: "Constructor championship" }),
      ).getByRole("table"),
    ).toBeVisible();
    expect(
      within(
        screen.getByRole("region", { name: "Latest race results." }),
      ).getByRole("table"),
    ).toBeVisible();
  });

  it("supports native keyboard season selection with an integration-supplied action", async () => {
    const user = userEvent.setup();
    const model = await fixtureModel();
    render(
      <OverviewDashboard
        seasonAction="/overview"
        model={{
          ...model,
          seasons: {
            status: "success",
            data: [sampleSeason, { ...sampleSeason, year: 2098 }],
            metadata: sampleMetadata,
          },
        }}
      />,
    );
    const selector = screen.getByRole("combobox", { name: "Season" });
    await user.selectOptions(selector, "2098");
    expect(selector).toHaveValue("2098");
    const form = screen.getByRole("form", { name: "Choose overview season" });
    expect(form).toHaveAttribute("method", "get");
    expect(form).toHaveAttribute("action", "/overview");
    expect(screen.getByRole("button", { name: "View season" })).toBeEnabled();
  });

  it.each(["error", "unavailable", "empty"] as const)(
    "disables season controls when supported seasons are %s",
    async (status) => {
      const model = await fixtureModel();
      const seasons: OverviewModel["seasons"] =
        status === "error"
          ? {
              status,
              error: sampleErrors.network,
              metadata: {
                source: sampleSource,
                attemptedAt: sampleMetadata.retrievedAt,
              },
            }
          : status === "empty"
            ? { status, reason: "no-entries", metadata: sampleMetadata }
            : { status, reason: "not-covered", metadata: sampleMetadata };
      render(<OverviewDashboard model={{ ...model, seasons }} />);
      const form = screen.getByRole("form", { name: "Choose overview season" });
      const selector = within(form).getByRole("combobox", { name: "Season" });
      expect(selector).toBeDisabled();
      expect(
        within(form).getByRole("button", { name: "View season" }),
      ).toBeDisabled();
      expect(
        within(selector).getByRole("option", { name: "No seasons available" }),
      ).toBeInTheDocument();
      selector.focus();
      expect(selector).not.toHaveFocus();
    },
  );

  it("shows the actual supplied scheduled sessions and injects contextual Race Center links", async () => {
    const model = await queryOverview(createOverviewDemoProvider(), {
      season: FIXTURE_SEASON,
      now: OVERVIEW_DEMO_NOW,
    });
    render(
      <OverviewDashboard
        model={model}
        raceCenterHref={({ season, round }) => `/races/${season}/${round}`}
      />,
    );
    const next = screen.getByRole("region", { name: "Next Grand Prix" });
    expect(within(next).getByText("Sample Ridge Grand Prix")).toBeVisible();
    expect(within(next).getByText("Sample sprint-qualifying")).toBeVisible();
    expect(
      within(next).getByText(/26 Apr 2099.*time not reported/i),
    ).toBeVisible();
    expect(
      within(next).getByRole("link", { name: /Explore this Grand Prix/ }),
    ).toHaveAttribute("href", "/races/2099/2");
    expect(
      screen.getByRole("link", { name: /Explore race results/ }),
    ).toHaveAttribute("href", "/races/2099/1");
  });

  it("handles independent metadata flags and original snapshot timestamps", async () => {
    const model = await fixtureModel();
    if (model.drivers.status !== "success")
      throw new Error("Fixture drivers must succeed");
    render(
      <OverviewDashboard
        model={{
          ...model,
          drivers: {
            ...model.drivers,
            metadata: {
              ...model.drivers.metadata,
              freshness: "stale",
              completeness: "partial",
              finality: "provisional",
              sourceUpdatedAt: "2099-04-30T10:00:00Z",
              revalidationError: sampleErrors.network,
            },
            data: model.drivers.data.map((row) => ({
              ...row,
              asOfRound: available(1),
            })),
          },
        }}
      />,
    );
    const region = screen.getByRole("region", { name: "Driver championship" });
    expect(within(region).getByText("Stale snapshot")).toBeVisible();
    expect(within(region).getByText("Provisional")).toBeVisible();
    expect(within(region).getByText(/partial dataset/i)).toBeVisible();
    expect(within(region).getByText("As of round 1")).toBeVisible();
    expect(within(region).getByText(/source updated/i)).toBeVisible();
    expect(
      region.querySelector('time[datetime="2099-05-01T12:00:00Z"]'),
    ).toBeInTheDocument();
    expect(
      region.querySelector('time[datetime="2099-04-30T10:00:00Z"]'),
    ).toBeInTheDocument();
  });

  it("provides a stable loading page with an announced status and no fabricated figures", () => {
    render(<OverviewLoading />);
    expect(screen.getByRole("status")).toHaveTextContent(
      /loading the season overview/i,
    );
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("retains separate event and classification provenance when calendar warnings differ from fresh results", async () => {
    const model = await fixtureModel();
    if (
      model.calendar.status !== "success" ||
      model.recentRaceState.status !== "success"
    ) {
      throw new Error("Fixture calendar and recent event must succeed");
    }
    const eventMetadata = {
      ...sampleMetadata,
      freshness: "stale" as const,
      completeness: "partial" as const,
      finality: "provisional" as const,
      revalidationError: sampleErrors.network,
      retrievedAt: "2099-04-30T10:00:00Z",
    };
    render(
      <OverviewDashboard
        model={{
          ...model,
          calendar: { ...model.calendar, metadata: eventMetadata },
          recentRaceState: {
            ...model.recentRaceState,
            metadata: eventMetadata,
          },
        }}
      />,
    );
    const region = screen.getByRole("region", { name: "Latest race results." });
    expect(within(region).getByRole("table")).toBeVisible();
    expect(within(region).getByText("EVENT / CALENDAR CONTEXT")).toBeVisible();
    expect(within(region).getByText("CLASSIFICATION CONTEXT")).toBeVisible();
    const eventContext = within(region).getByRole("group", {
      name: "Event context provenance",
    });
    const classification = within(region).getByRole("group", {
      name: "Classification provenance",
    });
    expect(within(eventContext).getByText("Stale snapshot")).toBeVisible();
    expect(within(eventContext).getByText("Provisional")).toBeVisible();
    expect(within(eventContext).getByText(/partial dataset/i)).toBeVisible();
    expect(
      within(classification).getByText("Retrieved snapshot"),
    ).toBeVisible();
    expect(
      within(classification).getByText("Source marked final"),
    ).toBeVisible();
    expect(
      within(classification).getByText("Complete supplied dataset"),
    ).toBeVisible();
    expect(
      region.querySelector('time[datetime="2099-04-30T10:00:00Z"]'),
    ).toBeInTheDocument();
    expect(
      region.querySelector('time[datetime="2099-05-01T12:00:00Z"]'),
    ).toBeInTheDocument();
  });

  it.each(["synthetic", "external"] as const)(
    "withholds classification rows when the event source is %s and the result source kind differs",
    async (eventKind) => {
      const model = await fixtureModel();
      if (
        model.recentRaceState.status !== "success" ||
        model.recentRace?.results.status !== "success"
      ) {
        throw new Error("Fixture event and results must succeed");
      }
      const eventSource =
        eventKind === "synthetic" ? sampleSource : externalTestSource;
      const resultSource =
        eventKind === "synthetic" ? externalTestSource : sampleSource;
      render(
        <OverviewDashboard
          model={{
            ...model,
            recentRaceState: {
              ...model.recentRaceState,
              metadata: { ...sampleMetadata, source: eventSource },
            },
            recentRace: {
              ...model.recentRace,
              results: {
                ...model.recentRace.results,
                metadata: { ...sampleMetadata, source: resultSource },
              },
            },
          }}
        />,
      );
      const region = screen.getByRole("region", {
        name: "Latest race results.",
      });
      expect(within(region).queryByRole("table")).not.toBeInTheDocument();
      expect(within(region).queryByText("Aria Sample")).not.toBeInTheDocument();
      expect(within(region).getByRole("status")).toHaveTextContent(
        /classification withheld/i,
      );
      expect(within(region).getByRole("status")).toHaveTextContent(
        /different source kinds/i,
      );
      expect(
        within(region).getByText("EVENT / CALENDAR CONTEXT"),
      ).toBeVisible();
      expect(within(region).getByText("CLASSIFICATION CONTEXT")).toBeVisible();
      expect(within(region).getByText("SYNTHETIC SAMPLE")).toBeVisible();
      expect(within(region).getByText(externalTestSource.name)).toBeVisible();
      expect(
        within(region).getByText(/QA-only external provenance/),
      ).toBeVisible();
      const eventContext = within(region).getByRole("group", {
        name: "Event context provenance",
      });
      const classification = within(region).getByRole("group", {
        name: "Classification provenance",
      });
      expect(
        within(eventContext).getByText(
          eventKind === "synthetic"
            ? "SYNTHETIC SAMPLE"
            : externalTestSource.name,
        ),
      ).toBeVisible();
      expect(
        within(classification).getByText(
          eventKind === "synthetic"
            ? externalTestSource.name
            : "SYNTHETIC SAMPLE",
        ),
      ).toBeVisible();
      if (eventKind === "synthetic") {
        expect(within(region).getByText("Synthetic preview")).toBeVisible();
      } else {
        expect(
          within(region).queryByText("Synthetic preview"),
        ).not.toBeInTheDocument();
      }
    },
  );

  it("preserves loading classification status without inventing a source mismatch", async () => {
    const model = await fixtureModel();
    if (model.recentRace === null)
      throw new Error("Fixture recent event must exist");
    render(
      <OverviewDashboard
        model={{
          ...model,
          recentRace: { ...model.recentRace, results: { status: "loading" } },
        }}
      />,
    );
    const region = screen.getByRole("region", { name: "Latest race results." });
    expect(within(region).getByRole("status")).toHaveTextContent(
      /loading data/i,
    );
    expect(
      within(region).queryByText(/classification withheld/i),
    ).not.toBeInTheDocument();
    expect(within(region).queryByRole("table")).not.toBeInTheDocument();
    expect(within(region).getByText("SYNTHETIC SAMPLE")).toBeVisible();
    expect(within(region).getByText("Synthetic preview")).toBeVisible();
  });
});
