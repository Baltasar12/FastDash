import { ArrowDownRight, MoveUpRight } from "lucide-react";
import { sampleRace } from "@/features/overview/data/sample-race";

function CircuitIllustration() {
  return (
    <svg
      className="circuit-illustration"
      viewBox="0 0 680 340"
      fill="none"
      role="img"
      aria-labelledby="circuit-title"
      aria-describedby="circuit-description"
    >
      <title id="circuit-title">An original illustrative race circuit</title>
      <desc id="circuit-description">
        Three highlighted sectors trace an imaginary circuit. This is a visual
        concept, not a real track map.
      </desc>
      <defs>
        <pattern
          id="circuit-grid"
          width="34"
          height="34"
          patternUnits="userSpaceOnUse"
        >
          <path d="M34 0H0V34" stroke="#ffffff" strokeOpacity=".045" />
        </pattern>
      </defs>
      <path fill="url(#circuit-grid)" d="M0 0h680v340H0z" />
      <path
        d="M130 240 94 200q-12-14 5-27l115-83q10-8 20 0l41 34q8 7 20 0l60-38q12-8 25 0l145 92q12 8 5 20l-25 43q-6 10-20 8l-74-10q-15-2-23 9l-28 38q-10 14-23 4l-78-55q-9-7-20 0l-57 35q-13 8-24-3l-28-27Z"
        stroke="#283034"
        strokeWidth="18"
        strokeLinejoin="round"
      />
      <path
        d="M130 240 94 200q-12-14 5-27l115-83q10-8 20 0l41 34q8 7 20 0l60-38q12-8 25 0"
        stroke="#C6FA65"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m380 86 145 92q12 8 5 20l-25 43q-6 10-20 8l-74-10q-15-2-23 9l-28 38"
        stroke="#8FAF9A"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M360 286q-10 14-23 4l-78-55q-9-7-20 0l-57 35q-13 8-24-3l-28-27"
        stroke="#E7EAE0"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <circle
        cx="163"
        cy="124"
        r="6"
        fill="#C6FA65"
        stroke="#111518"
        strokeWidth="3"
      />
      <path d="m118 230 18-15" stroke="#F2F0E9" strokeWidth="3" />
      <g fill="#ADB6B0" fontFamily="monospace" fontSize="11">
        <text x="196" y="60">
          SECTOR 01
        </text>
        <text x="514" y="285">
          SECTOR 02
        </text>
        <text x="185" y="309">
          SECTOR 03
        </text>
      </g>
      <path d="M591 58v-20m-6 6 6-6 6 6" stroke="#88928D" />
      <text x="588" y="78" fill="#88928D" fontSize="10" fontFamily="monospace">
        N
      </text>
    </svg>
  );
}

export function RacePreview() {
  return (
    <section className="race-preview" aria-labelledby="preview-heading">
      <div className="preview-topline">
        <div className="preview-title">
          <span className="status-dot" />
          <h2 id="preview-heading">Inside the lap</h2>
        </div>
        <span className="sample-badge">SAMPLE DATA / DESIGN PREVIEW</span>
      </div>
      <div className="preview-body">
        <div className="circuit-panel">
          <div className="circuit-meta">
            <span className="eyebrow">{sampleRace.label}</span>
            <span className="eyebrow">LAP {sampleRace.lap}</span>
          </div>
          <CircuitIllustration />
          <div className="circuit-caption">
            <span className="eyebrow">
              THREE SECTORS. ONE COMPLETE PICTURE.
            </span>
            <MoveUpRight size={20} aria-hidden="true" />
          </div>
        </div>
        <div className="lap-panel">
          <div className="lap-heading">
            <span className="eyebrow">THE MARGIN THAT MATTERS</span>
            <span className="eyebrow">01 / 03</span>
          </div>
          <p className="lap-time">{sampleRace.bestLap}</p>
          <div className="lap-delta">
            <span>
              <ArrowDownRight size={18} aria-hidden="true" /> {sampleRace.delta}
              <small> SEC</small>
            </span>
            <span className="lap-note">vs. reference lap</span>
          </div>
          <div className="sector-times">
            {sampleRace.sectors.map((sector) => (
              <div key={sector.label}>
                <span className="eyebrow">{sector.label}</span>
                <span>{sector.time}</span>
              </div>
            ))}
          </div>
          <div className="sector-bar" aria-hidden="true">
            {sampleRace.sectors.map((sector) => (
              <span key={sector.label} style={{ width: sector.width }} />
            ))}
          </div>
          <div className="trace-heading">
            <span className="eyebrow">SPEED TRACE</span>
            <span className="eyebrow">KM/H</span>
          </div>
          <svg
            className="speed-trace"
            viewBox="0 0 360 65"
            fill="none"
            role="img"
            aria-label="Illustrative speed trace with acceleration and braking zones; sample data only"
          >
            <path d="M0 20H360M0 45H360" stroke="#ffffff" strokeOpacity=".07" />
            <path
              d="M0 44 20 37 35 12 57 8 67 48 79 49 98 28 116 12 143 6 158 53 177 40 191 19 221 9 237 38 248 43 269 17 294 9 306 50 320 47 341 25 360 18"
              stroke="#6C8277"
              strokeWidth="1.5"
            />
            <path
              d="M0 39 20 31 35 8 57 5 67 42 79 44 98 24 116 8 143 3 158 46 177 35 191 14 221 5 237 33 248 39 269 12 294 5 306 43 320 42 341 20 360 14"
              stroke="#C6FA65"
              strokeWidth="2"
            />
          </svg>
          <p className="preview-disclaimer">
            A glimpse of what’s ahead. All figures are illustrative.
          </p>
        </div>
      </div>
    </section>
  );
}
