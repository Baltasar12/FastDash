import Link from "next/link";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FieldValue, RaceResult } from "@/types/f1";
import type { OverviewModel, RaceCenterContext } from "../types";
import {
  dateText,
  fieldText,
  numberText,
  raceTimeText,
  sessionStartText,
} from "../formatters";
import { DataMessage, Provenance } from "./overview-data-view";
import styles from "../overview.module.css";

export interface OverviewDashboardProps {
  readonly model: OverviewModel;
  readonly seasonAction?: string;
  /** Route owner supplies the final Race Center query/path convention. */
  readonly raceCenterHref?: (context: RaceCenterContext) => string;
}

function defaultRaceCenterHref({ season, round }: RaceCenterContext): string {
  return `/race-center?season=${season}&round=${round}`;
}

/** Keep distinct historical entries for a driver separate in the preview. */
function resultKey(row: RaceResult): string {
  return JSON.stringify([
    row.sessionId,
    row.driver.driver.id,
    row.constructor.status === "available"
      ? row.constructor.value.id
      : row.constructor.status,
    row.driver.racingNumber,
  ]);
}

function AsOfRound({ round }: { round: FieldValue<number> }) {
  return (
    <span className={styles.asOf}>
      {round.status === "available"
        ? `As of round ${numberText(round.value)}`
        : `Round context: ${fieldText(round)}`}
    </span>
  );
}

function byReportedPosition(
  left: { readonly position: FieldValue<number> },
  right: { readonly position: FieldValue<number> },
) {
  if (
    left.position.status === "available" &&
    right.position.status === "available"
  )
    return left.position.value - right.position.value;
  if (left.position.status === "available") return -1;
  if (right.position.status === "available") return 1;
  return 0;
}

function SectionHeading({
  index,
  id,
  title,
  note,
}: {
  index: string;
  id: string;
  title: string;
  note: string;
}) {
  return (
    <div className={styles.sectionHeading}>
      <div>
        <p className={styles.label}>{index} / THE SEASON FILE</p>
        <h2 id={id}>{title}</h2>
      </div>
      <p className={styles.sectionNote}>{note}</p>
    </div>
  );
}

