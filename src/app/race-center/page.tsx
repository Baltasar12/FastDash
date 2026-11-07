import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { f1Provider } from "@/data/providers/server";
import {
  RaceCenter,
  parseRaceCenterSelection,
} from "@/features/race-center/server";

export const metadata: Metadata = {
  title: "Race Center",
  description:
    "Explore reported event sessions and available race and qualifying results with source context.",
};

export default async function RaceCenterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const selection = parseRaceCenterSelection(await searchParams);
  const overviewHref =
    selection.invalid || selection.season === undefined
      ? "/overview"
      : `/overview?season=${selection.season}`;
  return (
    <Container>
      <p className="integration-context-link">
        <Link className="text-link" href={overviewHref}>
          Back to season overview
        </Link>
      </p>
      <RaceCenter provider={f1Provider} selection={selection} />
    </Container>
  );
}
