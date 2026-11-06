import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RacePreview } from "./race-preview";

describe("RacePreview data integrity", () => {
  it("identifies demonstration statistics and gives the visual an accessible description", () => {
    render(<RacePreview />);
    expect(screen.getByText("SAMPLE DATA / DESIGN PREVIEW")).toBeVisible();
    expect(screen.getByText(/All figures are illustrative/)).toBeVisible();
    expect(
      screen.getByRole("img", {
        name: "An original illustrative race circuit",
      }),
    ).toHaveAccessibleDescription(/not a real track map/);
    expect(
      screen.getByRole("img", { name: /Illustrative speed trace/ }),
    ).toBeVisible();
  });
});
