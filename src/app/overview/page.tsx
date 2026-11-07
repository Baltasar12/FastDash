import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { f1Provider } from "@/data/providers/server";
import { OverviewDashboard } from "@/features/overview/components/overview-dashboard";
import { queryOverview } from "@/features/overview/server";
import { parseRaceCenterSelection } from "@/features/race-center/server";

export const metadata: Metadata = {
  title: "Overview",
  description:
    "Calendar context, championship standings and published race results, with source and freshness information.",
};

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const selection = parseRaceCenterSelection({ season: params.season });
  if (selection.invalid) {
    return (
      <Container>
        <section className="placeholder-hero">
          <h1>Overview.</h1>
          <p role="alert">Invalid season. Use one year from 1950 to 9999.</p>
          <Link className="text-link" href="/overview">
            Choose the current season
          </Link>
        </section>
      </Container>
    );
  }
  const model = await queryOverview(f1Provider, selection);
  return (
    <Container>
      <OverviewDashboard model={model} seasonAction="/overview" />
    </Container>
  );
}
