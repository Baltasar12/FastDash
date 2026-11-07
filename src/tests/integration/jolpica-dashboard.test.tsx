import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createJolpicaProvider } from "@/data/providers/jolpica";
import {
  constructorStanding,
  driverStanding,
  envelope,
  qualifyingResult,
  race,
  raceResult,
  seasonsPage,
  standingsPage,
} from "@/data/providers/jolpica/fixtures/wire";
import { OverviewDashboard } from "@/features/overview/components/overview-dashboard";
import { queryOverview } from "@/features/overview/query";
import { loadRaceCenter } from "@/features/race-center/query-model";
import { RaceCenterView } from "@/features/race-center/view";
import type { DataResult, F1DataProvider } from "@/types/f1-provider";

vi.mock("@/data/providers/jolpica/server-only", () => ({}));

const NOW = "2024-11-07T12:00:00Z";
const eventOne = { ...race, raceName: "Wire Example Grand Prix" };
const eventTwo = {
  ...race,
  round: "2",
  raceName: "Unpublished Example Grand Prix",
  date: "2024-11-01",
};
const eventThree = {
  ...race,
  round: "3",
  raceName: "Next Example Grand Prix",
  date: "2024-12-31",
  Qualifying: { date: "2024-12-30", time: "12:00:00Z" },
  Sprint: { date: "2024-12-30", time: "16:00:00Z" },
};

function racesPage(events: readonly Record<string, unknown>[], round?: number) {
  return envelope(
    {
      RaceTable: {
        season: "2024",
        ...(round === undefined ? {} : { round: String(round) }),
        Races: events,
      },
    },
    events.length,
  );
}

function resultPage(
  event: Record<string, unknown>,
  round: number,
  kind: "Results" | "QualifyingResults",
  rows: readonly Record<string, unknown>[],
) {
  return envelope(
    {
      RaceTable: {
        season: "2024",
        round: String(round),
        Races: rows.length ? [{ ...event, [kind]: rows }] : [],
      },
    },
    rows.length,
  );
}

