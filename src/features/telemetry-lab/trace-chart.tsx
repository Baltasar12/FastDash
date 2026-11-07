"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/utils";
import {
  channelValue,
  driverById,
  type Channel,
  type SyntheticLap,
} from "./model";
import styles from "./telemetry-lab.module.css";

interface TraceChartProps {
  channel: {
    id: Channel;
    label: string;
    unit: string;
    min: number;
    max: number;
  };
  lapA: SyntheticLap;
  lapB: SyntheticLap;
  index: number;
}

function tracePath(
  lap: SyntheticLap,
  channel: Channel,
  maximum: number,
  domain: number,
): string {
  let path = "";
  let connected = false;
  const stepped = channel === "brake" || channel === "gear";
  for (const sample of lap.samples) {
    const value = sample[channel];
    if (value === null) {
      connected = false;
      continue;
    }
    const x = ((sample.elapsedMs / domain) * 1000).toFixed(2);
    const y = (210 - (value / maximum) * 200).toFixed(2);
    path += connected
      ? stepped
        ? ` H${x} V${y}`
        : ` L${x},${y}`
      : ` M${x},${y}`;
    connected = true;
  }
  return path;
}

export function TraceChart({ channel, lapA, lapB, index }: TraceChartProps) {
  const id = useId();
  const [tableOpen, setTableOpen] = useState(false);
  const domain = Math.max(lapA.durationMs, lapB.durationMs);
  const gapCount = [lapA, lapB].reduce(
    (total, lap) =>
      total +
      lap.samples.filter((sample) => sample[channel.id] === null).length,
    0,
  );
  const stepped = channel.id === "brake" || channel.id === "gear";
  return (
    <section
      className={cn(styles.trace, channel.id === "speed" && styles.speedTrace)}
      aria-labelledby={`${id}-heading`}
    >
      <div className={styles.traceHeading}>
        <div className={styles.traceName}>
          <span className={styles.index}>0{index}</span>
          <h3 id={`${id}-heading`}>{channel.label}</h3>
          <span className={styles.unit}>{channel.unit}</span>
        </div>
        <span className={styles.sampleTag}>Synthetic sample</span>
      </div>
      <div
        className={styles.chartLegend}
        role="group"
        aria-label={`${channel.label} trace legend`}
      >
        <span>
          <i className={styles.lineA} aria-hidden="true" />A /{" "}
          {driverById(lapA.driverId).name} / lap {lapA.lapNumber}
        </span>
        <span>
          <i className={styles.lineB} aria-hidden="true" />B /{" "}
          {driverById(lapB.driverId).name} / lap {lapB.lapNumber}
        </span>
      </div>
      <figure className={styles.figure}>
        <div className={styles.plotGrid}>
          <div className={styles.yAxis} aria-hidden="true">
            <span>{channel.id === "brake" ? "On" : channel.max}</span>
            {channel.id !== "brake" && <span>{channel.max / 2}</span>}
            <span>{channel.id === "brake" ? "Off" : channel.min}</span>
          </div>
          <svg
            className={styles.plot}
            viewBox="0 0 1000 220"
            preserveAspectRatio="none"
            role="img"
            aria-labelledby={`${id}-title`}
            aria-describedby={`${id}-description`}
          >
            <title
              id={`${id}-title`}
            >{`${channel.label} — synthetic sample`}</title>
            <desc id={`${id}-description`}>
              A: {driverById(lapA.driverId).name}, lap {lapA.lapNumber}. B:{" "}
              {driverById(lapB.driverId).name}, lap {lapB.lapNumber}. Elapsed
              seconds from each lap start, not track aligned. {gapCount} missing
              samples shown as gaps. Use the data table below for exact
              synthetic values.
            </desc>
            {[10, 110, 210].map((y) => (
              <line
                key={`h-${y}`}
                x1="0"
                x2="1000"
                y1={y}
                y2={y}
                className={styles.gridLine}
              />
            ))}
            {[0, 250, 500, 750, 1000].map((x) => (
              <line
                key={`v-${x}`}
                x1={x}
                x2={x}
                y1="10"
                y2="210"
                className={styles.gridLine}
              />
            ))}
            <path
              data-driver="A"
              d={tracePath(lapA, channel.id, channel.max, domain)}
              className={styles.traceA}
              vectorEffect="non-scaling-stroke"
            />
            <path
              data-driver="B"
              d={tracePath(lapB, channel.id, channel.max, domain)}
              className={styles.traceB}
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <div className={styles.xAxis} aria-hidden="true">
            {[0, 0.25, 0.5, 0.75, 1].map((part) => (
              <span key={part}>{((part * domain) / 1000).toFixed(1)}</span>
            ))}
          </div>
        </div>
        <figcaption className={styles.plotCaption}>
          <span>
            Elapsed seconds · each lap starts at 0 · not track aligned
          </span>
          <span>
            {stepped
              ? "Steps hold synthetic sample values until the next sample."
              : "Straight segments are visual interpolation, not observed values."}{" "}
            {gapCount > 0
              ? `${gapCount} missing samples; gaps are not joined.`
              : "No missing samples in this fixture."}
          </span>
        </figcaption>
      </figure>
      <details
        className={styles.dataDetails}
        onToggle={(event) => setTableOpen(event.currentTarget.open)}
      >
        <summary>View {channel.label.toLowerCase()} data table</summary>
        {tableOpen && (
          <table className={styles.sampleTable}>
            <caption>
              {channel.label} — synthetic samples; elapsed from each lap start
            </caption>
            <thead>
              <tr>
                <th scope="col">Driver</th>
                <th scope="col">Lap</th>
                <th scope="col">Elapsed (s)</th>
                <th scope="col">{channel.unit}</th>
              </tr>
            </thead>
            <tbody>
              {[lapA, lapB].map((lap, slot) =>
                lap.samples.map((sample) => (
                  <tr key={`${lap.driverId}-${sample.elapsedMs}`}>
                    <th scope="row">
                      {slot === 0 ? "A" : "B"} /{" "}
                      {driverById(lap.driverId).short}
                    </th>
                    <td>{lap.lapNumber}</td>
                    <td>{(sample.elapsedMs / 1000).toFixed(3)}</td>
                    <td>{channelValue(sample[channel.id], channel.id)}</td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        )}
      </details>
    </section>
  );
}
