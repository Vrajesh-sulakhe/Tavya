import { fireEvent, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it, vi } from "vitest";
import { AuthGate } from "../AuthGate";
import { CaregiverView } from "../CaregiverView";
import { SeniorView } from "../SeniorView";
import {
  buildDashboardPayload,
  createBlankData,
  createSeedData,
} from "@/lib/seed";

function makeMockDashboard(viewerRole: "senior" | "caretaker" | "family" = "caretaker") {
  return buildDashboardPayload(createSeedData("2026-11-15"), {
    todayKey: "2026-11-15",
    viewerRole,
  });
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
  it("AuthGate setup and login views render accessible headings, labels, and pass axe audit", async () => {
    const { container, rerender } = render(
      <AuthGate
        authStatus={{ configured: false, isDemo: false }}
        textScale="standard"
        onToggleTextScale={vi.fn()}
        onAuthenticated={vi.fn()}
        onDemoSeeded={vi.fn()}
      />
    );

    expect(
      screen.getByRole("heading", { name: /create your private care circle/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /load sample circle/i })
    ).toBeInTheDocument();
    await expectNoAxeViolations(container);

    rerender(
      <AuthGate
        authStatus={{ configured: true, isDemo: true }}
        textScale="xl"
        onToggleTextScale={vi.fn()}
        onAuthenticated={vi.fn()}
        onDemoSeeded={vi.fn()}
      />
    );

    expect(
      screen.getByRole("heading", { name: /enter your care circle passcode/i })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/4–8 digit passcode/i)).toBeInTheDocument();
    await expectNoAxeViolations(container);
  });

  it("SeniorView renders accessible landmarks, sharing switches, and passes axe audit", async () => {
    const data = makeMockDashboard("senior");
    const onUpdateConsent = vi.fn().mockResolvedValue(undefined);
    const { container } = render(
      <main>
        <SeniorView
          data={data}
          textScale="standard"
          onDoseAction={vi.fn()}
          onLogVitals={vi.fn()}
          onUpdateConsent={onUpdateConsent}
          onOpenCaregiver={vi.fn()}
          onOpenSos={vi.fn()}
        />
      </main>
    );

    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /read.*schedule/i })).toBeInTheDocument();

    const switches = screen.getAllByRole("switch");
    expect(switches).toHaveLength(2);
    fireEvent.click(switches[0]!);
    expect(onUpdateConsent).toHaveBeenCalledWith({ shareVitalsWithFamily: false });

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

  it("CaregiverView renders adherence overview, appointments, members, outbox, and passes axe audit", async () => {
    const data = makeMockDashboard("caretaker");
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
          onCreateAppointment={vi.fn()}
          onDeleteAppointment={vi.fn()}
          onAddMember={vi.fn()}
          onRemoveMember={vi.fn()}
          onRunReminders={vi.fn()}
          onResetDemo={vi.fn()}
          onClearSchedule={vi.fn()}
        />
      </main>
    );

    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getByLabelText(/prescription text/i)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /medical appointments/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /email reminders & outbox/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /care circle members/i })
    ).toBeInTheDocument();
    await expectNoAxeViolations(container);
  });

  it("CaregiverView redacts vitals and hides caretaker mutations in family view while passing axe audit", async () => {
    const seed = createSeedData("2026-11-15");
    seed.consent = { shareVitalsWithFamily: false, emailFamilyOnMissedDose: true };
    const data = buildDashboardPayload(seed, {
      todayKey: "2026-11-15",
      viewerRole: "family",
    });

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
          onResetDemo={vi.fn()}
          onClearSchedule={vi.fn()}
        />
      </main>
    );

    expect(
      screen.getByText(/kept daily mood & vitals check-ins private/i)
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add medication/i })).not.toBeInTheDocument();
    await expectNoAxeViolations(container);
  });
});
