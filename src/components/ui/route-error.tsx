"use client";

import Link from "next/link";
import { Container } from "./container";
import { Button } from "./button";

export function RouteError({ reset }: { readonly reset: () => void }) {
  return (
    <Container>
      <section
        className="placeholder-hero"
        aria-labelledby="route-error-heading"
      >
        <h1 id="route-error-heading">This view is unavailable.</h1>
        <p role="alert">
          The page could not be displayed. Try again or return to the season
          overview.
        </p>
        <Button onClick={reset}>Try again</Button>
        <p>
          <Link className="text-link" href="/overview">
            Return to overview
          </Link>
        </p>
      </section>
    </Container>
  );
}
