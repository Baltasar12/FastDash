import type {
  Classification,
  FieldValue,
  RaceTime,
  Session,
  SessionKind,
} from "@/types/f1";

export function fieldText<T>(
  field: FieldValue<T>,
  format: (value: T) => string = String,
): string {
  switch (field.status) {
    case "available":
      return format(field.value);
    case "missing":
      return "Not reported";
    case "not-applicable":
      return "Not applicable";
    case "unavailable":
      return field.reason === "not-published"
        ? "Not published"
        : field.reason === "not-covered"
          ? "Not covered"
          : "Unavailable";
  }
}

/** Trim rather than invent fractional precision absent from the numeric value. */
export function formatDuration(milliseconds: number): string {
  if (!Number.isFinite(milliseconds) || milliseconds < 0) {
    throw new RangeError("Duration must be finite and nonnegative.");
  }
  // Work from the number's canonical decimal representation. Arithmetic on an
  // isolated fractional remainder can round across a second boundary, while
  // fixed-width formatting can discard source-provided submillisecond digits.
  const source = String(milliseconds);
  const exponentAt = source.indexOf("e");
  const coefficient = exponentAt < 0 ? source : source.slice(0, exponentAt);
  const exponent = exponentAt < 0 ? 0 : Number(source.slice(exponentAt + 1));
  const pointAt = coefficient.indexOf(".");
  const digits = coefficient.replace(".", "");
  const decimalAt = (pointAt < 0 ? coefficient.length : pointAt) + exponent;
  const decimal =
    decimalAt <= 0
      ? `0.${"0".repeat(-decimalAt)}${digits}`
      : decimalAt >= digits.length
        ? `${digits}${"0".repeat(decimalAt - digits.length)}`
        : `${digits.slice(0, decimalAt)}.${digits.slice(decimalAt)}`;
  const fractionAt = decimal.indexOf(".");
  const whole = BigInt(fractionAt < 0 ? decimal : decimal.slice(0, fractionAt));
  const submillisecondDigits =
    fractionAt < 0 ? "" : decimal.slice(fractionAt + 1);
  const hours = whole / BigInt(3_600_000);
  const minutes = (whole / BigInt(60_000)) % BigInt(60);
  const seconds = (whole / BigInt(1000)) % BigInt(60);
  const fractionDigits =
    `${String(whole % BigInt(1000)).padStart(3, "0")}${submillisecondDigits}`.replace(
      /0+$/,
      "",
    );
  const fraction = fractionDigits ? `.${fractionDigits}` : "";
  return hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}${fraction}`
    : `${minutes}:${String(seconds).padStart(2, "0")}${fraction}`;
}

export function formatRaceTime(time: RaceTime): string {
  switch (time.kind) {
    case "elapsed":
      return formatDuration(time.milliseconds);
    case "gap":
      return `+${time.milliseconds / 1000} s`;
    case "laps-down":
      return `+${time.laps} ${time.laps === 1 ? "lap" : "laps"}`;
  }
}

export function classificationText(classification: Classification): string {
  if (classification.text.status === "available") {
    return classification.text.value;
  }
  return fieldText(classification.position);
}

export const SESSION_LABELS: Readonly<Record<SessionKind, string>> = {
  "practice-1": "Practice 1",
  "practice-2": "Practice 2",
  "practice-3": "Practice 3",
  qualifying: "Qualifying",
  "sprint-qualifying": "Sprint qualifying",
  sprint: "Sprint",
  race: "Race",
};

export function sessionLabel(session: Session): string {
  return session.name.status === "available"
    ? session.name.value
    : SESSION_LABELS[session.kind];
}

export function sessionStartText(session: Session): string {
  return fieldText(session.start, (start) =>
    start.precision === "date"
      ? `${start.date} · time not reported`
      : `${start.at} · UTC`,
  );
}
