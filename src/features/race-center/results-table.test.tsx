import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import {
  available,
  sampleOtherConstructor,
  sampleOtherFormatQualifying,
  sampleQualifyingResults,
  sampleRaceResults,
  sampleRaceWinner,
} from "@/data/fixtures/f1";
import { ResultsTable } from "./results-table";

describe("Race Center result exploration", () => {
  it("searches case-insensitively, combines constructor filters and clears them", async () => {
    const user = userEvent.setup();
    const rows = sampleRaceResults.map((row) =>
      row.driver.driver.id === "driver:sample-gap"
        ? { ...row, constructor: available(sampleOtherConstructor) }
        : row,
    );
    render(
      <ResultsTable
        kind="race"
        rows={rows}
        eventName="Sample Meadow"
        sessionName="Race"
      />,
    );
    await user.type(
      screen.getByLabelText("Search drivers or constructors"),
      "  ARIA ",
    );
    expect(screen.getAllByRole("row")).toHaveLength(2);
    await user.selectOptions(
      screen.getByLabelText("Constructor", { exact: true }),
      sampleOtherConstructor.id,
    );
    expect(screen.getByText("No matching entries")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getAllByRole("row")).toHaveLength(7);
    expect(screen.getByLabelText("Search drivers or constructors")).toHaveValue(
      "",
    );
    expect(screen.getByLabelText("Constructor", { exact: true })).toHaveValue(
      "",
    );
  });

  it("preserves disqualification, retirement, pit lane and unknown values independently of zero", () => {
    const rows = [
      { ...sampleRaceWinner, grid: { status: "missing" as const } },
      ...sampleRaceResults.slice(1),
    ];
    render(
      <ResultsTable
        kind="race"
        rows={rows}
        eventName="Sample Meadow"
        sessionName="Race"
      />,
    );
    expect(
      screen.getByRole("table", { name: "Sample Meadow — Race results" }),
    ).toBeVisible();
    expect(screen.getByRole("cell", { name: "DSQ" })).toBeVisible();
    expect(screen.getByRole("cell", { name: "R" })).toBeVisible();
    expect(screen.getByRole("cell", { name: "Pit lane" })).toBeVisible();
    const retired = screen.getByRole("cell", { name: "R" }).closest("tr");
    if (!retired) throw new Error("Expected retired row");
    expect(within(retired).getByRole("cell", { name: "0" })).toBeVisible();
    const winner = screen
      .getByText("Aria Sample", { exact: true })
      .closest("tr");
    if (!winner) throw new Error("Expected winner row");
    expect(
      within(winner).getByRole("cell", { name: "Not reported" }),
    ).toBeVisible();
  });

  it("opens entry context using season-specific code and number", async () => {
    const user = userEvent.setup();
    render(
      <ResultsTable
        kind="race"
        rows={[sampleRaceWinner]}
        eventName="Sample Meadow"
        sessionName="Race"
      />,
    );
    const summary = screen
      .getByText("Aria Sample", { exact: true })
      .closest("summary");
    if (!summary) throw new Error("Expected native summary");
    await user.click(summary);
    expect(summary.closest("details")).toHaveAttribute("open");
    expect(screen.getByText("Season: 2099")).toBeVisible();
    expect(screen.getByText("Driver code: SMP")).toBeVisible();
    expect(screen.getByText("Racing number: 12")).toBeVisible();
    expect(
      screen.getByText("Constructor nationality: Sampleland"),
    ).toBeVisible();
  });

  it("distinguishes unavailable qualifying times from stages not reported", () => {
    render(
      <ResultsTable
        kind="qualifying"
        rows={sampleQualifyingResults}
        eventName="Sample Meadow"
        sessionName="Qualifying"
      />,
    );
    expect(screen.getByRole("columnheader", { name: "Q1" })).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "Q2" })).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "Q3" })).toBeVisible();
    const noTime = screen.getByRole("cell", { name: "No time" }).closest("tr");
    if (!noTime) throw new Error("Expected no-time row");
    expect(
      within(noTime).getByRole("cell", { name: "Unavailable" }),
    ).toBeVisible();
    expect(
      within(noTime).getAllByRole("cell", {
        name: "Stage not reported",
      }),
    ).toHaveLength(2);
  });

  it("retains alternate qualifying formats without inventing Q1/Q2/Q3", () => {
    render(
      <ResultsTable
        kind="qualifying"
        rows={sampleOtherFormatQualifying}
        eventName="Sample Meadow"
        sessionName="Qualifying"
      />,
    );
    expect(
      screen.getByRole("columnheader", { name: "Single recorded session" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("columnheader", { name: /^Q[123]$/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "1:29.5" })).toBeVisible();
  });

  it("does not invent columns when a qualifying dataset contains no recorded stages", () => {
    const rows = sampleOtherFormatQualifying.map((row) => ({
      ...row,
      stages: [],
    }));
    render(
      <ResultsTable
        kind="qualifying"
        rows={rows}
        eventName="Sample Meadow"
        sessionName="Qualifying"
      />,
    );
    expect(screen.getAllByRole("columnheader")).toHaveLength(3);
    expect(
      screen.queryByRole("columnheader", { name: /^Q[123]$/ }),
    ).not.toBeInTheDocument();
  });

  it("provides a useful confirmed-empty message for zero-row result collections", () => {
    render(
      <ResultsTable
        kind="race"
        rows={[]}
        eventName="Sample Meadow"
        sessionName="Race"
      />,
    );
    expect(screen.getByText("No recorded entries")).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Showing 0 of 0 recorded entries",
    );
    expect(screen.queryByRole("cell", { name: "0" })).not.toBeInTheDocument();
  });
});
