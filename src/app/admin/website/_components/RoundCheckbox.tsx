"use client";

/**
 * Circular selection checkbox for the admin list views.
 *
 * A native checkbox styled as a soft circle: appearance is stripped so we
 * draw our own ring, and a white check fades in when selected. Fully
 * controlled — pass `checked` + `onChange` exactly like a plain input.
 */
export default function RoundCheckbox({
  checked,
  onChange,
  "aria-label": ariaLabel,
}: {
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  "aria-label": string;
}) {
  return (
    <label className="relative inline-flex h-4 w-4 items-center justify-center align-middle">
      <input
        type="checkbox"
        aria-label={ariaLabel}
        checked={checked}
        onChange={onChange}
        className="peer h-4 w-4 cursor-pointer appearance-none rounded-full border border-[#8c8f94] bg-white transition-colors checked:border-[#2271b1] checked:bg-[#2271b1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2271b1]/40"
      />
      <svg
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="pointer-events-none absolute h-2.5 w-2.5 text-white opacity-0 transition-opacity peer-checked:opacity-100"
      >
        <path d="M4 8.5l3 3 5-6" />
      </svg>
    </label>
  );
}
