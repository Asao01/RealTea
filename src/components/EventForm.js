"use client";

import { useEffect, useState } from "react";

export default function EventForm({ initial, onSubmit, onDelete, submitting }) {
  const [date, setDate] = useState(initial?.date || "");
  const [title, setTitle] = useState(initial?.title || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [sources, setSources] = useState(Array.isArray(initial?.sources) ? initial.sources.join("\n") : "");

  useEffect(() => {
    setDate(initial?.date || "");
    setTitle(initial?.title || "");
    setDescription(initial?.description || "");
    setSources(Array.isArray(initial?.sources) ? initial.sources.join("\n") : "");
  }, [initial]);

  function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      date,
      title,
      description,
      sources: sources
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    };
    onSubmit?.(payload);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-xs mb-1">Date (YYYY-MM-DD)</label>
        <input value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm" placeholder="2024-01-31" />
      </div>
      <div>
        <label className="block text-xs mb-1">Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-xs mb-1">Description (Markdown supported)</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={8} className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-xs mb-1">Sources (one per line)</label>
        <textarea value={sources} onChange={(e) => setSources(e.target.value)} rows={4} className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm" />
      </div>
      <div className="flex items-center gap-2">
        <button type="submit" disabled={submitting} className="px-3 py-2 text-sm rounded-md bg-blue-600 text-white disabled:opacity-50">{initial?.id ? "Update" : "Create"}</button>
        {initial?.id && (
          <button type="button" onClick={onDelete} disabled={submitting} className="px-3 py-2 text-sm rounded-md bg-red-600 text-white disabled:opacity-50">Delete</button>
        )}
      </div>
    </form>
  );
}


