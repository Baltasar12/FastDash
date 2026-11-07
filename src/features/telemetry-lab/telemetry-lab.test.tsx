import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { TelemetryLab } from "./index";

describe("Telemetry Lab interactive prototype", () => {
  it.each(["Speed", "Throttle", "Braking", "Gear"])(
    "identifies synthetic %s values and offers a truthful table alternative",
    async (channel) => {
      const user = userEvent.setup();
      render(<TelemetryLab />);
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
        /Telemetry\s*Lab\./,
      );
      expect(screen.getAllByText(/synthetic/i).length).toBeGreaterThan(0);
      expect(
        screen.getByRole("img", { name: `${channel} — synthetic sample` }),
      ).toBeInTheDocument();
      const chartSection = screen.getByRole("region", { name: channel });
      expect(
        within(chartSection).getByText("A / Alex Vale / lap 12"),
      ).toBeVisible();
      expect(
        within(chartSection).getByText("B / Rin Sato / lap 18"),
      ).toBeVisible();
      await user.click(
        screen.getByText(`View ${channel.toLowerCase()} data table`),
      );
      const table = await screen.findByRole("table", {
        name: `${channel} — synthetic samples; elapsed from each lap start`,
      });
      expect(
        within(table).getByRole("columnheader", { name: "Elapsed (s)" }),
      ).toBeInTheDocument();
      expect(
        within(table).getAllByRole("cell", { name: "Unavailable" }).length,
      ).toBeGreaterThan(0);
      expect(within(table).getAllByRole("row").length).toBeGreaterThan(2);
      expect(
        screen.getByRole("heading", { name: "Track-distance delta" }),
      ).toBeInTheDocument();
    },
  );

  it("switches drivers and laps, updates traces and resets the selected driver's lap", async () => {
    const user = userEvent.setup();
    render(<TelemetryLab />);
    const chart = screen.getByRole("img", { name: "Speed — synthetic sample" });
    const initialPath = chart
      .querySelector('[data-driver="A"]')
      ?.getAttribute("d");
    await user.selectOptions(
      screen.getByLabelText("Lap A", { exact: true }),
      "13",
    );
    expect(screen.getByLabelText("Lap A", { exact: true })).toHaveValue("13");
    expect(
      chart.querySelector('[data-driver="A"]')?.getAttribute("d"),
    ).not.toBe(initialPath);
    await user.selectOptions(
      screen.getByLabelText("Driver A", { exact: true }),
      "mercer",
    );
    expect(screen.getByLabelText("Driver A", { exact: true })).toHaveValue(
      "mercer",
    );
    expect(screen.getByLabelText("Lap A", { exact: true })).toHaveValue("8");
    expect(screen.getByLabelText("Lap B", { exact: true })).toHaveValue("18");
    for (const channel of ["Speed", "Throttle", "Braking", "Gear"]) {
      expect(
        within(screen.getByRole("region", { name: channel })).getByText(
          "A / Jules Mercer / lap 8",
        ),
      ).toBeVisible();
    }
    expect(
      within(screen.getByLabelText("Driver A", { exact: true })).getByRole(
        "option",
        { name: /Rin Sato/ },
      ),
    ).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Reset comparison" }));
    expect(screen.getByLabelText("Driver A", { exact: true })).toHaveValue(
      "vale",
    );
    expect(screen.getByLabelText("Lap A", { exact: true })).toHaveValue("12");
  });

  it("removes usable chart data in loading, unavailable and error previews and recovers", async () => {
    const user = userEvent.setup();
    render(<TelemetryLab />);
    const preview = screen.getByLabelText("State preview", { exact: true });
    for (const value of ["loading", "unavailable", "error"]) {
      await user.selectOptions(preview, value);
      expect(preview).toHaveValue(value);
      expect(
        screen.queryByRole("img", { name: "Speed — synthetic sample" }),
      ).not.toBeInTheDocument();
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
      const recovery = screen.getByRole("button", { name: "Return to sample" });
      recovery.focus();
      expect(recovery).toHaveFocus();
      await user.keyboard("{Enter}");
      expect(
        screen.getByRole("img", { name: "Speed — synthetic sample" }),
      ).toBeInTheDocument();
      expect(preview).toHaveFocus();
    }
    await user.selectOptions(
      screen.getByLabelText("Session", { exact: true }),
      "race",
    );
    expect(
      screen.queryByRole("img", { name: "Speed — synthetic sample" }),
    ).not.toBeInTheDocument();
    await user.selectOptions(preview, "ready");
    expect(
      screen.queryByRole("img", { name: "Speed — synthetic sample" }),
    ).not.toBeInTheDocument();
    const raceRecovery = screen.getByRole("button", {
      name: "Return to sample",
    });
    raceRecovery.focus();
    expect(raceRecovery).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(
      screen.getByRole("img", { name: "Speed — synthetic sample" }),
    ).toBeInTheDocument();
    expect(preview).toHaveFocus();
  });

  it("changes historical contexts and exposes missing synthetic samples rather than bridging them", async () => {
    const user = userEvent.setup();
    render(<TelemetryLab />);
    const chart = screen.getByRole("img", { name: "Speed — synthetic sample" });
    const initial = chart.querySelector('[data-driver="A"]')?.getAttribute("d");
    const sampleB = chart.querySelector('[data-driver="B"]')?.getAttribute("d");
    expect(sampleB?.match(/M/g)?.length).toBeGreaterThan(1);
    await user.selectOptions(
      screen.getByLabelText("Historical event", { exact: true }),
      "monza-2023",
    );
    expect(
      chart.querySelector('[data-driver="A"]')?.getAttribute("d"),
    ).not.toBe(initial);
    await user.selectOptions(
      screen.getByLabelText("Session", { exact: true }),
      "practice",
    );
    expect(
      chart.querySelector('[data-driver="A"]')?.getAttribute("d")?.match(/M/g)
        ?.length,
    ).toBeGreaterThan(1);
  });
});
