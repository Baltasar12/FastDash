import { cn } from "@/lib/utils";
import { DatasetMetadata, DataMessage } from "./data-state";
import { fieldText, sessionLabel, sessionStartText } from "./format";
import { ResultsTable } from "./results-table";
import type { RaceCenterModel } from "./types";
import styles from "./race-center.module.css";

export function RaceCenterView({ model }: { model: RaceCenterModel }) {
  const { seasons, calendar, event, selection, session, results } = model;
  const seasonOptions =
    seasons.status === "success"
      ? [...seasons.data].sort((a, b) => b.year - a.year)
      : [];
  const events =
    calendar?.status === "success"
      ? [...calendar.data].sort((a, b) => a.round - b.round)
      : [];
  const selectedEvent = event?.status === "success" ? event.data : undefined;
  const sessions =
    selectedEvent?.sessions.status === "available"
      ? selectedEvent.sessions.value
      : [];
  const independentQualifying =
    results?.kind === "qualifying" && session === undefined;
  return (
    <div className={styles.root}>
      <header className={styles.masthead}>
        <div>
          <p className={styles.eyebrow}>SECTOR / EVENT EXPLORER</p>
          <h1 className={styles.pageTitle}>Race center.</h1>
        </div>
        <p className={styles.intro}>
          Every weekend has a story. Explore the event, choose a reported
          session or read an independently available result dataset.
        </p>
      </header>

      <section aria-label="Season and Grand Prix selection">
        <div className={styles.filters}>
          <form method="get" className={styles.selectorForm}>
            <div className={styles.field}>
              <label htmlFor="race-center-season">Season</label>
              <select
                id="race-center-season"
                name="season"
                className={styles.select}
                defaultValue={
                  seasonOptions.some((item) => item.year === selection.season)
                    ? String(selection.season)
                    : ""
                }
                disabled={seasonOptions.length === 0}
                required
              >
                <option value="" disabled>
                  Choose a season
                </option>
                {seasonOptions.map((item) => (
                  <option key={item.year} value={item.year}>
                    {item.year}
                  </option>
                ))}
              </select>
            </div>
            <button
              className={styles.action}
              disabled={seasonOptions.length === 0}
              type="submit"
            >
              Explore season
            </button>
          </form>
          <form method="get" className={styles.selectorForm}>
            {selection.season !== undefined && (
              <input type="hidden" name="season" value={selection.season} />
            )}
            <div className={styles.field}>
              <label htmlFor="race-center-event">Grand Prix</label>
              <select
                id="race-center-event"
                name="round"
                className={styles.select}
                defaultValue={
                  events.some((item) => item.round === selection.round)
                    ? String(selection.round)
                    : ""
                }
                disabled={events.length === 0}
                required
              >
                <option value="" disabled>
                  Choose a Grand Prix
                </option>
                {events.map((item) => (
                  <option key={item.id} value={item.round}>
                    R{String(item.round).padStart(2, "0")} · {item.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              className={styles.action}
              disabled={events.length === 0}
              type="submit"
            >
              Explore Grand Prix
            </button>
          </form>
        </div>
        <p className={styles.footnote}>
          Choose an option, then explore. Changing season resets the event and
          session; changing Grand Prix resets the session.
        </p>
        <DatasetMetadata result={seasons} label="Seasons" />
      </section>

      {model.selectionError && (
        <section className={styles.emptyState} role="alert">
          <h2 className={styles.stateTitle}>Selection unavailable</h2>
          <p className={styles.stateCopy}>{model.selectionError}</p>
          <p className={styles.stateCopy}>
            Use the season or Grand Prix controls above to choose an available
            event.
          </p>
        </section>
      )}
      {seasons.status !== "success" ? (
        <section aria-label="Season availability">
          <h2 className={styles.visuallyHidden}>Season availability</h2>
          <DataMessage
            result={seasons}
            label="Season list"
            selection={selection}
          />
        </section>
      ) : (
        seasons.data.length === 0 && (
          <section className={styles.emptyState}>
            <h2 className={styles.stateTitle}>No seasons available</h2>
            <p className={styles.stateCopy}>
              The provider returned no season records. Check again when season
              coverage is available.
            </p>
          </section>
        )
      )}
      {calendar && (
        <section aria-label="Calendar data">
          <h2 className={styles.visuallyHidden}>Calendar availability</h2>
          <DatasetMetadata result={calendar} label="Calendar" />
          {calendar.status !== "success" ? (
            <DataMessage
              result={calendar}
              label="Calendar"
              selection={selection}
            />
          ) : (
            calendar.data.length === 0 && (
              <div className={styles.emptyState}>
                <h3 className={styles.stateTitle}>No Grand Prix records</h3>
                <p className={styles.stateCopy}>
                  No events were returned for this season. Choose another
                  season.
                </p>
              </div>
            )
          )}
        </section>
      )}
      {event && event.status !== "success" && (
        <section aria-label="Event data">
          <h2 className={styles.visuallyHidden}>Event availability</h2>
          <DatasetMetadata result={event} label="Event" />
          <DataMessage
            result={event}
            label="Event overview"
            selection={selection}
          />
        </section>
      )}

      {selectedEvent && event?.status === "success" && (
        <>
          <section
            className={styles.eventOverview}
            aria-labelledby="race-center-event-heading"
          >
            <div className={styles.eventHeading}>
              <p className={styles.round}>
                <span className={styles.eyebrow}>ROUND</span>{" "}
                {String(selectedEvent.round).padStart(2, "0")}
              </p>
              <div>
                <p className={styles.eyebrow}>
                  {selectedEvent.season} / GRAND PRIX
                </p>
                <h2
                  className={styles.eventTitle}
                  id="race-center-event-heading"
                >
                  {selectedEvent.name}
                </h2>
              </div>
            </div>
            <dl className={styles.eventFacts}>
              <div className={styles.fact}>
                <dt className={styles.factLabel}>Circuit</dt>
                <dd className={styles.factValue}>
                  {selectedEvent.circuit.name}
                </dd>
              </div>
              <div className={styles.fact}>
                <dt className={styles.factLabel}>Location</dt>
                <dd className={styles.factValue}>
                  {fieldText(selectedEvent.circuit.locality)} /{" "}
                  {fieldText(selectedEvent.circuit.country)}
                </dd>
              </div>
              <div className={styles.fact}>
                <dt className={styles.factLabel}>Event date</dt>
                <dd className={styles.factValue}>
                  {fieldText(selectedEvent.date)}
                </dd>
              </div>
            </dl>
            <DatasetMetadata result={event} label="Event" />
            <div className={styles.sessions}>
              <h3 className={styles.eyebrow}>Reported sessions</h3>
              {sessions.length > 0 ? (
                <form
                  className={styles.sessionForm}
                  method="get"
                  aria-label="Choose a reported session"
                >
                  <input
                    type="hidden"
                    name="season"
                    value={selectedEvent.season}
                  />
                  <input
                    type="hidden"
                    name="round"
                    value={selectedEvent.round}
                  />
                  {sessions.map((item) => (
                    <button
                      key={item.id}
                      className={styles.sessionButton}
                      name="session"
                      value={item.kind}
                      type="submit"
                      aria-pressed={session?.id === item.id}
                    >
                      <span className={styles.sessionName}>
                        {sessionLabel(item)}
                      </span>
                      <span className={styles.sessionStatus}>
                        {item.status === "unknown"
                          ? "Status unknown"
                          : item.status}
                      </span>
                    </button>
                  ))}
                </form>
              ) : (
                <p className={styles.stateCopy}>
                  {selectedEvent.sessions.status === "available"
                    ? "No sessions were reported."
                    : `Session list: ${fieldText(selectedEvent.sessions)}. No weekend format has been assumed.`}
                </p>
              )}
            </div>
          </section>

          <section
            className={styles.results}
            aria-labelledby="race-center-results-heading"
          >
            <header className={styles.resultsHeader}>
              <div className={styles.resultsHeading}>
                <p className={styles.eyebrow}>
                  {independentQualifying
                    ? results.result.status === "success"
                      ? "INDEPENDENT RESULT DATASET"
                      : "INDEPENDENT RESULT REQUEST"
                    : "SESSION CLASSIFICATION"}
                </p>
                <h2
                  className={styles.resultsTitle}
                  id="race-center-results-heading"
                >
                  {independentQualifying
                    ? "Qualifying results"
                    : session
                      ? sessionLabel(session)
                      : "Session results"}
                </h2>
              </div>
              {session && (
                <div>
                  <p className={styles.status}>
                    Session:{" "}
                    {session.status === "unknown"
                      ? "status unknown"
                      : session.status}
                  </p>
                  <p className={styles.tableHint}>
                    Scheduled start: {sessionStartText(session)}
                  </p>
                </div>
              )}
            </header>
            {independentQualifying && (
              <p className={styles.tableHint}>
                Qualifying is not listed in the reported schedule. This result
                dataset is queried independently; no session time or weekend
                format has been inferred.
              </p>
            )}
            {results?.kind === "unsupported" ? (
              <div className={styles.emptyState}>
                <h3 className={styles.stateTitle}>Results unavailable</h3>
                <p className={styles.stateCopy}>{results.reason}</p>
                <p className={styles.stateCopy}>
                  Choose another reported session above.
                </p>
              </div>
            ) : (
              results && (
                <>
                  <DatasetMetadata result={results.result} label="Results" />
                  {results.kind === "race" &&
                    (results.result.status === "success" ? (
                      <ResultsTable
                        key={`${session?.id}:race`}
                        kind="race"
                        rows={results.result.data}
                        eventName={selectedEvent.name}
                        sessionName={session ? sessionLabel(session) : "Race"}
                      />
                    ) : (
                      <DataMessage
                        result={results.result}
                        label="Race results"
                        selection={selection}
                      />
                    ))}
                  {results.kind === "qualifying" &&
                    (results.result.status === "success" ? (
                      <ResultsTable
                        key={`${session?.id}:qualifying`}
                        kind="qualifying"
                        rows={results.result.data}
                        eventName={selectedEvent.name}
                        sessionName={
                          session ? sessionLabel(session) : "Qualifying"
                        }
                      />
                    ) : (
                      <DataMessage
                        result={results.result}
                        label="Qualifying results"
                        selection={selection}
                      />
                    ))}
                </>
              )
            )}
          </section>
        </>
      )}
      <p className={cn(styles.footnote, styles.intro)}>
        SECTOR is an independent project, not affiliated with Formula 1, the FIA
        or any team.
      </p>
    </div>
  );
}
