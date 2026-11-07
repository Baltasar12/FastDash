"use client";

import { useId, useState } from "react";
import type {
  DriverSeason,
  FieldValue,
  Constructor,
  QualifyingResult,
  RaceResult,
} from "@/types/f1";
import {
  classificationText,
  fieldText,
  formatDuration,
  formatRaceTime,
} from "./format";
import styles from "./race-center.module.css";

export type ResultsTableProps = (
  | { readonly kind: "race"; readonly rows: readonly RaceResult[] }
  | { readonly kind: "qualifying"; readonly rows: readonly QualifyingResult[] }
) & { readonly eventName: string; readonly sessionName: string };

/** A driver may have multiple historical entries in the same classification. */
function resultKey(row: RaceResult | QualifyingResult): string {
  return JSON.stringify([
    row.sessionId,
    row.driver.driver.id,
    row.constructor.status === "available"
      ? row.constructor.value.id
      : row.constructor.status,
    row.driver.racingNumber,
  ]);
}

function constructorName(constructor: FieldValue<Constructor>): string {
  return fieldText(constructor, (value) => value.name);
}

function DriverContext({
  driver,
  constructor,
}: {
  driver: DriverSeason;
  constructor: FieldValue<Constructor>;
}) {
  return (
    <details className={styles.details}>
      <summary className={styles.detailsSummary}>
        <span className={styles.driverName}>
          {driver.driver.givenName} {driver.driver.familyName}
        </span>
      </summary>
      <div className={styles.detailsBody}>
        <p>Season: {driver.season}</p>
        <p>Driver code: {fieldText(driver.code)}</p>
        <p>Racing number: {fieldText(driver.racingNumber)}</p>
        <p>Driver nationality: {fieldText(driver.driver.nationality)}</p>
        <p>Constructor: {constructorName(constructor)}</p>
        <p>
          Constructor nationality:{" "}
          {constructor.status === "available"
            ? fieldText(constructor.value.nationality)
            : constructorName(constructor)}
        </p>
      </div>
    </details>
  );
}

function rowMatches(
  row: RaceResult | QualifyingResult,
  search: string,
  constructor: string,
) {
  const name = `${row.driver.driver.givenName} ${row.driver.driver.familyName}`;
  const code =
    row.driver.code.status === "available" ? row.driver.code.value : "";
  const team =
    row.constructor.status === "available" ? row.constructor.value.name : "";
  return (
    `${name} ${code} ${team}`
      .toLocaleLowerCase("en")
      .includes(search.trim().toLocaleLowerCase("en")) &&
    (constructor === "" ||
      (row.constructor.status === "available" &&
        row.constructor.value.id === constructor))
  );
}

