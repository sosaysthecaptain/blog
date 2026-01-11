"use client";

import { useState, useRef, useEffect } from "react";
import { TagColorsMap, setTagColor } from "@/lib/notes";

// Pastel tag colors
export const TAG_COLORS = [
  { bg: "bg-amber-100", text: "text-amber-800", darkBg: "dark:bg-amber-900/30", darkText: "dark:text-amber-300", name: "Amber" },
  { bg: "bg-emerald-100", text: "text-emerald-800", darkBg: "dark:bg-emerald-900/30", darkText: "dark:text-emerald-300", name: "Emerald" },
  { bg: "bg-sky-100", text: "text-sky-800", darkBg: "dark:bg-sky-900/30", darkText: "dark:text-sky-300", name: "Sky" },
  { bg: "bg-violet-100", text: "text-violet-800", darkBg: "dark:bg-violet-900/30", darkText: "dark:text-violet-300", name: "Violet" },
  { bg: "bg-rose-100", text: "text-rose-800", darkBg: "dark:bg-rose-900/30", darkText: "dark:text-rose-300", name: "Rose" },
  { bg: "bg-teal-100", text: "text-teal-800", darkBg: "dark:bg-teal-900/30", darkText: "dark:text-teal-300", name: "Teal" },
  { bg: "bg-orange-100", text: "text-orange-800", darkBg: "dark:bg-orange-900/30", darkText: "dark:text-orange-300", name: "Orange" },
  { bg: "bg-indigo-100", text: "text-indigo-800", darkBg: "dark:bg-indigo-900/30", darkText: "dark:text-indigo-300", name: "Indigo" },
  { bg: "bg-pink-100", text: "text-pink-800", darkBg: "dark:bg-pink-900/30", darkText: "dark:text-pink-300", name: "Pink" },
  { bg: "bg-cyan-100", text: "text-cyan-800", darkBg: "dark:bg-cyan-900/30", darkText: "dark:text-cyan-300", name: "Cyan" },
  { bg: "bg-lime-100", text: "text-lime-800", darkBg: "dark:bg-lime-900/30", darkText: "dark:text-lime-300", name: "Lime" },
  { bg: "bg-gray-100", text: "text-gray-800", darkBg: "dark:bg-gray-900/30", darkText: "dark:text-gray-300", name: "Gray" },
];

// Store for tag colors - will be populated from props
let tagColorsCache: TagColorsMap = {};

export function getTagColor(tag: string, customColors?: TagColorsMap) {
  const colors = customColors || tagColorsCache;
  if (colors[tag] !== undefined) {
    return TAG_COLORS[colors[tag] % TAG_COLORS.length];
  }
  // Default: hash-based color
  const hash = tag.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return TAG_COLORS[hash % TAG_COLORS.length];
}

interface TagInputProps {
  tags: string[];
  availableTags: string[];
  tagColors?: TagColorsMap;
  onChange: (tags: string[]) => void;
  onTagColorChange?: (tag: string, colorIndex: number) => void;
}

export default function TagInput({
  tags,
  availableTags,
  tagColors = {},
  onChange,
  onTagColorChange,
}: TagInputProps) {
  const [input, setInput] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownIndex, setDropdownIndex] = useState(0);
  const [colorPickerTag, setColorPickerTag] = useState<string | null>(null);
  const [colorPickerPos, setColorPickerPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Update cache when props change
  useEffect(() => {
    tagColorsCache = tagColors;
  }, [tagColors]);

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

  // Close color picker on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (colorPickerTag && containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setColorPickerTag(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [colorPickerTag]);

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

  const handleTagClick = (e: React.MouseEvent, tag: string) => {
    e.stopPropagation();
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setColorPickerPos({ x: rect.left, y: rect.bottom + 4 });
    setColorPickerTag(colorPickerTag === tag ? null : tag);
  };

  const handleColorSelect = async (colorIndex: number) => {
    if (!colorPickerTag) return;
    if (onTagColorChange) {
      onTagColorChange(colorPickerTag, colorIndex);
    } else {
      await setTagColor(colorPickerTag, colorIndex);
    }
    setColorPickerTag(null);
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
      setColorPickerTag(null);
      setInput("");
    } else if (e.key === "Backspace" && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <div className="flex flex-wrap items-center gap-1.5">
        {tags.map((tag) => {
          const color = getTagColor(tag, tagColors);
          return (
            <span
              key={tag}
              onClick={(e) => handleTagClick(e, tag)}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs cursor-pointer hover:ring-2 hover:ring-[--accent] hover:ring-opacity-50 ${color.bg} ${color.text} ${color.darkBg} ${color.darkText}`}
              title="Click to change color"
            >
              {tag}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeTag(tag);
                }}
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
        <div
          className="absolute z-10 left-0 min-w-[200px] max-w-[300px] mt-1 border border-[--border] rounded shadow-lg max-h-48 overflow-y-auto"
          style={{ backgroundColor: 'var(--background)' }}
        >
          {filteredTags.map((tag, idx) => {
            const color = getTagColor(tag, tagColors);
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

      {/* Color Picker */}
      {colorPickerTag && (
        <div
          className="fixed z-50 p-2 rounded-lg shadow-lg border border-[--border]"
          style={{
            backgroundColor: 'var(--background)',
            left: colorPickerPos.x,
            top: colorPickerPos.y,
          }}
        >
          <div className="text-xs text-[--muted] mb-2 px-1">Choose color for &quot;{colorPickerTag}&quot;</div>
          <div className="grid grid-cols-4 gap-1">
            {TAG_COLORS.map((color, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleColorSelect(idx)}
                className={`w-8 h-8 rounded flex items-center justify-center transition-transform hover:scale-110 ${color.bg} ${color.darkBg}`}
                title={color.name}
              >
                {tagColors[colorPickerTag] === idx && (
                  <svg className={`w-4 h-4 ${color.text} ${color.darkText}`} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
