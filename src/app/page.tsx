import { ArrowDown } from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { ExploreLink } from "@/features/overview/components/explore-link";
import { RacePreview } from "@/features/overview/components/race-preview";
import { ModuleList } from "@/features/overview/components/module-list";

export default function OverviewPage() {
  return (
    <Container>
      <section className="hero" aria-labelledby="hero-heading">
        <div className="hero-topline">
          <p className="eyebrow">
            <span className="tiny-cross" aria-hidden="true">
              +
            </span>{" "}
            INDEPENDENT MOTORSPORT INTELLIGENCE
          </p>
          <span className="eyebrow hero-edition">
            THE STARTING POINT / VOL. 00
          </span>
        </div>
        <div className="hero-main">
          <h1 id="hero-heading">
            Every fraction.
            <br />
            <span className="hero-second-line">
              Tells a story<span className="accent-period">.</span>
            </span>
          </h1>
          <div className="hero-aside">
            <span className="hero-coordinate eyebrow" aria-hidden="true">
              [ S — 00.001 ]
            </span>
            <p>
              The result is just the beginning.
              <br />A closer look changes everything.
            </p>
          </div>
        </div>
        <div className="hero-bottom">
          <div className="hero-intro">
            <span className="hero-axis" aria-hidden="true" />
            <p>
              Race pace. Fine margins. The bigger picture.
              <br />
              Formula 1, with a little more perspective.
            </p>
          </div>
          <ExploreLink />
          <a className="hero-scroll eyebrow" href="#inside-the-lap">
            SCROLL TO DISCOVER <ArrowDown size={16} aria-hidden="true" />
          </a>
        </div>
      </section>
      <div id="inside-the-lap" className="preview-anchor">
        <RacePreview />
      </div>
      <div className="preview-footnote">
        <span className="eyebrow">LESS NOISE. MORE UNDERSTANDING.</span>
        <span className="eyebrow">A PLATFORM IN THE MAKING ↗</span>
      </div>
      <section
        className="platform-section"
        id="platform"
        aria-labelledby="platform-heading"
      >
        <div className="platform-intro">
          <SectionHeading
            id="platform-heading"
            index="01"
            eyebrow="THE PLATFORM"
            title="Follow your curiosity."
          />
          <p>
            From the season’s bigger picture to the details of a single lap.
            Four ways to see more.
          </p>
        </div>
        <ModuleList />
        <div className="platform-bottom">
          <p>Built for fans. Driven by questions.</p>
          <span className="eyebrow">
            <span className="status-dot" />
            FREE TO EXPLORE. ALWAYS INDEPENDENT.
          </span>
        </div>
      </section>
    </Container>
  );
}