/** A small client boundary for local filters only; server/provider code stays out. */
export function ResultsTable(props: ResultsTableProps) {
  const [search, setSearch] = useState("");
  const [constructor, setConstructor] = useState("");
  const id = useId();
  const constructors = new Map<string, string>();
  props.rows.forEach((row) => {
    if (row.constructor.status === "available") {
      constructors.set(row.constructor.value.id, row.constructor.value.name);
    }
  });
  const visibleCount = props.rows.filter((row) =>
    rowMatches(row, search, constructor),
  ).length;
  const stages = new Map<string, string>();
  if (props.kind === "qualifying") {
    props.rows.forEach((row) =>
      row.stages.forEach((stage) => stages.set(stage.id, stage.name)),
    );
  }
  const stageColumns = [...stages];
  const caption = `${props.eventName} — ${props.sessionName} results`;
  return (
    <>
      <div className={styles.resultTools}>
        <div className={styles.field}>
          <label htmlFor={`${id}-search`}>Search drivers or constructors</label>
          <input
            id={`${id}-search`}
            className={styles.search}
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Name, code or constructor"
          />
        </div>
        <div className={styles.field}>
          <label htmlFor={`${id}-constructor`}>Constructor</label>
          <select
            id={`${id}-constructor`}
            className={styles.filter}
            value={constructor}
            onChange={(event) => setConstructor(event.target.value)}
          >
            <option value="">All constructors</option>
            {[...constructors].map(([key, name]) => (
              <option key={key} value={key}>
                {name}
              </option>
            ))}
          </select>
        </div>
        {(search !== "" || constructor !== "") && (
          <button
            className={styles.action}
            type="button"
            onClick={() => {
              setSearch("");
              setConstructor("");
            }}
          >
            Clear filters
          </button>
        )}
      </div>
      <p className={styles.tableHint} role="status">
        Showing {visibleCount} of {props.rows.length} recorded entries.
      </p>
      <p className={styles.tableHint} id={`${id}-hint`}>
        Scroll the table horizontally for all columns. Select a driver name for
        entry details.
      </p>
      <div
        className={styles.tableRegion}
        role="region"
        aria-label={caption}
        aria-describedby={`${id}-hint`}
        tabIndex={0}
      >
        <table className={styles.table}>
          <caption className={styles.tableCaption}>{caption}</caption>
          <thead>
            <tr>
              <th scope="col">Pos.</th>
              <th scope="col">Driver</th>
              <th scope="col">Constructor</th>
              {props.kind === "race" ? (
                <>
                  <th scope="col">Grid</th>
                  <th scope="col">Laps</th>
                  <th scope="col">Time / gap</th>
                  <th scope="col">Status</th>
                  <th scope="col">Points</th>
                  <th scope="col">Fastest lap</th>
                </>
              ) : (
                stageColumns.map(([key, name]) => (
                  <th scope="col" key={key}>
                    {name}
                  </th>
                ))
              )}
            </tr>
          </thead>
          <tbody>
            {props.kind === "race"
              ? props.rows
                  .filter((row) => rowMatches(row, search, constructor))
                  .map((row) => (
                    <tr key={resultKey(row)}>
                      <td className={styles.position}>
                        {classificationText(row.classification)}
                      </td>
                      <th scope="row" className={styles.driver}>
                        <DriverContext
                          driver={row.driver}
                          constructor={row.constructor}
                        />
                      </th>
                      <td className={styles.constructorCell}>
                        {constructorName(row.constructor)}
                      </td>
                      <td className={styles.numeric}>
                        {fieldText(row.grid, (grid) =>
                          grid.kind === "position"
                            ? String(grid.position)
                            : "Pit lane",
                        )}
                      </td>
                      <td className={styles.numeric}>
                        {fieldText(row.lapsCompleted)}
                      </td>
                      <td className={styles.numeric}>
                        {fieldText(row.time, formatRaceTime)}
                      </td>
                      <td className={styles.status}>
                        <span>
                          {row.finishStatus.kind.replaceAll("-", " ")}
                        </span>
                        {row.finishStatus.text.status === "available" && (
                          <span className={styles.driverContext}>
                            {row.finishStatus.text.value}
                          </span>
                        )}
                      </td>
                      <td className={styles.numeric}>
                        {fieldText(row.points)}
                      </td>
                      <td className={styles.numeric}>
                        {fieldText(row.fastestLap, (lap) =>
                          fieldText(lap.time, (time) =>
                            formatDuration(time.milliseconds),
                          ),
                        )}
                      </td>
                    </tr>
                  ))
              : props.rows
                  .filter((row) => rowMatches(row, search, constructor))
                  .map((row) => (
                    <tr key={resultKey(row)}>
                      <td className={styles.position}>
                        {classificationText(row.classification)}
                      </td>
                      <th scope="row" className={styles.driver}>
                        <DriverContext
                          driver={row.driver}
                          constructor={row.constructor}
                        />
                      </th>
                      <td className={styles.constructorCell}>
                        {constructorName(row.constructor)}
                      </td>
                      {stageColumns.map(([key]) => {
                        const stage = row.stages.find(
                          (item) => item.id === key,
                        );
                        return (
                          <td className={styles.numeric} key={key}>
                            {stage
                              ? fieldText(stage.time, (time) =>
                                  formatDuration(time.milliseconds),
                                )
                              : "Stage not reported"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
          </tbody>
        </table>
      </div>
      {visibleCount === 0 && (
        <div className={styles.emptyState}>
          <h3 className={styles.stateTitle}>
            {props.rows.length === 0
              ? "No recorded entries"
              : "No matching entries"}
          </h3>
          <p className={styles.stateCopy}>
            {props.rows.length === 0
              ? "No result rows were returned for this session. Choose another session."
              : "Try another driver or constructor, or clear the filters."}
          </p>
        </div>
      )}
      <p className={styles.footnote}>
        {props.kind === "race"
          ? "Time: elapsed h:mm:ss or m:ss. Gaps: seconds (s) or whole laps. Points may be fractional. Finish status is independent of classification."
          : "Times: m:ss. Only reported qualifying stages are shown. A stage not reported does not imply participation or elimination."}{" "}
        Missing, unavailable and inapplicable values remain distinct.
      </p>
    </>
  );
}
