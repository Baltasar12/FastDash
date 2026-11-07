"use client";

import { useId, useReducer, useRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CHANNELS,
  DRIVERS,
  EVENTS,
  INITIAL_SELECTION,
  SESSIONS,
  comparisonState,
  createSyntheticLap,
  driverById,
  formatTime,
  selectionReducer,
  type PreviewState,
  type Selection,
  type SelectionAction,
  type SyntheticLap,
} from "./model";
import { TraceChart } from "./trace-chart";
import styles from "./telemetry-lab.module.css";

const PREVIEWS: readonly { id: PreviewState; label: string }[] = [
  { id: "ready", label: "Ready" },
  { id: "loading", label: "Loading" },
  { id: "unavailable", label: "Unavailable" },
  { id: "error", label: "Error" },
];

function DriverSelector({
  slot,
  selection,
  dispatch,
}: {
  slot: "A" | "B";
  selection: Selection;
  dispatch: React.Dispatch<SelectionAction>;
}) {
  const id = useId();
  const driverId = slot === "A" ? selection.driverA : selection.driverB;
  const other = slot === "A" ? selection.driverB : selection.driverA;
  const lapNumber = slot === "A" ? selection.lapA : selection.lapB;
  return (
    <fieldset
      className={cn(styles.driverFieldset, slot === "B" && styles.driverB)}
    >
      <legend>
        <span className={styles.slot}>{slot}</span> Comparison driver
      </legend>
      <div className={styles.driverFields}>
        <label htmlFor={`${id}-driver`}>
          Driver {slot}
          <select
            id={`${id}-driver`}
            value={driverId}
            onChange={(event) => {
              const driver = DRIVERS.find(
                (entry) => entry.id === event.target.value,
              );
              if (driver) dispatch({ type: "driver", slot, value: driver.id });
            }}
          >
            {DRIVERS.map((driver) => (
              <option
                key={driver.id}
                value={driver.id}
                disabled={driver.id === other}
              >
                {driver.name}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor={`${id}-lap`}>
          Lap {slot}
          <select
            id={`${id}-lap`}
            value={lapNumber}
            onChange={(event) =>
              dispatch({ type: "lap", slot, value: Number(event.target.value) })
            }
          >
            {driverById(driverId).laps.map((lap) => (
              <option key={lap} value={lap}>
                Lap {lap}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className={styles.controlNote}>Fictional driver · synthetic laps</p>
    </fieldset>
  );
}

function LapOverview({
  lapA,
  lapB,
}: {
  lapA: SyntheticLap;
  lapB: SyntheticLap;
}) {
  const id = useId();
  const differenceMs = lapB.durationMs - lapA.durationMs;
  const maximum = (lap: SyntheticLap): string => {
    const speeds = lap.samples.flatMap((sample) =>
      sample.speed === null ? [] : [sample.speed],
    );
    return speeds.length > 0 ? `${Math.max(...speeds)} km/h` : "Unavailable";
  };
  return (
    <section
      className={styles.overview}
      aria-labelledby={`${id}-overview-heading`}
    >
      <div className={styles.sectionTop}>
        <h2 id={`${id}-overview-heading`}>Comparison overview</h2>
        <span className={styles.sampleTag}>All values synthetic</span>
      </div>
      <div className={styles.lapSummary}>
        {[lapA, lapB].map((lap, slot) => (
          <div
            className={cn(styles.lapMetric, slot === 1 && styles.metricB)}
            key={slot}
          >
            <p className={styles.metricLabel}>
              {slot === 0 ? "A" : "B"} / {driverById(lap.driverId).name}{" "}
              <span>Lap {lap.lapNumber}</span>
            </p>
            <p className={styles.lapTime}>{formatTime(lap.durationMs)}</p>
            <p className={styles.metricNote}>
              Synthetic lap time · sampled maximum {maximum(lap)}
            </p>
          </div>
        ))}
        <div className={styles.lapDifference}>
          <span className={styles.metricLabel}>
            Lap-time difference · B − A
          </span>
          <strong>
            {differenceMs >= 0 ? "+" : "−"}
            {(Math.abs(differenceMs) / 1000).toFixed(3)}
            <small> s</small>
          </strong>
          <p>
            Synthetic total-time subtraction.
            <br />
            Not a track-distance delta.
          </p>
        </div>
      </div>
      <table className={styles.sectorTable}>
        <caption>Synthetic lap and sector time comparison · seconds</caption>
        <thead>
          <tr>
            <th scope="col">Driver / lap</th>
            <th scope="col">Sector 1</th>
            <th scope="col">Sector 2</th>
            <th scope="col">Sector 3</th>
          </tr>
        </thead>
        <tbody>
          {[lapA, lapB].map((lap, slot) => (
            <tr key={slot}>
              <th scope="row">
                <span className={slot === 0 ? styles.labelA : styles.labelB}>
                  {slot === 0 ? "A" : "B"}
                </span>{" "}
                {driverById(lap.driverId).short} / {lap.lapNumber}
              </th>
              {lap.sectorsMs.map((time, sector) => (
                <td key={sector}>{(time / 1000).toFixed(3)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export function TelemetryLab() {
  const [selection, dispatch] = useReducer(selectionReducer, INITIAL_SELECTION);
  const previewSelectRef = useRef<HTMLSelectElement>(null);
  const id = useId();
  const state = comparisonState(selection);
  const lapA = createSyntheticLap(selection, "A");
  const lapB = createSyntheticLap(selection, "B");
  const event = EVENTS.find((entry) => entry.id === selection.eventId);
  const missing = [lapA, lapB].reduce(
    (total, lap) =>
      total + lap.samples.filter((sample) => sample.speed === null).length,
    0,
  );
  const statusText =
    state === "ready"
      ? `Synthetic comparison updated. ${driverById(selection.driverA).name}, lap ${selection.lapA}, versus ${driverById(selection.driverB).name}, lap ${selection.lapB}. ${missing} missing samples.`
      : state === "loading"
        ? "Loading preview. No request is in progress."
        : state === "error"
          ? "Error preview. No real request failed."
          : "Comparison unavailable in this synthetic fixture.";
  return (
    <div className={styles.lab}>
      <header className={styles.hero}>
        <div className={styles.eyebrowRow}>
          <span>SECTOR / RESEARCH SERIES</span>
          <span>02C — INTERACTIVE PROTOTYPE</span>
        </div>
        <div className={styles.heroGrid}>
          <h1>
            Telemetry <br />
            <span>Lab.</span>
            <span className={styles.heroArrow} aria-hidden="true">
              ↗
            </span>
          </h1>
          <div className={styles.heroIntro}>
            <span className={styles.prototypeBadge}>Synthetic data only</span>
            <p>
              Two drivers.
              <br />
              Two laps. A closer look.
            </p>
            <p className={styles.heroDescription}>
              Explore the shape of performance. Compare speed, inputs and sector
              times in an independent analytical workbench.
            </p>
          </div>
        </div>
        <div className={styles.heroFoot}>
          <span>HISTORICAL CONTEXT / INVENTED PERFORMANCE</span>
          <span>No live feed · no provider connection</span>
        </div>
      </header>

      <section
        className={styles.selection}
        aria-labelledby={`${id}-selection-heading`}
      >
        <div className={styles.selectionTitle}>
          <h2 id={`${id}-selection-heading`}>Build a comparison</h2>
          <Button
            variant="outline"
            size="small"
            className={styles.resetButton}
            onClick={() => dispatch({ type: "reset" })}
          >
            Reset comparison
          </Button>
        </div>
        <div className={styles.contextFields}>
          <label htmlFor={`${id}-event`}>
            Historical event
            <select
              id={`${id}-event`}
              value={selection.eventId}
              onChange={(change) => {
                const selected = EVENTS.find(
                  (entry) => entry.id === change.target.value,
                );
                if (selected) dispatch({ type: "event", value: selected.id });
              }}
            >
              {EVENTS.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.label}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor={`${id}-session`}>
            Session
            <select
              id={`${id}-session`}
              value={selection.sessionId}
              onChange={(change) => {
                const selected = SESSIONS.find(
                  (entry) => entry.id === change.target.value,
                );
                if (selected) dispatch({ type: "session", value: selected.id });
              }}
            >
              {SESSIONS.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.label}
                </option>
              ))}
            </select>
          </label>
          <p className={styles.contextNote}>
            Real event names provide context only. Pilots, laps and signals
            below are invented; fixture availability says nothing about real
            session coverage.
          </p>
        </div>
        <div className={styles.drivers}>
          <DriverSelector slot="A" selection={selection} dispatch={dispatch} />
          <DriverSelector slot="B" selection={selection} dispatch={dispatch} />
        </div>
        <div className={styles.previewToolbar}>
          <label htmlFor={`${id}-preview`}>
            State preview
            <select
              id={`${id}-preview`}
              ref={previewSelectRef}
              value={selection.preview}
              onChange={(change) => {
                const selected = PREVIEWS.find(
                  (entry) => entry.id === change.target.value,
                );
                if (selected) dispatch({ type: "preview", value: selected.id });
              }}
            >
              {PREVIEWS.map((preview) => (
                <option key={preview.id} value={preview.id}>
                  {preview.label}
                </option>
              ))}
            </select>
          </label>
          <p>Preview interface states locally. No network requests.</p>
        </div>
      </section>

      <p className={styles.announcer} role="status" aria-live="polite">
        {statusText}
      </p>
      <div className={styles.workbench}>
        <div className={styles.workbenchTop}>
          <span>ANALYSIS / {event?.location.toUpperCase()}</span>
          <span>SYNTHETIC SPECIMEN</span>
        </div>
        <div className={styles.legend} role="group" aria-label="Trace legend">
          <span>
            <i className={styles.lineA} aria-hidden="true" />A /{" "}
            {driverById(selection.driverA).name} / lap {selection.lapA}
          </span>
          <span>
            <i className={styles.lineB} aria-hidden="true" />B /{" "}
            {driverById(selection.driverB).name} / lap {selection.lapB}
          </span>
        </div>
        {state === "ready" ? (
          <>
            <LapOverview lapA={lapA} lapB={lapB} />
            <div className={styles.qualityNote}>
              <span className={styles.qualityMark} aria-hidden="true">
                !
              </span>
              <p>
                <strong>Elapsed-time comparison. Not track aligned.</strong>{" "}
                {98 - missing} of 98 synthetic sample rows available. Different
                lap durations and missing samples prevent position-by-position
                conclusions.
              </p>
            </div>
            <section
              className={styles.channels}
              aria-labelledby={`${id}-traces-heading`}
            >
              <div className={styles.channelIntro}>
                <h2 id={`${id}-traces-heading`}>Read the lap.</h2>
                <p>
                  Solid A / dashed B · synthetic traces
                  <br />
                  Shared elapsed-time scale across all channels
                </p>
              </div>
              {CHANNELS.map((channel, index) => (
                <TraceChart
                  key={channel.id}
                  channel={channel}
                  lapA={lapA}
                  lapB={lapB}
                  index={index + 1}
                />
              ))}
            </section>
          </>
        ) : (
          <section
            className={styles.statePanel}
            aria-labelledby={`${id}-state-heading`}
          >
            <span className={styles.stateIndex} aria-hidden="true">
              {state === "loading" ? "···" : state === "error" ? "!" : "—"}
            </span>
            <span className={styles.sampleTag}>Synthetic state preview</span>
            <h2 id={`${id}-state-heading`}>
              {state === "loading"
                ? "Preparing the comparison"
                : state === "error"
                  ? "Comparison could not load"
                  : "Comparison unavailable"}
            </h2>
            <p>
              {state === "loading"
                ? "This is a persistent loading preview. No request is in progress; return to the sample when ready."
                : state === "error"
                  ? "This demonstrates a recoverable error. No real request failed and unknown metrics are not replaced with zero."
                  : "This fixture does not support the selected comparison. Actual historical session coverage must be checked by the future adapter."}
            </p>
            <Button
              className={styles.recoveryButton}
              onClick={() => {
                dispatch(
                  selection.sessionId === "race"
                    ? { type: "reset" }
                    : { type: "preview", value: "ready" },
                );
                previewSelectRef.current?.focus();
              }}
            >
              Return to sample
            </Button>
          </section>
        )}
        <section
          className={styles.delta}
          aria-labelledby={`${id}-delta-heading`}
        >
          <div>
            <span className={styles.index}>05 / ALIGNMENT</span>
            <h2 id={`${id}-delta-heading`}>Track-distance delta</h2>
          </div>
          <div>
            <p className={styles.unavailableLabel}>
              Unavailable — no reliable alignment
            </p>
            <p>
              Elapsed timestamps do not identify the same track position.
              Distance reference, alignment quality and a validated algorithm
              are required before plotting a true delta. No delta is calculated
              here.
            </p>
          </div>
        </section>
        <div className={styles.workbenchFoot}>
          <span>SECTOR / TELEMETRY LAB</span>
          <span>Independent analysis · precision with context</span>
        </div>
      </div>

      <section
        className={styles.provenance}
        aria-labelledby={`${id}-provenance-heading`}
      >
        <div>
          <span className={styles.kicker}>READ BEFORE INTERPRETING</span>
          <h2 id={`${id}-provenance-heading`}>
            Provenance &amp; <br />
            accuracy.
          </h2>
        </div>
        <div className={styles.provenanceCopy}>
          <p>
            <strong>Everything displayed is synthetic.</strong> Three fictional
            drivers and deterministic feature-local waveforms demonstrate
            interaction only. No real telemetry, official results or team assets
            are included. The generator has no retrieval timestamp or live
            freshness.
          </p>
          <p>
            OpenF1 historical coverage begins in 2023. Coverage and channel
            completeness must be verified for every session. Separate driver
            timestamps are not assumed synchronized. Straight chart segments are
            visual interpolation; gaps remain unavailable. Brake and gear use
            sample-hold steps, not additional observations.
          </p>
          <p>
            These local presentation models are provisional. The future server
            adapter must validate identity mappings, units, timestamps, missing
            data, alignment and provenance before real data can be shown.
          </p>
          <p className={styles.independence}>
            SECTOR is an independent project, unaffiliated with Formula 1, the
            FIA or any team.
          </p>
        </div>
      </section>
    </div>
  );
}
