"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useLoadScript } from "@react-google-maps/api";

type Prediction = {
  place_id: string;
  description: string;
  structured_formatting?: {
    main_text?: string;
    secondary_text?: string;
  };
};

function useDebouncedValue<T>(input: T, delayMs: number) {
  const [debounced, setDebounced] = useState(input);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(input), delayMs);
    return () => window.clearTimeout(t);
  }, [input, delayMs]);
  return debounced;
}

type GooglePlacesAutocompleteInputProps = {
  value: string;
  onChange: (value: string, meta?: { placeId?: string }) => void;
  placeholder?: string;
  disabled?: boolean;
  label?: string;
  /** Google autocomplete types, e.g. "(cities)" */
  types?: string[];
  /** Restrict results to a country code, e.g. "us" */
  country?: string;
  /** Minimum chars before querying */
  minLength?: number;
  /** Max dropdown items */
  maxItems?: number;
  /** If true, selects trigger onChange but do not run side-effects */
  suppressSelectSideEffects?: boolean;
};

export default function GooglePlacesAutocompleteInput({
  value,
  onChange,
  placeholder,
  disabled,
  label,
  types,
  country,
  minLength = 2,
  maxItems = 12,
}: GooglePlacesAutocompleteInputProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const [error, setError] = useState<string>("");

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: apiKey ?? "",
    libraries: ["places"],
  });

  const serviceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const latestReqRef = useRef<number>(0);

  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(false);
  const normalizedQuery = query.trim().toLowerCase();
  const typesKey = useMemo(() => (types?.length ? types.join("\0") : ""), [types]);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const debouncedQuery = useDebouncedValue(query, 250);

  useEffect(() => {
    if (!apiKey) {
      setError("Google Maps API key is not configured (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY).");
      return;
    }
    setError("");
  }, [apiKey]);

  const dropdownItems = useMemo(() => predictions.slice(0, maxItems), [predictions, maxItems]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!apiKey) return;
    if (disabled) return;

    if (!serviceRef.current) {
      serviceRef.current = new google.maps.places.AutocompleteService();
    }

    const q = debouncedQuery.trim();
    if (!q || q.length < minLength) {
      setPredictions([]);
      setOpen(false);
      return;
    }

    let cancelled = false;
    const reqId = Date.now();
    latestReqRef.current = reqId;

    setLoading(true);

    let pending = 2;
    let placeResults: Prediction[] = [];
    let queryResults: Prediction[] = [];

    const finish = () => {
      pending -= 1;
      if (pending > 0) return;
      if (cancelled) return;
      if (latestReqRef.current !== reqId) return;

      setLoading(false);

      const merged = [...queryResults, ...placeResults];
      const seen = new Set<string>();
      const deduped = merged.filter((item) => {
        const key = item.place_id || item.description.toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      setPredictions(deduped);
      setOpen(deduped.length > 0);
    };

    serviceRef.current.getPlacePredictions(
      {
        input: q,
        types: types?.length ? types : undefined,
        componentRestrictions: country ? { country } : undefined,
      },
      (results, status) => {
        if (!cancelled && latestReqRef.current === reqId) {
          placeResults =
            status === google.maps.places.PlacesServiceStatus.OK && Array.isArray(results)
              ? results
                  .map((r) => ({
                    place_id: r.place_id ?? "",
                    description: r.description ?? "",
                    structured_formatting: r.structured_formatting ?? undefined,
                  }))
                  .filter((r) => r.place_id && r.description)
              : [];
        }
        finish();
      }
    );

    serviceRef.current.getQueryPredictions(
      {
        input: q,
      },
      (results, status) => {
        if (!cancelled && latestReqRef.current === reqId) {
          queryResults =
            status === google.maps.places.PlacesServiceStatus.OK && Array.isArray(results)
              ? results
                  .map((r) => ({
                    place_id: r.place_id ?? "",
                    description: r.description ?? "",
                    structured_formatting: undefined,
                  }))
                  .filter((r) => r.place_id && r.description)
              : [];
        }
        finish();
      }
    );

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, isLoaded, apiKey, disabled, typesKey, country, minLength]);

  const closeSoon = () => {
    window.setTimeout(() => setOpen(false), 120);
  };

  return (
    <div className="space-y-2">
      {label ? <label className="block text-sm font-medium">{label}</label> : null}

      <div className="relative">
        <input
          type="text"
          value={query}
          placeholder={placeholder}
          disabled={disabled || !apiKey}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange(e.target.value);
          }}
          onFocus={() => {
            if (dropdownItems.length > 0) setOpen(true);
          }}
          onBlur={() => closeSoon()}
          className="w-full px-3 py-2 rounded-md border-2 border-border bg-card text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />

        {open ? (
          <div className="absolute left-0 right-0 z-20 mt-1 max-h-64 overflow-y-auto rounded-md border border-border bg-card shadow-sm">
            {loading ? (
              <div className="p-3 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching...
              </div>
            ) : dropdownItems.length === 0 ? (
              <div className="p-3 text-sm text-muted-foreground">No matches</div>
            ) : (
              <ul className="py-1">
                {dropdownItems.map((p) => (
                  <li key={p.place_id}>
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-muted/60 text-sm"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setQuery(p.description);
                        onChange(p.description, { placeId: p.place_id });
                        setOpen(false);
                        setPredictions([]);
                      }}
                    >
                      <div className="font-medium truncate">
                        {(() => {
                          const mainText = p.structured_formatting?.main_text || p.description;
                          if (!normalizedQuery) return mainText;
                          const idx = mainText.toLowerCase().indexOf(normalizedQuery);
                          if (idx < 0) return mainText;

                          const before = mainText.slice(0, idx);
                          const match = mainText.slice(idx, idx + normalizedQuery.length);
                          const after = mainText.slice(idx + normalizedQuery.length);

                          return (
                            <>
                              {before}
                              <span className="font-semibold">{match}</span>
                              {after}
                            </>
                          );
                        })()}
                      </div>
                      {p.structured_formatting?.secondary_text ? (
                        <div className="text-xs text-muted-foreground truncate">
                          {p.structured_formatting.secondary_text}
                        </div>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>

      {error ? <div className="text-xs text-destructive">{error}</div> : null}
    </div>
  );
}