export function OverviewDashboard({
  model,
  seasonAction = "/",
  raceCenterHref = defaultRaceCenterHref,
}: OverviewDashboardProps) {
  const seasonData =
    model.seasons.status === "success"
      ? model.seasons.data.find((season) => season.year === model.season)
      : undefined;
  const championship = seasonData?.championship;
  const championshipStatus =
    championship?.status === "available"
      ? championship.value.status
      : "unknown";
  const events =
    model.calendar.status === "success" ? model.calendar.data : null;
  const completed = events?.filter(
    (event) =>
      event.sessions.status === "available" &&
      event.sessions.value.some(
        (session) => session.kind === "race" && session.status === "completed",
      ),
  ).length;
  const unknownRaceStatuses = events?.some(
    (event) =>
      event.sessions.status !== "available" ||
      !event.sessions.value.some(
        (session) => session.kind === "race" && session.status !== "unknown",
      ),
  );
  const next =
    model.nextEvent.status === "success" ? model.nextEvent.data : null;
  const nextReportedScheduled =
    next?.sessions.status === "available" &&
    next.sessions.value.some(
      (session) => session.kind === "race" && session.status === "scheduled",
    );
  const recent = model.recentRace;
  const sharedRecentMetadata =
    recent !== null &&
    model.recentRaceState.status !== "loading" &&
    recent.results.status !== "loading" &&
    JSON.stringify(model.recentRaceState.metadata) ===
      JSON.stringify(recent.results.metadata);
  // Keep the guard at the presentation boundary as well as using independent
  // query outcomes: callers can inject a serializable model directly.
  const mixedRecentSources =
    recent !== null &&
    model.recentRaceState.status !== "loading" &&
    recent.results.status !== "loading" &&
    model.recentRaceState.metadata.source.kind !==
      recent.results.metadata.source.kind;
  const drivers =
    model.drivers.status === "success"
      ? model.drivers.data.toSorted(byReportedPosition).slice(0, 5)
      : [];
  const constructors =
    model.constructors.status === "success"
      ? model.constructors.data.toSorted(byReportedPosition).slice(0, 5)
      : [];
  const results =
    recent?.results.status === "success" ? recent.results.data.slice(0, 6) : [];
  const selectable =
    model.seasons.status === "success"
      ? model.seasons.data.toSorted((a, b) => b.year - a.year)
      : [];
  const sharedContextMetadata =
    model.seasons.status !== "loading" &&
    model.calendar.status !== "loading" &&
    JSON.stringify(model.seasons.metadata) ===
      JSON.stringify(model.calendar.metadata);

  return (
    <div className={styles.overview}>
      <header className={styles.hero}>
        <div className={styles.topline}>
          <p className={styles.label}>
            SECTOR / INDEPENDENT MOTORSPORT INTELLIGENCE
          </p>
          <span className={styles.label}>OVERVIEW — 01</span>
        </div>
        <div className={styles.heroMain}>
          <div>
            <p className={styles.kicker}>THE BIGGER PICTURE</p>
            <h1>
              Season
              <br />
              in focus<span className={styles.period}>.</span>
            </h1>
            <p className={styles.intro}>
              The next chapter. The championship picture.
              <br />
              The details behind the result.
            </p>
          </div>
          <div className={styles.seasonPanel}>
            <p className={styles.label}>SELECTED SEASON</p>
            <p className={styles.seasonYear}>
              {model.season ?? "—"}
              {model.seasons.status !== "loading" &&
                model.seasons.metadata.source.kind === "synthetic" && (
                  <span className={styles.sampleNotice}>Synthetic preview</span>
                )}
            </p>
            <p className={styles.selectionNote}>
              {model.selection === "current"
                ? "Current supported season"
                : model.selection === "latest-supported"
                  ? "Latest season supplied by this source"
                  : model.selection === "requested"
                    ? "Your selected season"
                    : "No supported season selected"}
            </p>
            <form
              method="get"
              action={seasonAction}
              className={styles.seasonForm}
              aria-label="Choose overview season"
            >
              <label htmlFor="overview-season">Season</label>
              <div className={styles.seasonControls}>
                <select
                  id="overview-season"
                  name="season"
                  defaultValue={model.season ?? ""}
                  disabled={selectable.length === 0}
                >
                  {selectable.length === 0 && (
                    <option value="">No seasons available</option>
                  )}
                  {model.season !== null &&
                    !selectable.some(
                      (season) => season.year === model.season,
                    ) && <option value={model.season}>{model.season}</option>}
                  {selectable.map((season) => (
                    <option value={season.year} key={season.year}>
                      {season.year}
                    </option>
                  ))}
                </select>
                <button
                  className={styles.applyButton}
                  type="submit"
                  disabled={selectable.length === 0}
                >
                  View season <ArrowUpRight size={16} aria-hidden="true" />
                </button>
              </div>
            </form>
          </div>
        </div>
        <dl className={styles.contextStrip}>
          <div>
            <dt>Championship</dt>
            <dd>
              {championshipStatus === "unknown"
                ? "Status not reported"
                : championshipStatus.replaceAll("-", " ")}
            </dd>
          </div>
          <div>
            <dt>Reported calendar</dt>
            <dd>
              {events
                ? `${events.length} ${events.length === 1 ? "event" : "events"} supplied`
                : "Unavailable"}
            </dd>
          </div>
          <div>
            <dt>Main races in supplied calendar</dt>
            <dd>
              {completed === undefined ||
              (completed === 0 && unknownRaceStatuses)
                ? "Not reported"
                : `${completed} reported completed${unknownRaceStatuses ? " · remaining status unreported" : ""}`}
            </dd>
          </div>
          <div className={styles.jump}>
            <dt>Explore the picture</dt>
            <dd>
              <a href="#overview-championship">
                Championship <ArrowDown size={15} aria-hidden="true" />
              </a>
            </dd>
          </div>
        </dl>
        {model.seasons.status !== "success" && (
          <>
            <DataMessage
              state={model.seasons}
              emptyCopy="No supported seasons were returned. Check again when the source publishes a season."
            />
          </>
        )}
        <div className={styles.calendarNote}>
          <span className={styles.label}>
            {sharedContextMetadata
              ? "SEASON & CALENDAR CONTEXT"
              : "SEASON CONTEXT"}
          </span>
          <Provenance state={model.seasons} />
        </div>
        {!sharedContextMetadata && (
          <div className={styles.calendarNote}>
            <span className={styles.label}>CALENDAR CONTEXT</span>
            <Provenance state={model.calendar} />
          </div>
        )}
      </header>

      <section
        className={styles.nextEvent}
        aria-labelledby="overview-next-heading"
      >
        <div className={styles.darkTopline}>
          <h2 id="overview-next-heading">
            {next && !nextReportedScheduled
              ? "Next on calendar"
              : "Next Grand Prix"}
          </h2>
          <span className={styles.label}>
            {next
              ? nextReportedScheduled
                ? "SCHEDULED MAIN RACE"
                : "RACE STATUS NOT REPORTED"
              : "THE NEXT CHAPTER"}
            {model.nextEvent.status !== "loading" &&
              model.nextEvent.metadata.source.kind === "synthetic" && (
                <span className={styles.sampleNotice}>Synthetic preview</span>
              )}
          </span>
        </div>
        {next ? (
          <>
            <div className={styles.eventMain}>
              <div>
                <p className={styles.label}>
                  ROUND {numberText(next.round)} /{" "}
                  {fieldText(next.circuit.country)}
                </p>
                <h3>{next.name}</h3>
                <p className={styles.circuitName}>{next.circuit.name}</p>
                <p className={styles.eventDate}>
                  {fieldText(next.date, dateText)}
                </p>
              </div>
              <span className={styles.roundMark} aria-hidden="true">
                {String(next.round).padStart(2, "0")}
              </span>
            </div>
            <div className={styles.eventBottom}>
              <div className={styles.sessions}>
                <p className={styles.label}>REPORTED WEEKEND SCHEDULE</p>
                {next.sessions.status === "available" ? (
                  <ul>
                    {next.sessions.value.map((session) => (
                      <li key={session.id}>
                        <span>
                          {fieldText(session.name, String) === "Not reported"
                            ? session.kind.replaceAll("-", " ")
                            : fieldText(session.name)}
                          <small>{session.status}</small>
                        </span>
                        <span>
                          {fieldText(session.start, sessionStartText)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>{fieldText(next.sessions, () => "Reported sessions")}</p>
                )}
              </div>
              <div className={styles.eventAction}>
                <p>
                  Follow the weekend
                  <br />
                  from the inside.
                </p>
                <Link
                  className={cn(buttonVariants(), styles.darkButton)}
                  aria-label={`Explore this Grand Prix: ${next.name} in Race Center`}
                  href={raceCenterHref({
                    season: next.season,
                    round: next.round,
                  })}
                >
                  Explore this Grand Prix{" "}
                  <ArrowUpRight size={18} aria-hidden="true" />
                </Link>
              </div>
            </div>
          </>
        ) : (
          <DataMessage
            state={model.nextEvent}
            emptyCopy="No next event is identified in the supplied calendar. This does not establish that the whole season is complete."
          />
        )}
        <Provenance state={model.nextEvent} />
      </section>

      <section
        className={styles.championship}
        aria-labelledby="overview-championship"
        id="overview-championship-section"
      >
        <SectionHeading
          index="01"
          id="overview-championship"
          title="The championship picture."
          note="A snapshot of the supplied standings. Points, positions and source context stay together."
        />
        <div className={styles.standingsGrid}>
          <section aria-labelledby="overview-drivers" className={styles.ledger}>
            <div className={styles.ledgerHeading}>
              <h3 id="overview-drivers">Driver championship</h3>
              <span className={styles.label}>TOP 5 PREVIEW</span>
            </div>
            {model.drivers.status === "success" && drivers.length > 0 ? (
              <table className={styles.standingsTable}>
                <caption className={styles.srOnly}>
                  Driver championship standings preview, up to five supplied
                  entries
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Pos.</th>
                    <th scope="col">Driver / constructor</th>
                    <th scope="col">Points</th>
                    <th scope="col">Wins</th>
                  </tr>
                </thead>
                <tbody>
                  {drivers.map((row) => (
                    <tr key={row.driver.driver.id}>
                      <td className={styles.position}>
                        {fieldText(row.position, numberText)}
                      </td>
                      <th scope="row">
                        <span className={styles.entityName}>
                          {row.driver.driver.givenName}{" "}
                          {row.driver.driver.familyName}
                        </span>
                        <span className={styles.entityDetail}>
                          {fieldText(row.constructors, (items) =>
                            items.length
                              ? items.map((item) => item.name).join(" / ")
                              : "No constructors supplied",
                          )}
                        </span>
                        <AsOfRound round={row.asOfRound} />
                      </th>
                      <td className={styles.points}>
                        {fieldText(row.points, numberText)}
                      </td>
                      <td>{fieldText(row.wins, numberText)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <DataMessage
                state={
                  model.drivers.status === "success"
                    ? {
                        status: "empty",
                        reason: "no-entries",
                        metadata: model.drivers.metadata,
                      }
                    : model.drivers
                }
                emptyCopy="The source confirms no driver standings entries for this season."
              />
            )}
            <Provenance state={model.drivers} />
          </section>
          <section
            aria-labelledby="overview-constructors"
            className={styles.ledger}
          >
            <div className={styles.ledgerHeading}>
              <h3 id="overview-constructors">Constructor championship</h3>
              <span className={styles.label}>TOP 5 PREVIEW</span>
            </div>
            {model.constructors.status === "success" &&
            constructors.length > 0 ? (
              <table className={styles.standingsTable}>
                <caption className={styles.srOnly}>
                  Constructor championship standings preview, up to five
                  supplied entries
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Pos.</th>
                    <th scope="col">Constructor</th>
                    <th scope="col">Points</th>
                    <th scope="col">Wins</th>
                  </tr>
                </thead>
                <tbody>
                  {constructors.map((row) => (
                    <tr key={row.constructor.id}>
                      <td className={styles.position}>
                        {fieldText(row.position, numberText)}
                      </td>
                      <th scope="row">
                        <span className={styles.entityName}>
                          {row.constructor.name}
                        </span>
                        <AsOfRound round={row.asOfRound} />
                      </th>
                      <td className={styles.points}>
                        {fieldText(row.points, numberText)}
                      </td>
                      <td>{fieldText(row.wins, numberText)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <DataMessage
                state={
                  model.constructors.status === "success"
                    ? {
                        status: "empty",
                        reason: "no-entries",
                        metadata: model.constructors.metadata,
                      }
                    : model.constructors
                }
                emptyCopy="The source confirms no constructor standings entries for this season."
              />
            )}
            <Provenance state={model.constructors} />
          </section>
        </div>
      </section>

      <section className={styles.results} aria-labelledby="overview-results">
        <SectionHeading
          index="02"
          id="overview-results"
          title="Latest race results."
          note="Recent available main-race classifications. Calendar dates do not confirm completion or publication. Qualifying and sprint results are separate."
        />
        {recent ? (
          <>
            <div className={styles.resultsHeading}>
              <div>
                <p className={styles.label}>
                  ROUND {recent.event.round} / {recent.event.season}
                  {model.recentRaceState.status !== "loading" &&
                    model.recentRaceState.metadata.source.kind ===
                      "synthetic" && (
                      <span className={styles.sampleNotice}>
                        Synthetic preview
                      </span>
                    )}
                </p>
                <h3>{recent.event.name}</h3>
                <p>
                  {fieldText(recent.event.date, dateText)} ·{" "}
                  {recent.event.circuit.name}
                </p>
              </div>
              <Link
                className={styles.textLink}
                aria-label={`Explore race results: ${recent.event.name} in Race Center`}
                href={raceCenterHref({
                  season: recent.event.season,
                  round: recent.event.round,
                })}
              >
                Explore race results{" "}
                <ArrowUpRight size={18} aria-hidden="true" />
              </Link>
            </div>
            {!sharedRecentMetadata && (
              <>
                <div
                  className={styles.calendarNote}
                  role="group"
                  aria-label="Event context provenance"
                >
                  <span className={styles.label}>EVENT / CALENDAR CONTEXT</span>
                  <Provenance state={model.recentRaceState} />
                </div>
                <div
                  className={styles.calendarNote}
                  role="group"
                  aria-label="Classification provenance"
                >
                  <span className={styles.label}>CLASSIFICATION CONTEXT</span>
                  <Provenance state={recent.results} />
                </div>
              </>
            )}
            {mixedRecentSources ? (
              <div className={styles.state} role="status">
                <p className={styles.stateTitle}>Classification withheld</p>
                <p>
                  Event context and classification use different source kinds.
                  Classification rows are withheld to avoid combining invented
                  data with real results.
                </p>
              </div>
            ) : recent.results.status === "success" && results.length > 0 ? (
              <table className={styles.resultsTable}>
                <caption className={styles.tableCaption}>
                  First six supplied entries · times are elapsed, gap in
                  seconds, or laps down as reported.
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Classification</th>
                    <th scope="col">Driver / constructor</th>
                    <th scope="col">Time / gap</th>
                    <th scope="col">Laps</th>
                    <th scope="col">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((row) => (
                    <tr key={resultKey(row)}>
                      <td className={styles.position}>
                        <span
                          className={styles.mobileCellLabel}
                          aria-hidden="true"
                        >
                          Class.
                        </span>
                        {row.classification.text.status === "available"
                          ? row.classification.text.value
                          : fieldText(row.classification.position, numberText)}
                      </td>
                      <th scope="row">
                        <span className={styles.entityName}>
                          {row.driver.driver.givenName}{" "}
                          {row.driver.driver.familyName}
                        </span>
                        <span className={styles.entityDetail}>
                          {fieldText(
                            row.constructor,
                            (constructor) => constructor.name,
                          )}
                        </span>
                        <span className={styles.finishStatus}>
                          {fieldText(row.finishStatus.text)}
                          {row.finishStatus.text.status !== "available"
                            ? ` · ${row.finishStatus.kind.replaceAll("-", " ")}`
                            : ""}
                        </span>
                      </th>
                      <td className={styles.raceTime}>
                        <span
                          className={styles.mobileCellLabel}
                          aria-hidden="true"
                        >
                          Time / gap
                        </span>
                        {fieldText(row.time, raceTimeText)}
                      </td>
                      <td>
                        <span
                          className={styles.mobileCellLabel}
                          aria-hidden="true"
                        >
                          Laps
                        </span>
                        {fieldText(row.lapsCompleted, numberText)}
                      </td>
                      <td className={styles.points}>
                        <span
                          className={styles.mobileCellLabel}
                          aria-hidden="true"
                        >
                          Points
                        </span>
                        {fieldText(row.points, numberText)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <DataMessage
                state={
                  recent.results.status === "success"
                    ? {
                        status: "empty",
                        reason: "no-entries",
                        metadata: recent.results.metadata,
                      }
                    : recent.results
                }
                emptyCopy="The source confirms no classification entries for this race query."
              />
            )}
            {sharedRecentMetadata && (
              <div
                className={styles.calendarNote}
                role="group"
                aria-label="Event and classification provenance"
              >
                <span className={styles.label}>
                  EVENT &amp; CLASSIFICATION CONTEXT
                </span>
                <Provenance state={recent.results} />
              </div>
            )}
          </>
        ) : (
          <>
            <DataMessage
              state={model.recentRaceState}
              emptyCopy="No recent main-race classification is available from the supplied data. Results require confirmation from the source."
            />
            <Provenance state={model.recentRaceState} />
          </>
        )}
      </section>
      <div className={styles.closingNote}>
        <p>Less noise. More understanding.</p>
        <span className={styles.label}>
          FREE TO EXPLORE / ALWAYS INDEPENDENT
        </span>
      </div>
    </div>
  );
}
