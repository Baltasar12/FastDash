import type { FieldValue, RaceTime, SessionStart } from "@/types/f1";

export function fieldText<T>(
  field: FieldValue<T>,
  format: (value: T) => string = String,
): string {
  switch (field.status) {
    case "available":
      return format(field.value);
    case "missing":
      return "Not reported";
    case "unavailable":
      return field.reason === "not-published" ? "Not published" : "Unavailable";
    case "not-applicable":
      return "Not applicable";
  }
}

export function numberText(value: number): string {
  return new Intl.NumberFormat("en", { maximumFractionDigits: 20 }).format(
    value,
  );
}

export function dateText(date: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

export function instantText(at: string): string {
  return (
    new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
    }).format(new Date(at)) + " UTC"
  );
}

export function sessionStartText(start: SessionStart): string {
  return start.precision === "date"
    ? `${dateText(start.date)} · time not reported`
    : instantText(start.at);
}

export function raceTimeText(time: RaceTime): string {
  if (time.kind === "laps-down")
    return `+${time.laps} ${time.laps === 1 ? "lap" : "laps"}`;
  if (time.kind === "gap") return `+${numberText(time.milliseconds / 1000)} s`;
  const seconds = Math.floor(time.milliseconds / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  const decimalSeconds = new Intl.NumberFormat("en", {
    useGrouping: false,
    maximumFractionDigits: 20,
  }).format(time.milliseconds / 1000);
  const decimalPart = decimalSeconds.split(".")[1];
  const suffix = decimalPart ? `.${decimalPart}` : "";
  return `${hours ? `${hours}:` : ""}${hours ? String(minutes).padStart(2, "0") : minutes}:${String(remainder).padStart(2, "0")}${suffix}`;
}
