import { notFound } from "next/navigation";
import { createFixtureF1DataProvider } from "@/data/fixtures/fixture-provider";
import { RaceCenter } from "@/features/race-center/race-center";
import { parseRaceCenterSelection } from "@/features/race-center/selection";

export const dynamic = "force-dynamic";

export default async function PreviewPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  if (process.env.SECTOR_RACE_CENTER_PREVIEW !== "1") notFound();
  const params = await searchParams;
  const scenario = params.scenario;
  const provider = createFixtureF1DataProvider({
    scenario:
      scenario === "empty" ||
      scenario === "not-published" ||
      scenario === "not-covered" ||
      scenario === "cancelled" ||
      scenario === "partial" ||
      scenario === "stale" ||
      scenario === "missing-qualifying" ||
      scenario === "error"
        ? scenario
        : "success",
  });
  return (
    <RaceCenter
      provider={provider}
      selection={parseRaceCenterSelection(params)}
    />
  );
}
