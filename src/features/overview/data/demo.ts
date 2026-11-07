/** Explicit synthetic preview composition. Never imported by the real query. */
import { createFixtureF1DataProvider } from "@/data/fixtures/fixture-provider";
import type { FixtureProviderOptions } from "@/data/fixtures/fixture-provider";
import { available, sampleSeason } from "@/data/fixtures/f1";
import type { F1DataProvider } from "@/types/f1-provider";

export const OVERVIEW_DEMO_NOW = "2099-04-20T12:00:00Z";

/**
 * Opt-in preview of an invented season between its two sample events. The
 * original shared fixtures stay unchanged. No environment-driven fallback.
 */
export function createOverviewDemoProvider(
  options: FixtureProviderOptions = {},
): F1DataProvider {
  const provider = createFixtureF1DataProvider(options);
  return {
    ...provider,
    async getDriverStandings(request) {
      const result = await provider.getDriverStandings(request);
      return result.status === "success"
        ? {
            ...result,
            data: result.data.map((row) => ({
              ...row,
              asOfRound: available(1),
            })),
          }
        : result;
    },
    async getConstructorStandings(request) {
      const result = await provider.getConstructorStandings(request);
      return result.status === "success"
        ? {
            ...result,
            data: result.data.map((row) => ({
              ...row,
              asOfRound: available(1),
            })),
          }
        : result;
    },
    async getSupportedSeasons() {
      const result = await provider.getSupportedSeasons();
      if (result.status !== "success") return result;
      return {
        ...result,
        data: result.data.map((season) => ({
          ...season,
          championship: available({
            name:
              sampleSeason.championship.status === "available"
                ? sampleSeason.championship.value.name
                : { status: "missing" },
            status: "in-progress",
          }),
        })),
      };
    },
    async getSeasonCalendar(request) {
      const result = await provider.getSeasonCalendar(request);
      if (result.status !== "success") return result;
      return {
        ...result,
        data: result.data.map((event) => ({
          ...event,
          sessions:
            event.round === 2 && event.sessions.status === "available"
              ? available(
                  event.sessions.value.map((session) => ({
                    ...session,
                    status: "scheduled",
                  })),
                )
              : event.sessions,
        })),
      };
    },
  };
}
