import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/empty-state";
import { getPlatformModule, platformModules } from "@/config/navigation";

export const dynamicParams = false;
export function generateStaticParams() {
  return platformModules.map(({ slug }) => ({ section: slug }));
}

type PageProps = { params: Promise<{ section: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const platformModule = getPlatformModule((await params).section);
  return {
    title: platformModule?.label ?? "Not found",
    description: platformModule
      ? `${platformModule.detail} In development at SECTOR.`
      : undefined,
  };
}

export default async function PlatformPage({ params }: PageProps) {
  const platformModule = getPlatformModule((await params).section);
  if (!platformModule) notFound();
  return (
    <Container>
      <section className="placeholder-hero">
        <p className="eyebrow">
          {platformModule.index} / {platformModule.category}
        </p>
        <h1>
          {platformModule.label}
          <span className="accent-period">.</span>
        </h1>
        <p>{platformModule.detail}</p>
      </section>
      <EmptyState
        title="A new perspective is taking shape."
        description="This part of SECTOR is in development. Race data and analysis will arrive in a future phase."
      />
    </Container>
  );
}
