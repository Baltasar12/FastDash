import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Navigation } from "./navigation";

vi.mock("next/navigation", () => ({ usePathname: () => "/calendar" }));

describe("Navigation", () => {
  it("marks only the active desktop destination", () => {
    render(<Navigation />);
    const nav = screen.getByRole("navigation", { name: "Main navigation" });
    expect(within(nav).getByRole("link", { name: "Calendar" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      within(nav).getByRole("link", { name: "Overview" }),
    ).not.toHaveAttribute("aria-current");
    expect(within(nav).getAllByRole("link")).toHaveLength(5);
  });

  it("opens an accessible mobile dialog and restores focus on Escape", async () => {
    const user = userEvent.setup();
    render(<Navigation />);
    const trigger = screen.getByRole("button", { name: "Open navigation" });
    await user.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Explore SECTOR" });
    expect(
      within(dialog).getByRole("navigation", { name: "Mobile navigation" }),
    ).toBeVisible();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("closes the mobile menu when a destination is selected", async () => {
    const user = userEvent.setup();
    render(<Navigation />);
    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    const dialog = screen.getByRole("dialog");
    // Cancel jsdom's unsupported document navigation; still exercise link behavior.
    const link = within(dialog).getByRole("link", { name: /Race Center/ });
    link.addEventListener("click", (event) => event.preventDefault());
    await user.click(link);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