function standardReply(url: URL): unknown {
  const path = url.pathname;
  if (path.endsWith("/seasons/")) return seasonsPage();
  if (path.endsWith("/driverstandings/"))
    return standingsPage("DriverStandings", [driverStanding()]);
  if (path.endsWith("/constructorstandings/"))
    return standingsPage("ConstructorStandings", [constructorStanding()]);
  const round = Number(path.match(/\/2024\/(\d+)\//)?.[1]);
  const event = [eventOne, eventTwo, eventThree].find(
    (item) => Number(item.round) === round,
  );
  if (path.endsWith("/races/"))
    return Number.isFinite(round)
      ? racesPage(event ? [event] : [], round)
      : racesPage([eventOne, eventTwo, eventThree]);
  if (event && path.endsWith("/results/"))
    return resultPage(
      event,
      round,
      "Results",
      round === 1 ? [raceResult()] : [],
    );
  if (event && path.endsWith("/qualifying/"))
    return resultPage(
      event,
      round,
      "QualifyingResults",
      round === 1 || round === 3 ? [qualifyingResult()] : [],
    );
  throw new Error(`Unexpected test-only path: ${path}`);
}

function harness(
  reply: (
    url: URL,
    init?: RequestInit,
  ) => unknown | Promise<unknown> = standardReply,
  options: Parameters<typeof createJolpicaProvider>[0] = {},
) {
  let now = Date.parse(NOW);
  const transport = vi.fn<typeof fetch>(async (input, init) => {
    const response = await reply(new URL(String(input)), init);
    return response instanceof Response ? response : Response.json(response);
  });
  const provider = createJolpicaProvider({
    fetch: transport,
    now: () => now,
    sleep: async (milliseconds) => {
      now += milliseconds;
    },
    maxRetries: 0,
    ...options,
  });
  return {
    provider,
    transport,
    advance(milliseconds: number) {
      now += milliseconds;
    },
  };
}

function success<T>(result: DataResult<T>) {
  expect(result.status).toBe("success");
  if (result.status !== "success")
    throw new Error("Expected successful dataset");
  return result;
}

describe("Jolpica → Overview compatibility", () => {
  it("preserves multiple historical entries for one driver in the recent preview", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    const { provider } = harness((url) =>
      url.pathname.endsWith("/1/results/")
        ? resultPage(eventOne, 1, "Results", [
            raceResult(),
            { ...raceResult(), number: "8", position: "2", positionText: "2" },
          ])
        : standardReply(url),
    );
    const model = await queryOverview(provider, { season: 2024, now: NOW });
    render(<OverviewDashboard model={model} />);
    const recent = screen.getByRole("region", { name: "Latest race results." });
    expect(within(recent).getAllByText("Fixture Driver")).toHaveLength(2);
    expect(errorLog).not.toHaveBeenCalled();
  });

  it("uses unknown-status calendar dates and confirmed results through the real adapter", async () => {
    const { provider, transport } = harness();
    const model = await queryOverview(provider, { season: 2024, now: NOW });
    expect(model.calendar.status).toBe("success");
    expect(model.drivers.status).toBe("success");
    expect(model.constructors.status).toBe("success");
    expect(model.nextEvent.status).toBe("success");
    if (model.nextEvent.status !== "success")
      throw new Error("Expected next event");
    expect(model.nextEvent.data.round).toBe(3);
    expect(model.nextEvent.data.sessions.status).toBe("available");
    if (model.nextEvent.data.sessions.status === "available")
      expect(
        model.nextEvent.data.sessions.value.every(
          (session) => session.status === "unknown",
        ),
      ).toBe(true);
    expect(model.recentRace?.event.round).toBe(1);
    expect(model.recentRace?.results.status).toBe("success");
    expect(
      transport.mock.calls.filter(([url]) => String(url).includes("/results/")),
    ).toHaveLength(2);
    render(<OverviewDashboard model={model} seasonAction="/overview" />);
    expect(
      screen.getByRole("heading", { name: "Next on calendar" }),
    ).toBeVisible();
    expect(screen.getByText("Next Example Grand Prix")).toBeVisible();
    expect(
      screen.getByRole("link", { name: /Explore race results/ }),
    ).toHaveAttribute("href", "/race-center?season=2024&round=1");
    expect(screen.queryByText(/Synthetic preview/)).not.toBeInTheDocument();
    expect(screen.getAllByText(/Finality unknown/).length).toBeGreaterThan(0);
  });

  it("never presents unpublished past results as empty or completed", async () => {
    const { provider } = harness((url) => {
      if (url.pathname.endsWith("/results/")) {
        const round = Number(url.pathname.match(/\/2024\/(\d+)\//)?.[1]);
        return resultPage(
          round === 1 ? eventOne : eventTwo,
          round,
          "Results",
          [],
        );
      }
      return standardReply(url);
    });
    const model = await queryOverview(provider, { season: 2024, now: NOW });
    expect(model.recentRace?.results.status).toBe("unavailable");
    if (model.recentRace?.results.status === "unavailable")
      expect(model.recentRace.results.reason).toBe("not-published");
    render(<OverviewDashboard model={model} />);
    expect(
      screen.queryByRole("table", { name: /race classification/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/reported completed/)).not.toBeInTheDocument();
    expect(screen.getAllByText(/not.*published/i).length).toBeGreaterThan(0);
  });

  it.each(["network", "rate-limited", "timeout"] as const)(
    "retains %s failure without synthetic production fallback",
    async (failure) => {
      const { provider, transport } = harness(
        (url, init) => {
          if (!url.pathname.endsWith("/results/")) return standardReply(url);
          if (failure === "network")
            throw new Error("private upstream diagnostic");
          if (failure === "rate-limited")
            return new Response(null, {
              status: 429,
              headers: { "retry-after": "60" },
            });
          return new Promise((_resolve, reject) => {
            init?.signal?.addEventListener(
              "abort",
              () => reject(new DOMException("Aborted", "AbortError")),
              { once: true },
            );
          });
        },
        { timeoutMs: 10 },
      );
      const model = await queryOverview(provider, { season: 2024, now: NOW });
      expect(model.recentRace?.results.status).toBe("error");
      if (model.recentRace?.results.status !== "error")
        throw new Error("Expected provider error");
      expect(model.recentRace.results.error.code).toBe(failure);
      expect(model.recentRace.results.metadata.source.kind).toBe("external");
      expect(JSON.stringify(model)).not.toContain(
        "private upstream diagnostic",
      );
      expect(
        transport.mock.calls.filter(([url]) =>
          String(url).includes("/results/"),
        ),
      ).toHaveLength(1);
      render(<OverviewDashboard model={model} />);
      expect(screen.queryByText(/Synthetic preview/)).not.toBeInTheDocument();
      expect(screen.getAllByText("Fixture Driver").length).toBeGreaterThan(0); // standings remain available
    },
  );

  it("preserves stale real results after failed refresh with original provenance", async () => {
    let failing = false;
    const { provider, advance } = harness((url) => {
      if (failing && url.pathname.endsWith("/1/results/"))
        throw new Error("offline");
      return standardReply(url);
    });
    const original = await queryOverview(provider, { season: 2024, now: NOW });
    advance(5 * 60_000 + 1);
    failing = true;
    const stale = await queryOverview(provider, { season: 2024, now: NOW });
    expect(stale.recentRace?.results.status).toBe("success");
    if (
      stale.recentRace?.results.status !== "success" ||
      original.recentRace?.results.status !== "success"
    )
      throw new Error("Expected cached result");
    expect(stale.recentRace.results.metadata.freshness).toBe("stale");
    expect(stale.recentRace.results.metadata.retrievedAt).toBe(
      original.recentRace.results.metadata.retrievedAt,
    );
    render(<OverviewDashboard model={stale} />);
    expect(screen.getAllByText(/stale/i).length).toBeGreaterThan(0);
  });

  it("surfaces contract-level partial/provisional calendar and result warnings", async () => {
    const { provider } = harness();
    const calendar = success(
      await provider.getSeasonCalendar({ season: 2024 }),
    );
    const raceResults = success(
      await provider.getRaceResults({ season: 2024, round: 1 }),
    );
    const metadata = {
      ...calendar.metadata,
      completeness: "partial" as const,
      finality: "provisional" as const,
    };
    const partial: F1DataProvider = {
      ...provider,
      getSeasonCalendar: async () => ({ ...calendar, metadata }),
      getRaceResults: async ({ round }) =>
        round === 1
          ? { ...raceResults, metadata }
          : provider.getRaceResults({ season: 2024, round }),
    };
    const model = await queryOverview(partial, { season: 2024, now: NOW });
    render(<OverviewDashboard model={model} />);
    expect(screen.getAllByText(/partial|incomplete/i).length).toBeGreaterThan(
      0,
    );
    expect(screen.getAllByText(/provisional/i).length).toBeGreaterThan(0);
  });
});

describe("Jolpica → Race Center compatibility", () => {
  it.each(["race", "qualifying"] as const)(
    "keeps historical %s entries distinct while filtering the same driver",
    async (session) => {
      const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
      const user = userEvent.setup();
      const entry = session === "race" ? raceResult() : qualifyingResult();
      const rows = [
        {
          ...entry,
          Constructor: {
            constructorId: "first_entry",
            name: "First Entry Constructor",
          },
        },
        {
          ...entry,
          number: "8",
          position: "2",
          Constructor: {
            constructorId: "second_entry",
            name: "Second Entry Constructor",
          },
        },
      ];
      const { provider } = harness((url) =>
        url.pathname.endsWith(
          `/1/${session === "race" ? "results" : "qualifying"}/`,
        )
          ? resultPage(
              eventOne,
              1,
              session === "race" ? "Results" : "QualifyingResults",
              rows,
            )
          : standardReply(url),
      );
      const model = await loadRaceCenter(provider, {
        season: 2024,
        round: 1,
        session,
      });
      render(<RaceCenterView model={model} />);
      const table = screen.getByRole("table");
      expect(within(table).getAllByRole("row")).toHaveLength(3);
      const first = within(table).getByRole("row", {
        name: /First Entry Constructor/,
      });
      await user.click(within(first).getByText("Fixture Driver"));
      expect(first.querySelector("details")).toHaveAttribute("open");
      const filter = screen.getByRole("combobox", { name: "Constructor" });
      await user.selectOptions(
        filter,
        within(filter).getByRole("option", {
          name: "Second Entry Constructor",
        }),
      );
      expect(within(table).getAllByRole("row")).toHaveLength(2);
      const second = within(table).getByRole("row", {
        name: /Second Entry Constructor/,
      });
      expect(second.querySelector("details")).not.toHaveAttribute("open");
      await user.click(screen.getByRole("button", { name: "Clear filters" }));
      expect(within(table).getAllByRole("row")).toHaveLength(3);
      expect(
        within(table).getByRole("row", { name: /First Entry Constructor/ }),
      ).toBeVisible();
      expect(
        within(table).getByRole("row", { name: /Second Entry Constructor/ }),
      ).toBeVisible();
      expect(errorLog).not.toHaveBeenCalled();
    },
  );

  it("selects an event and a reported qualifying session without inferring status", async () => {
    const { provider } = harness();
    const model = await loadRaceCenter(provider, {
      season: 2024,
      round: 3,
      session: "qualifying",
    });
    expect(model.selection).toEqual({
      season: 2024,
      round: 3,
      session: "qualifying",
    });
    expect(model.session?.status).toBe("unknown");
    expect(model.results?.kind).toBe("qualifying");
    if (model.results?.kind === "qualifying")
      expect(model.results.result.status).toBe("success");
    render(<RaceCenterView model={model} />);
    expect(
      screen.getByRole("button", { name: /Qualifying\s*Status unknown/ }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("table")).toBeVisible();
  });

  it("exposes independently available qualifying when the calendar lists only the race", async () => {
    const { provider } = harness();
    const model = await loadRaceCenter(provider, {
      season: 2024,
      round: 1,
      session: "qualifying",
    });
    expect(model.session).toBeUndefined();
    expect(model.selectionError).toBeUndefined();
    expect(model.results?.kind).toBe("qualifying");
    if (model.results?.kind === "qualifying")
      expect(model.results.result.status).toBe("success");
    render(<RaceCenterView model={model} />);
    expect(
      screen.getByRole("heading", { name: "Qualifying results" }),
    ).toBeVisible();
    expect(
      screen.getByText(/Qualifying is not listed in the reported schedule/),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: /^Qualifying\s*Status/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Scheduled start:/)).not.toBeInTheDocument();
    expect(screen.getByRole("table")).toBeVisible();
  });

  it("keeps absent qualifying results unavailable rather than inventing a session", async () => {
    const { provider } = harness();
    const model = await loadRaceCenter(provider, {
      season: 2024,
      round: 2,
      session: "qualifying",
    });
    expect(model.session).toBeUndefined();
    if (model.results?.kind !== "qualifying")
      throw new Error("Expected qualifying request");
    expect(model.results.result.status).toBe("unavailable");
    render(<RaceCenterView model={model} />);
    expect(
      screen.getByRole("heading", { name: "Qualifying results unavailable" }),
    ).toBeVisible();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("preserves numeric retirement, nonnumeric DSQ and missing metrics in the main race", async () => {
    const retired = {
      ...raceResult("retired"),
      position: "2",
      positionText: "2",
      status: "Retired",
      grid: null,
      laps: null,
      points: null,
      Time: undefined,
      FastestLap: null,
    };
    const dsq = {
      ...raceResult("excluded"),
      positionText: "D",
      status: "Disqualified",
    };
    const { provider } = harness((url) =>
      url.pathname.endsWith("/1/results/")
        ? resultPage(eventOne, 1, "Results", [raceResult(), retired, dsq])
        : standardReply(url),
    );
    const model = await loadRaceCenter(provider, {
      season: 2024,
      round: 1,
      session: "race",
    });
    if (model.results?.kind !== "race")
      throw new Error("Expected main-race results");
    const rows = success(model.results.result).data;
    expect(rows[1]?.finishStatus.kind).toBe("retired");
    expect(rows[1]?.classification.position).toEqual({
      status: "available",
      value: 2,
    });
    expect(rows[1]?.points.status).toBe("missing");
    expect(rows[1]?.lapsCompleted.status).toBe("missing");
    expect(rows[2]?.classification.position.status).toBe("not-applicable");
    expect(rows[2]?.classification.text).toEqual({
      status: "available",
      value: "D",
    });
    expect(rows[2]?.finishStatus.kind).toBe("disqualified");
    render(<RaceCenterView model={model} />);
    const table = screen.getByRole("table");
    expect(within(table).getByText("Retired")).toBeVisible();
    expect(within(table).getByText("Disqualified")).toBeVisible();
    expect(within(table).getAllByText(/Not reported/).length).toBeGreaterThan(
      0,
    );
  });

  it("rejects unsupported sprint result types without querying main-race results", async () => {
    const { provider, transport } = harness();
    const model = await loadRaceCenter(provider, {
      season: 2024,
      round: 3,
      session: "sprint",
    });
    expect(model.session?.kind).toBe("sprint");
    expect(model.results?.kind).toBe("unsupported");
    expect(
      transport.mock.calls.some(([url]) =>
        /\/(results|qualifying)\//.test(String(url)),
      ),
    ).toBe(false);
    render(<RaceCenterView model={model} />);
    expect(
      screen.getByText(/practice and sprint results are not/),
    ).toBeVisible();
  });
});
