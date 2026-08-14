import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useProperties } from "@/lib/hooks";
import { LANG_META, useI18n, type Lang } from "@/lib/i18n";

/** Search over address, area and PropertyID, with a results dropdown.
 *
 *  This field used to have no state and no handler — the most prominent control
 *  on every screen did nothing. It now queries `GET /properties?q=`. */
function PropertySearch({ placeholder }: { placeholder: string }) {
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Keystrokes are cheap; requests over a Lagos mobile connection aren't.
  useEffect(() => {
    const id = setTimeout(() => setDebounced(term.trim()), 250);
    return () => clearTimeout(id);
  }, [term]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const enabled = debounced.length >= 2;
  const { data: results = [], isFetching } = useProperties(
    enabled ? { q: debounced, limit: 6 } : {},
  );
  const matches = enabled ? results : [];

  function go(propertyId: string) {
    setTerm("");
    setOpen(false);
    navigate(`/property/${propertyId}`);
  }

  return (
    <div ref={boxRef} className="relative flex-1">
      <label className="flex h-11 items-center gap-2 rounded-lg bg-muted px-3 text-xs transition-shadow focus-within:shadow-focus">
        <Search size={15} className="text-subtle" aria-hidden />
        <input
          value={term}
          onChange={(e) => {
            setTerm(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && matches[0]) go(matches[0].propertyId);
            if (e.key === "Escape") setOpen(false);
          }}
          className="w-full bg-transparent outline-none placeholder:text-subtle"
          placeholder={placeholder}
          aria-label="Search properties"
          aria-expanded={open && enabled}
          role="combobox"
          aria-controls="search-results"
        />
        {isFetching && enabled && (
          <Loader2 size={13} className="animate-spin text-subtle" aria-hidden />
        )}
      </label>

      <AnimatePresence>
        {open && enabled && (
          <motion.div
            id="search-results"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-x-0 top-12 z-40 overflow-hidden rounded-lg border border-border bg-card shadow-pop"
          >
            {matches.length === 0 && !isFetching && (
              <p className="px-3 py-3 text-xs text-muted-foreground">
                No property matches “{debounced}”.
              </p>
            )}
            {matches.map((p) => (
              <button
                key={p.propertyId}
                onClick={() => go(p.propertyId)}
                className="flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left transition-colors hover:bg-muted"
              >
                <span className="w-full truncate text-xs font-600 text-foreground">
                  {p.addressLocal}
                </span>
                <span className="font-mono text-2xs text-subtle">{p.propertyId}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** White sticky top bar (design 1a): ink logo mark, search field, language
 *  toggle (EN / Pidgin / Yorùbá — Section XVII). */
export function TopBar() {
  const { lang, setLang, t } = useI18n();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card">
      <div className="mx-auto flex h-14 max-w-3xl items-center gap-2.5 px-4">
        {/* -mx-1 px-1 keeps the 44px touch target without widening the layout. */}
        <Link
          to="/"
          className="-mx-1 flex h-11 w-11 shrink-0 items-center justify-center md:hidden"
          aria-label="RentSafe home"
        >
          <span className="flex h-[30px] w-[30px] items-center justify-center rounded-md bg-ink">
            <span className="h-3 w-3 rounded-[3.5px] border-[2.5px] border-aqua" />
          </span>
        </Link>

        <PropertySearch placeholder={t("search.placeholder")} />

        <div ref={menuRef} className="relative">
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex h-11 min-w-[44px] items-center justify-center rounded-md border border-border px-2 text-2xs font-700 text-primary-deep transition-colors hover:bg-muted"
            aria-label="Change language"
            aria-expanded={open}
            aria-haspopup="menu"
          >
            {LANG_META[lang].short}
          </button>
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-10 z-40 w-36 overflow-hidden rounded-lg border border-border bg-card shadow-pop"
              >
                {(Object.keys(LANG_META) as Lang[]).map((l) => (
                  <button
                    key={l}
                    onClick={() => {
                      setLang(l);
                      setOpen(false);
                    }}
                    className="flex w-full items-center justify-between px-3 py-2.5 text-left text-xs font-500 text-foreground transition-colors hover:bg-muted"
                  >
                    {LANG_META[l].label}
                    {lang === l && <Check size={14} className="text-primary" />}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
