"use client";

export default function SearchBar({ value, onChange, className = "", autoFocus = false, onKeyDown }) {
  return (
    <div className={`w-full ${className}`}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Search events by keyword or year..."
        autoFocus={autoFocus}
        className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
      />
    </div>
  );
}


