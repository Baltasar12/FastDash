import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  sampleEmptyResult,
  sampleErrors,
  sampleMetadata,
  samplePartialResult,
  sampleSource,
  sampleStaleResult,
  sampleUnpublishedResult,
} from "@/data/fixtures/results";
import { DataMessage, Provenance } from "./overview-data-view";

describe("Overview asynchronous states and provenance", () => {
  it("announces loading without presenting placeholder statistics", () => {
    render(
      <DataMessage
        state={{ status: "loading" }}
        emptyCopy="No supplied entries."
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(/loading/i);
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("distinguishes a confirmed empty dataset from unpublished data", () => {
    const { rerender } = render(
      <DataMessage
        state={sampleEmptyResult}
        emptyCopy="The source confirmed no entries."
      />,
    );
    expect(screen.getByText("The source confirmed no entries.")).toBeVisible();
    rerender(
      <DataMessage
        state={sampleUnpublishedResult}
        emptyCopy="The source confirmed no entries."
      />,
    );
    expect(screen.getByText(/has not published/i)).toBeVisible();
    expect(
      screen.queryByText("The source confirmed no entries."),
    ).not.toBeInTheDocument();
  });

  it("shows retry guidance with the provider's reported rate-limit time", () => {
    render(
      <DataMessage
        state={{
          status: "error",
          error: sampleErrors["rate-limited"],
          metadata: {
            source: sampleSource,
            attemptedAt: sampleMetadata.retrievedAt,
          },
        }}
        emptyCopy="No entries."
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(/request limit/i);
    expect(screen.getByText(/retry after.*12:01 UTC/i)).toBeVisible();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("labels partial and provisional data independently at the point of display", () => {
    render(<Provenance state={samplePartialResult} />);
    expect(screen.getByText("SYNTHETIC SAMPLE")).toBeVisible();
    expect(
      screen.getByText(/invented season, people and results/i),
    ).toBeVisible();
    expect(screen.getByText("Provisional")).toBeVisible();
    expect(screen.getByText(/partial dataset/i)).toBeVisible();
    expect(screen.getByText(/SECTOR synthetic fixtures/i)).toBeVisible();
  });

  it("identifies stale cached data and the original successful retrieval time", () => {
    const { container } = render(<Provenance state={sampleStaleResult} />);
    expect(screen.getByText("Stale snapshot")).toBeVisible();
    expect(screen.getByText(/refresh failed/i)).toBeVisible();
    expect(container.querySelector("time")).toHaveAttribute(
      "datetime",
      sampleMetadata.retrievedAt,
    );
    expect(screen.getByText(/cached/i)).toBeVisible();
  });

  it("does not invent a source update time from the retrieval timestamp", () => {
    const { container } = render(<Provenance state={sampleEmptyResult} />);
    expect(container.querySelectorAll("time")).toHaveLength(1);
    expect(screen.queryByText(/source updated/i)).not.toBeInTheDocument();
  });
});
