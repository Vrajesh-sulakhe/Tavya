import { fireEvent, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it, vi } from "vitest";
import { CaregiverView } from "../CaregiverView";
import { SeniorView } from "../SeniorView";
import {
  buildDashboardPayload,
  createBlankData,
  createSeedData,
} from "@/lib/seed";

function makeMockDashboard() {
  return buildDashboardPayload(createSeedData("2026-11-15"));
}

function makeBlankDashboard() {
  return buildDashboardPayload(createBlankData(), "2026-11-15");
}

async function expectNoAxeViolations(container: HTMLElement) {
  const results = await axe.run(container, {
    rules: {
      // jsdom does not compute visual layout/rendered CSS contrast
      "color-contrast": { enabled: false },
    },
  });
  expect(results.violations).toEqual([]);
}

describe("Tavya accessibility & role views", () => {
  it("SeniorView renders accessible landmarks, labels, and passes axe audit", async () => {
    const data = makeMockDashboard();
    const { container } = render(
      <main>
        <SeniorView
          data={data}
          textScale="standard"
          onDoseAction={vi.fn()}
          onLogVitals={vi.fn()}
          onOpenCaregiver={vi.fn()}
          onOpenSos={vi.fn()}
        />
      </main>
    );

    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /read.*schedule/i })).toBeInTheDocument();

    const hindiBtn = screen.getByRole("button", { name: "हिं" });
    fireEvent.click(hindiBtn);
    expect(screen.getByText(/दवाइयाँ सुनें/)).toBeInTheDocument();

    await expectNoAxeViolations(container);
  });

  it("SeniorView renders calm blank state pointing to Caregiver Hub and passes axe audit", async () => {
    const data = makeBlankDashboard();
    const { container } = render(
      <main>
        <SeniorView
          data={data}
          textScale="standard"
          onDoseAction={vi.fn()}
          onLogVitals={vi.fn()}
          onOpenCaregiver={vi.fn()}
          onOpenSos={vi.fn()}
        />
      </main>
    );

    expect(
      screen.getByRole("heading", { name: /no medications scheduled yet/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /open caregiver hub/i })
    ).toBeInTheDocument();
    await expectNoAxeViolations(container);
  });

  it("CaregiverView renders adherence overview, prescription analyzer, and passes axe audit", async () => {
    const data = makeMockDashboard();
    const { container } = render(
      <main>
        <CaregiverView
          data={data}
          onDoseAction={vi.fn()}
          onCreateMedication={vi.fn()}
          onUpdateMedication={vi.fn()}
          onDeleteMedication={vi.fn()}
          onToggleMedicationActive={vi.fn()}
          onUpdateProfile={vi.fn()}
          onAnalyzePrescription={vi.fn()}
          onAddParsedItems={vi.fn()}
          onCreateNote={vi.fn()}
          onDeleteNote={vi.fn()}
          onResetDemo={vi.fn()}
          onClearSchedule={vi.fn()}
        />
      </main>
    );

    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getByLabelText(/prescription text/i)).toBeInTheDocument();
    await expectNoAxeViolations(container);
  });
});
