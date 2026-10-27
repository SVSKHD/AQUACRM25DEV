import { Search } from "lucide-react";
import { LiquidInput } from "../../ui/liquid";

/** Labelled search input with a leading icon, for catalog toolbars. */
export default function CatalogSearchField({
  value,
  onChange,
  placeholder,
  label = "Search",
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label?: string;
  className?: string;
}) {
  return (
    <div className={`relative min-w-0 ${className}`}>
      <LiquidInput
        label={label}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="pl-10"
      />
      <Search
        className="pointer-events-none absolute bottom-3.5 left-3.5 h-4 w-4 text-neutral-400"
        aria-hidden="true"
      />
    </div>
  );
}
