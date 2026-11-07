import { notFound } from "next/navigation";
import { TelemetryLab } from "@/features/telemetry-lab";

export const dynamic = "force-dynamic";

export default function PreviewPage() {
  if (process.env.SECTOR_TELEMETRY_PREVIEW !== "1") notFound();
  return <TelemetryLab />;
}
