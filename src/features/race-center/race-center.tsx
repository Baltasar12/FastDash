import "server-only";
import type { F1DataProvider } from "@/types/f1-provider";
import { loadRaceCenter } from "./queries";
import type { RaceCenterSelection } from "./types";
import { RaceCenterView } from "./view";

export async function RaceCenter({
  provider,
  selection = {},
}: {
  readonly provider: F1DataProvider;
  readonly selection?: RaceCenterSelection;
}) {
  return <RaceCenterView model={await loadRaceCenter(provider, selection)} />;
}
