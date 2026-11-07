/** Isolated SSR fixture harness; this file is never an application route. */
import { renderToStaticMarkup } from "react-dom/server";
import {
  available,
  sampleDriverStandings,
  sampleSeason,
} from "@/data/fixtures/f1";
import { sampleMetadata } from "@/data/fixtures/results";
import { OverviewDashboard } from "../components/overview-dashboard";
import { OverviewLoading } from "../components/overview-loading";
import { queryOverview } from "../query";
import { createOverviewDemoProvider } from "../data/demo";
import type { OverviewModel } from "../types";
import type { DataSource } from "@/types/f1-provider";

const externalTestSource: DataSource = {
  id: "qa-external-source",
  name: "External provider test double",
  kind: "external",
  attribution: ["QA-only external provenance; no real results fetched"],
};

export async function renderPreview(parameters: URLSearchParams) {
  const scenario = parameters.get("scenario") ?? "success";
  if (scenario === "loading") return renderToStaticMarkup(<OverviewLoading />);

  const fixtureScenario =
    scenario === "empty" ||
    scenario === "error" ||
    scenario === "stale" ||
    scenario === "partial" ||
    scenario === "not-covered"
      ? scenario
      : "success";
  const base = createOverviewDemoProvider({ scenario: fixtureScenario });
  const provider =
    scenario === "long-names"
      ? {
          ...base,
          async getSupportedSeasons() {
            return {
              status: "success" as const,
              data: [sampleSeason, { ...sampleSeason, year: 2098 }],
              metadata: sampleMetadata,
            };
          },
          async getDriverStandings() {
            return {
              status: "success" as const,
              data: sampleDriverStandings.map((row) => ({
                ...row,
                driver: {
                  ...row.driver,
                  driver: {
                    ...row.driver.driver,
                    givenName: "Alexandria-Josephine",
                    familyName:
                      "Sample-With-An-Exceptionally-Long-Unbroken-Family-Name",
                  },
                },
                constructors: available(
                  row.constructors.status === "available"
                    ? row.constructors.value.map((constructor) => ({
                        ...constructor,
                        name: `${constructor.name} International Engineering Partnership`,
                      }))
                    : [],
                ),
              })),
              metadata: sampleMetadata,
            };
          },
        }
      : base;
  const season = parameters.get("season");
  const model = await queryOverview(provider, {
    season: season === null ? 2099 : Number(season),
    now: "2099-04-20T12:00:00Z",
  });
  let previewModel: OverviewModel = model;
  if (
    (scenario === "event-stale" ||
      scenario === "mixed-synthetic-event" ||
      scenario === "mixed-external-event") &&
    model.calendar.status === "success" &&
    model.recentRaceState.status === "success" &&
    model.recentRace?.results.status === "success"
  ) {
    const eventMetadata =
      scenario === "event-stale"
        ? {
            ...sampleMetadata,
            freshness: "stale" as const,
            completeness: "partial" as const,
            finality: "provisional" as const,
            retrievedAt: "2099-04-30T10:00:00Z",
          }
        : {
            ...sampleMetadata,
            source:
              scenario === "mixed-external-event"
                ? externalTestSource
                : sampleMetadata.source,
          };
    const resultMetadata =
      scenario === "mixed-synthetic-event"
        ? { ...sampleMetadata, source: externalTestSource }
        : sampleMetadata;
    previewModel = {
      ...model,
      calendar: { ...model.calendar, metadata: eventMetadata },
      recentRaceState: { ...model.recentRaceState, metadata: eventMetadata },
      recentRace: {
        ...model.recentRace,
        results: { ...model.recentRace.results, metadata: resultMetadata },
      },
    };
  }
  return renderToStaticMarkup(
    <OverviewDashboard
      model={previewModel}
      seasonAction="/__overview-qa"
      raceCenterHref={({ season: year, round }) =>
        `/race-center?season=${year}&round=${round}`
      }
    />,
  );
}
