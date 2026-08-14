import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import type { PropertySummary } from "@/lib/types";

/** Real, pannable Lagos map.
 *
 *  This replaces an illustrative drawing — coloured rectangles for city blocks
 *  and hardcoded labels reading "Lekki Phase 1" — whose pins were positioned by
 *  linearly interpolating real coordinates into a fixed box. The pins moved with
 *  the data, so it looked right, but nothing around them was Lagos and the map
 *  could not be panned or zoomed.
 *
 *  MapLibre with OSM raster tiles rather than Mapbox: no access token, no
 *  billing account, and the ODbL attribution this app already owes OSM for its
 *  reference geography. Vector tiles would render more crisply but every free
 *  vector source needs a key, and a map that silently stops working when a trial
 *  lapses is worse than a slightly heavier raster one.
 *
 *  Production note: tile.openstreetmap.org is a donation-funded service with a
 *  usage policy that bars heavy commercial use. Before real traffic this needs a
 *  paid provider or a self-hosted tile server; the style below is the only thing
 *  that has to change.
 */

const OSM_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      maxzoom: 19,
      // Required by the ODbL. Rendered by MapLibre's attribution control, which
      // is deliberately not disabled anywhere in this file.
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

// Lagos, roughly centred on the lagoon so both the island and mainland show.
const LAGOS_CENTRE: [number, number] = [3.3792, 6.5244];
const DEFAULT_ZOOM = 11;

function pinColour(rating: number, reviews: number): string {
  // An unreviewed property is *unknown*, not bad. Colouring it red with a 0.0
  // tells people a building is terrible when nobody has rated it.
  if (reviews === 0) return "#94a3b8";
  if (rating >= 4) return "#15803d";
  if (rating >= 3) return "#b45309";
  return "#b91c1c";
}

export interface LagosMapProps {
  properties: PropertySummary[];
  selectedId: string | null;
  onSelect: (propertyId: string) => void;
}

export function LagosMap({ properties, selectedId, onSelect }: LagosMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<Map<string, maplibregl.Marker>>(new Map());
  // Held in a ref so the marker click handler always calls the current
  // callback without needing to tear down and rebuild every marker on render.
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const hasFitted = useRef(false);
  // Bumped whenever a map instance is created, so the marker effect re-runs
  // against the new one. Without it, React's development double-mount — and any
  // real remount — leaves markers attached to a map that has been torn down,
  // and the map renders with no pins at all.
  const [mapGeneration, setMapGeneration] = useState(0);

  useEffect(() => {
    if (map.current || !container.current) return;
    const instance = new maplibregl.Map({
      container: container.current,
      style: OSM_STYLE,
      center: LAGOS_CENTRE,
      zoom: DEFAULT_ZOOM,
      attributionControl: { compact: true },
    });
    instance.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "top-right",
    );
    map.current = instance;
    // Captured now rather than read in the cleanup: the registry is what this
    // map's markers were put into, and that is what has to be emptied when this
    // particular instance goes away.
    const registry = markers.current;
    setMapGeneration((n) => n + 1);

    return () => {
      instance.remove();
      map.current = null;
      // The markers belonged to the removed map; forget them so they are
      // rebuilt rather than treated as still present.
      registry.clear();
      hasFitted.current = false;
    };
  }, []);

  // Markers are reconciled rather than cleared and rebuilt: recreating every
  // DOM node on each render drops the tap you were in the middle of making.
  useEffect(() => {
    const m = map.current;
    if (!m) return;

    const seen = new Set<string>();
    for (const p of properties) {
      seen.add(p.propertyId);
      const existing = markers.current.get(p.propertyId);
      if (existing) {
        existing.setLngLat([p.lng, p.lat]);
        continue;
      }

      const el = document.createElement("button");
      el.type = "button";
      el.className = "rs-pin";
      el.style.background = pinColour(p.avgRating, p.totalReviews);
      el.textContent = p.totalReviews === 0 ? "–" : p.avgRating.toFixed(1);
      if (!p.locationExact) {
        // The coordinate is a neighbourhood centroid, not this building. A
        // dashed edge reads as "somewhere around here" rather than a rooftop.
        el.classList.add("rs-pin--approx");
      }
      el.setAttribute(
        "aria-label",
        [
          p.addressLocal,
          p.totalReviews === 0 ? "no reviews yet" : `rated ${p.avgRating}`,
          p.locationExact ? null : "approximate location",
        ]
          .filter(Boolean)
          .join(", "),
      );
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onSelectRef.current(p.propertyId);
      });

      markers.current.set(
        p.propertyId,
        new maplibregl.Marker({ element: el }).setLngLat([p.lng, p.lat]).addTo(m),
      );
    }

    for (const [id, marker] of markers.current) {
      if (!seen.has(id)) {
        marker.remove();
        markers.current.delete(id);
      }
    }

    // Frame the results once. Centring on Lagos as a whole put every pin off
    // screen — the map was real but showed the user nothing of their search.
    // Only on the first load with data: re-fitting whenever a filter changes
    // would yank the view out from under someone who had just panned somewhere.
    if (!hasFitted.current && properties.length > 0) {
      hasFitted.current = true;
      const bounds = new maplibregl.LngLatBounds();
      for (const p of properties) bounds.extend([p.lng, p.lat]);
      m.fitBounds(bounds, {
        // Generous bottom padding: the results sheet covers the lower third of
        // the map box, and a pin hidden behind it is a pin nobody can tap.
        padding: { top: 60, right: 50, bottom: 190, left: 50 },
        maxZoom: 15,
        animate: false,
      });
    }
  }, [properties, mapGeneration]);

  // Selection is styling only — panning the map under someone's finger every
  // time they tap a result in the list below is disorienting.
  useEffect(() => {
    for (const [id, marker] of markers.current) {
      marker.getElement().classList.toggle("rs-pin--selected", id === selectedId);
    }
  }, [selectedId, properties, mapGeneration]);

  return <div ref={container} className="h-full w-full" />;
}
