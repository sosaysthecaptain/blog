"use client";

import { useState, useRef, useEffect } from "react";

// Pastel tag colors
const TAG_COLORS = [
  { bg: "bg-amber-100", text: "text-amber-800", darkBg: "dark:bg-amber-900/30", darkText: "dark:text-amber-300" },
  { bg: "bg-emerald-100", text: "text-emerald-800", darkBg: "dark:bg-emerald-900/30", darkText: "dark:text-emerald-300" },
  { bg: "bg-sky-100", text: "text-sky-800", darkBg: "dark:bg-sky-900/30", darkText: "dark:text-sky-300" },
  { bg: "bg-violet-100", text: "text-violet-800", darkBg: "dark:bg-violet-900/30", darkText: "dark:text-violet-300" },
  { bg: "bg-rose-100", text: "text-rose-800", darkBg: "dark:bg-rose-900/30", darkText: "dark:text-rose-300" },
  { bg: "bg-teal-100", text: "text-teal-800", darkBg: "dark:bg-teal-900/30", darkText: "dark:text-teal-300" },
  { bg: "bg-orange-100", text: "text-orange-800", darkBg: "dark:bg-orange-900/30", darkText: "dark:text-orange-300" },
  { bg: "bg-indigo-100", text: "text-indigo-800", darkBg: "dark:bg-indigo-900/30", darkText: "dark:text-indigo-300" },
];

export function getTagColor(tag: string) {
  const hash = tag.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return TAG_COLORS[hash % TAG_COLORS.length];
}

interface TagInputProps {
  tags: string[];
  availableTags: string[];
  onChange: (tags: string[]) => void;
}

export default function TagInput({
  tags,
  availableTags,
  onChange,
}: TagInputProps) {
  const [input, setInput] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownIndex, setDropdownIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredTags = availableTags.filter(
    (t) =>
      t.toLowerCase().includes(input.toLowerCase()) && !tags.includes(t)
  );

  const showCreate =
    input.trim() &&
    !tags.includes(input.trim().toLowerCase()) &&
    !availableTags.some((t) => t.toLowerCase() === input.trim().toLowerCase());

  const totalItems = filteredTags.length + (showCreate ? 1 : 0);

  useEffect(() => {
    setDropdownIndex(0);
  }, [input]);

  const addTag = (tag: string) => {
    const normalized = tag.trim().toLowerCase();
    if (normalized && !tags.includes(normalized)) {
      onChange([...tags, normalized]);
    }
    setInput("");
    setShowDropdown(false);
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setDropdownIndex((i) => Math.min(i + 1, totalItems - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setDropdownIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && input.trim()) {
      e.preventDefault();
      if (dropdownIndex < filteredTags.length) {
        addTag(filteredTags[dropdownIndex]);
      } else if (showCreate) {
        addTag(input.trim());
      }
    } else if (e.key === "Escape") {
      setShowDropdown(false);
      setInput("");
    } else if (e.key === "Backspace" && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-1.5">
        {tags.map((tag) => {
          const color = getTagColor(tag);
          return (
            <span
              key={tag}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${color.bg} ${color.text} ${color.darkBg} ${color.darkText}`}
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="hover:opacity-70"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </span>
          );
        })}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? "Add tags..." : "+"}
          className="min-w-[60px] bg-transparent outline-none text-sm text-[--foreground] placeholder:text-[--muted]"
        />
      </div>

      {showDropdown && (filteredTags.length > 0 || showCreate) && (
        <div className="absolute z-10 w-full mt-1 bg-[--background] border border-[--border] rounded shadow-lg max-h-48 overflow-y-auto">
          {filteredTags.map((tag, idx) => {
            const color = getTagColor(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => addTag(tag)}
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 ${
                  idx === dropdownIndex ? "bg-[--hover]" : "hover:bg-[--hover]"
                }`}
              >
                <span
                  className={`px-2 py-0.5 rounded text-xs ${color.bg} ${color.text} ${color.darkBg} ${color.darkText}`}
                >
                  {tag}
                </span>
              </button>
            );
          })}
          {showCreate && (
            <button
              type="button"
              onClick={() => addTag(input.trim())}
              className={`w-full text-left px-3 py-2 text-sm ${
                dropdownIndex === filteredTags.length
                  ? "bg-[--hover]"
                  : "hover:bg-[--hover]"
              }`}
            >
              <span className="text-[--muted]">Create</span>{" "}
              <span className="font-medium text-[--foreground]">
                &quot;{input.trim()}&quot;
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
