import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { DemoScenarioProvider, useDemoScenario } from "../context/DemoScenarioContext";
import { CommandSidebar } from "../components/CommandSidebar";
import { PriorityQueueView } from "../components/views/PriorityQueueView";
import { CommandCentreView } from "../components/views/CommandCentreView";

// Consumer component to inspect and control navigation state
const NavTestConsumer: React.FC = () => {
  const {
    activeNavTab,
    setActiveNavTab,
    previousNavTab,
    openIncident,
    closeIncident,
    selectedIncidentCode,
    riskScore,
    confidenceScore,
  } = useDemoScenario();

  return (
    <div>
      <div data-testid="active-tab">{activeNavTab}</div>
      <div data-testid="prev-tab">{previousNavTab}</div>
      <div data-testid="selected-code">{selectedIncidentCode}</div>
      <div data-testid="tg2048-hazard">{riskScore}</div>
      <div data-testid="tg2048-confidence">{confidenceScore}</div>

      <button onClick={() => setActiveNavTab("OPERATIONS")}>Go Operations</button>
      <button onClick={() => setActiveNavTab("QUEUE")}>Go Queue</button>
      <button onClick={() => setActiveNavTab("MAP")}>Go Map</button>
      <button onClick={() => openIncident("TG-2048", "QUEUE")}>Open From Queue</button>
      <button onClick={() => openIncident("TG-2048", "MAP")}>Open From Map</button>
      <button onClick={() => closeIncident()}>Close Incident</button>
    </div>
  );
};

describe("Navigation & Priority Queue Identity", () => {
  beforeEach(() => {
    window.location.hash = "#operations";
  });

  it("ensures Situational Overview and Priority Queue resolve to distinct states", () => {
    render(
      <DemoScenarioProvider>
        <NavTestConsumer />
      </DemoScenarioProvider>
    );

    expect(screen.getByTestId("active-tab").textContent).toBe("OPERATIONS");

    fireEvent.click(screen.getByText("Go Queue"));
    expect(screen.getByTestId("active-tab").textContent).toBe("QUEUE");
    expect(window.location.hash).toBe("#priority-queue");

    fireEvent.click(screen.getByText("Go Operations"));
    expect(screen.getByTestId("active-tab").textContent).toBe("OPERATIONS");
    expect(window.location.hash).toBe("#operations");
  });

  it("preserves correct return destination across back navigation", () => {
    render(
      <DemoScenarioProvider>
        <NavTestConsumer />
      </DemoScenarioProvider>
    );

    // Open from Queue -> Incident -> Close -> Returns to Queue
    fireEvent.click(screen.getByText("Go Queue"));
    fireEvent.click(screen.getByText("Open From Queue"));
    expect(screen.getByTestId("active-tab").textContent).toBe("INCIDENTS");
    expect(screen.getByTestId("prev-tab").textContent).toBe("QUEUE");

    fireEvent.click(screen.getByText("Close Incident"));
    expect(screen.getByTestId("active-tab").textContent).toBe("QUEUE");

    // Open from Map -> Incident -> Close -> Returns to Map
    fireEvent.click(screen.getByText("Go Map"));
    fireEvent.click(screen.getByText("Open From Map"));
    expect(screen.getByTestId("active-tab").textContent).toBe("INCIDENTS");
    expect(screen.getByTestId("prev-tab").textContent).toBe("MAP");

    fireEvent.click(screen.getByText("Close Incident"));
    expect(screen.getByTestId("active-tab").textContent).toBe("MAP");
  });

  it("renders dedicated Priority Queue view with ranked items", () => {
    render(
      <DemoScenarioProvider>
        <PriorityQueueView />
      </DemoScenarioProvider>
    );

    expect(screen.getByText("Operational Priority Queue")).toBeDefined();
    expect(screen.getByText("TG-2048")).toBeDefined();
    expect(screen.getByText("TG-2105")).toBeDefined();
    expect(screen.getByText("TG-1944")).toBeDefined();
    expect(screen.getByText("TG-1082")).toBeDefined();

    // Verify P1 ranking
    expect(screen.getByText("P1 CRITICAL")).toBeDefined();
    expect(screen.getByText("Physical Hazard Index")).toBeDefined();
  });

  it("verifies TG-2048 data consistency across context and views", () => {
    render(
      <DemoScenarioProvider>
        <NavTestConsumer />
      </DemoScenarioProvider>
    );

    expect(screen.getByTestId("selected-code").textContent).toBe("TG-2048");
    expect(screen.getByTestId("tg2048-hazard").textContent).toBe("86");
    expect(screen.getByTestId("tg2048-confidence").textContent).toBe("54");
  });
});
