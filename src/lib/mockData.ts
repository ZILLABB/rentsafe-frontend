/** SAMPLE CONTENT — NOT A FALLBACK FOR LIVE DATA.
 *
 *  This module used to back `placeholderData` on every React Query hook, so an
 *  API outage silently rendered invented properties and ratings to people
 *  deciding whether to sign a lease. That is gone: the hooks in lib/hooks.ts
 *  now surface isLoading / isError, and the pages render skeletons and error
 *  states instead.
 *
 *  What remains is sample content for features that have no backend yet — the
 *  commute tab — and the screen that uses it labels it as sample data. Do not
 *  reintroduce any of this as a fallback for something the API can serve. */


export const MOCK_COMMUTE = {
  destinations: ["Victoria Island", "Ikoyi", "Yaba", "Ikeja GRA", "Apapa"],
  reported: { time: "~1h 30m", detail: "to VI on a weekday morning · 8 tenant reports", googleEstimate: "52 min" },
  simulated: [
    { label: "Worst-case morning rush", when: "Mon 7:00 AM · pessimistic", dur: "1h 45m", band: "bad" as const },
    { label: "Typical morning commute", when: "Mon 7:00 AM · best guess", dur: "1h 10m", band: "mid" as const },
    { label: "Post-rush commute", when: "Mon 9:30 AM · best guess", dur: "42m", band: "mid" as const },
    { label: "Midday", when: "Weekday 12:00 PM", dur: "28m", band: "good" as const },
    { label: "Worst-case Friday evening", when: "Fri 5:00 PM · pessimistic", dur: "2h 05m", band: "bad" as const },
  ],
  bottleneck: {
    title: "Bottleneck risk: single corridor",
    detail: "This area exits mainly via the Lekki–Epe Expressway. One incident can gridlock the whole route.",
  },
  transit: [
    { label: "BRT stop · 400m", available: true },
    { label: "Ferry terminal · 2.1km", available: true },
    { label: "Keke accessible", available: true },
    { label: "Bus park · 3.4km", available: false },
  ],
};

