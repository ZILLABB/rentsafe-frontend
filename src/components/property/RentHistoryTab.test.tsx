import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LanguageProvider } from "@/lib/i18n";
import type { PropertySummary } from "@/lib/types";
import { RentHistoryTab } from "./RentHistoryTab";

/** The rent chart, which failed in two ways nobody saw.
 *
 *  With no data points the polylines were empty, so the tab rendered bare axes
 *  and no explanation — the "blanking out" that got reported. With exactly
 *  *one* point, `x(i)` divided by `points.length - 1` = 0 and every coordinate
 *  came out NaN, silently breaking the SVG. One point is the most common real
 *  case: one review, one year.
 */

function property(over: Partial<PropertySummary> = {}): PropertySummary {
  return {
    propertyId: "ETI-LEK-7F3A2B-0041",
    lat: 6.4474,
    lng: 3.4736,
    addressLocal: "12A Admiralty Way",
    neighbourhood: "Lekki Phase 1",
    lga: "Eti-Osa LGA",
    unitType: "2-bedroom flat",
    what3words: null,
    locationExact: true,
    avgRating: 3.5,
    totalReviews: 4,
    verifiedReviews: 2,
    latestRentKobo: 130_000_000,
    floodZone: "Moderate",
    elevationM: 4,
    drainageDistM: 200,
    powerHoursAvg: 12,
    securityRating: 3.5,
    highTurnover: false,
    ratingBreakdown: {
      landlord: 3, agent: 3, property: 3, water: 3, power: 3,
      security: 3, noise: 3, flooding: 3, neighbourhood: 3, value: 3,
    },
    rentHistory: [],
    rentIncreasePct: 12,
    areaIncreasePct: 9,
    rentPercentile: 60,
    floodEvents: [],
    agentSlug: null,
    ...over,
  } as PropertySummary;
}

function renderTab(p: PropertySummary) {
  return render(
    <LanguageProvider>
      <RentHistoryTab p={p} />
    </LanguageProvider>,
  );
}

describe("RentHistoryTab", () => {
  it("explains itself when no rent has been reported", () => {
    renderTab(property({ latestRentKobo: null, rentHistory: [] }));

    expect(screen.getByText(/No rent reported yet/i)).toBeInTheDocument();
    // Never a confident ₦0 cost breakdown built on a missing figure.
    expect(document.body.textContent).not.toMatch(/₦0\b/);
  });

  it("does not render a cost breakdown from a missing rent", () => {
    renderTab(property({ latestRentKobo: null, rentHistory: [] }));
    expect(screen.queryByText(/First-year total cost/i)).not.toBeInTheDocument();
  });

  it("renders a single data point without NaN coordinates", () => {
    renderTab(
      property({
        rentHistory: [{ year: 2025, rentKobo: 130_000_000, areaAvgKobo: 120_000_000 }],
      }),
    );

    const svg = document.querySelector("svg");
    expect(svg).toBeTruthy();
    // A single NaN anywhere invalidates the whole polyline and the chart
    // silently disappears.
    expect(svg!.outerHTML).not.toContain("NaN");
  });

  it("renders a normal multi-year series", () => {
    renderTab(
      property({
        rentHistory: [
          { year: 2023, rentKobo: 100_000_000, areaAvgKobo: 98_000_000 },
          { year: 2024, rentKobo: 115_000_000, areaAvgKobo: 108_000_000 },
          { year: 2025, rentKobo: 130_000_000, areaAvgKobo: 120_000_000 },
        ],
      }),
    );

    const svg = document.querySelector("svg");
    expect(svg!.outerHTML).not.toContain("NaN");
    expect(screen.getByText(/First-year total cost/i)).toBeInTheDocument();
  });

  it("uses theme tokens rather than hardcoded light-mode colours", () => {
    renderTab(
      property({
        rentHistory: [{ year: 2025, rentKobo: 130_000_000, areaAvgKobo: 120_000_000 }],
      }),
    );

    // Hardcoded hex axes were invisible against the dark theme.
    const svg = document.querySelector("svg")!.outerHTML;
    expect(svg).not.toMatch(/#E2E4E9|#F1F3F5|#9E9EB8|#1A7A8A|#FFFFFF/);
  });
});
