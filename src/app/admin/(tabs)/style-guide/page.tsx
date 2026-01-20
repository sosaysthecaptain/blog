"use client";

import { useState, useEffect } from "react";
import { ConfirmDialog, AlertDialog, ProgressDialog } from "@/components/ui/Dialog";

type Category = "principles" | "colors" | "typography" | "buttons" | "inputs" | "sidebar" | "tags" | "icons" | "layouts" | "dialogs" | "platforms" | "export";

const CATEGORIES: { id: Category; label: string }[] = [
  { id: "principles", label: "Principles" },
  { id: "colors", label: "Colors" },
  { id: "typography", label: "Typography" },
  { id: "buttons", label: "Buttons" },
  { id: "inputs", label: "Inputs" },
  { id: "sidebar", label: "Sidebar" },
  { id: "tags", label: "Tags" },
  { id: "icons", label: "Icons" },
  { id: "layouts", label: "Layouts" },
  { id: "dialogs", label: "Dialogs" },
  { id: "platforms", label: "Platforms" },
  { id: "export", label: "Swift Export" },
];

export default function StyleGuidePage() {
  const [selectedCategory, setSelectedCategory] = useState<Category>("principles");
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check initial state
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggleDark = () => {
    document.documentElement.classList.toggle("dark");
    setIsDark(!isDark);
  };

  return (
    <div className="flex-1 h-screen bg-[--background] overflow-hidden flex">
      {/* Category List */}
      <div className="w-48 bg-[--sidebar-bg] border-r border-[--border] flex flex-col">
        <div className="p-4 border-b border-[--border] flex items-center justify-between">
          <div>
            <h2 className="font-medium text-[--foreground]">Style Guide</h2>
            <p className="text-xs text-[--muted] mt-1">UI Components</p>
          </div>
          <button
            onClick={toggleDark}
            className="p-1.5 rounded hover:bg-[--hover]"
            title={isDark ? "Light mode" : "Dark mode"}
          >
            {isDark ? (
              <svg className="w-4 h-4 text-[--foreground]" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-[--foreground]" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            )}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`w-full px-4 py-2 text-sm text-left transition-colors ${
                selectedCategory === cat.id
                  ? "bg-blue-50 text-blue-600 border-l-2 border-blue-600"
                  : "text-[--foreground] hover:bg-gray-100"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {selectedCategory === "principles" && <PrinciplesSection />}
        {selectedCategory === "colors" && <ColorsSection />}
        {selectedCategory === "typography" && <TypographySection />}
        {selectedCategory === "buttons" && <ButtonsSection />}
        {selectedCategory === "inputs" && <InputsSection />}
        {selectedCategory === "sidebar" && <SidebarSection />}
        {selectedCategory === "tags" && <TagsSection />}
        {selectedCategory === "icons" && <IconsSection />}
        {selectedCategory === "layouts" && <LayoutsSection />}
        {selectedCategory === "dialogs" && <DialogsSection />}
        {selectedCategory === "platforms" && <PlatformsSection />}
        {selectedCategory === "export" && <ExportSection isDark={isDark} />}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h1 className="text-2xl font-bold text-[--foreground] mb-6">{children}</h1>;
}

function ComponentBlock({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="mb-8 pb-8 border-b border-[--border] last:border-0">
      <h3 className="font-medium text-[--foreground] mb-1">{title}</h3>
      {description && <p className="text-sm text-[--muted] mb-4">{description}</p>}
      <div className="p-6 bg-[--sidebar-bg] rounded-lg border border-[--border]">{children}</div>
    </div>
  );
}

function ColorSwatch({ name, cssVar, hex }: { name: string; cssVar: string; hex: string }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-12 h-12 rounded border border-[--border]"
        style={{ backgroundColor: `var(${cssVar})` }}
      />
      <div>
        <div className="font-medium text-sm">{name}</div>
        <div className="text-xs text-[--muted]">{cssVar}</div>
        <div className="text-xs text-[--muted]">{hex}</div>
      </div>
    </div>
  );
}

function ColorsSection() {
  return (
    <div>
      <SectionTitle>Colors</SectionTitle>
      <p className="text-[--muted] mb-8">
        CSS custom properties used throughout the app. Defined in <code className="text-sm bg-[--hover] px-1 rounded">globals.css</code>.
      </p>

      <ComponentBlock title="Core Colors" description="Primary semantic colors">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          <ColorSwatch name="Background" cssVar="--background" hex="#ffffff" />
          <ColorSwatch name="Foreground" cssVar="--foreground" hex="#171717" />
          <ColorSwatch name="Muted" cssVar="--muted" hex="#737373" />
          <ColorSwatch name="Border" cssVar="--border" hex="#e5e5e5" />
          <ColorSwatch name="Accent" cssVar="--accent" hex="#2563eb" />
          <ColorSwatch name="Accent Muted" cssVar="--accent-muted" hex="#3b82f6" />
        </div>
      </ComponentBlock>

      <ComponentBlock title="Sidebar Colors" description="Sidebar-specific colors">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          <ColorSwatch name="Sidebar BG" cssVar="--sidebar-bg" hex="#fafafa" />
          <ColorSwatch name="Hover" cssVar="--hover" hex="#f5f5f5" />
        </div>
      </ComponentBlock>

      <ComponentBlock title="Status Colors" description="Used for badges, indicators">
        <div className="flex flex-wrap gap-4">
          <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-700">Published</span>
          <span className="px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-700">Draft</span>
          <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-700">Error</span>
          <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-700">Info</span>
          <span className="px-2 py-1 rounded text-xs bg-purple-100 text-purple-700">Admin</span>
        </div>
      </ComponentBlock>
    </div>
  );
}

function TypographySection() {
  return (
    <div>
      <SectionTitle>Typography</SectionTitle>
      <p className="text-[--muted] mb-8">
        Font families: System sans-serif for UI, serif (Georgia) for content.
      </p>

      <ComponentBlock title="Headings" description="Page and section titles">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold font-serif">Heading 1 (Serif)</h1>
          <h2 className="text-2xl font-bold">Heading 2</h2>
          <h3 className="text-xl font-medium">Heading 3</h3>
          <h4 className="text-lg font-medium">Heading 4</h4>
        </div>
      </ComponentBlock>

      <ComponentBlock title="Body Text" description="Paragraph and content text">
        <div className="space-y-4 max-w-xl">
          <p className="font-serif text-lg leading-relaxed">
            Body text (serif) - Used in note content and blog posts. Lorem ipsum dolor sit amet,
            consectetur adipiscing elit.
          </p>
          <p className="text-sm text-[--foreground]">
            Body text (sans) - Used in UI elements and labels.
          </p>
          <p className="text-sm text-[--muted]">
            Muted text - Used for secondary information and metadata.
          </p>
          <p className="text-xs text-[--muted]">
            Small text - Used for timestamps, hints, and captions.
          </p>
        </div>
      </ComponentBlock>

      <ComponentBlock title="Labels" description="Form and UI labels">
        <div className="space-y-2">
          <label className="block text-xs font-medium text-[--muted] uppercase tracking-wide">
            Uppercase Label
          </label>
          <label className="block text-sm font-medium text-[--foreground]">
            Standard Label
          </label>
          <label className="block text-xs text-[--muted]">
            Helper text below inputs
          </label>
        </div>
      </ComponentBlock>
    </div>
  );
}

function ButtonsSection() {
  return (
    <div>
      <SectionTitle>Buttons</SectionTitle>
      <p className="text-[--muted] mb-8">
        Button variants used across the application.
      </p>

      <ComponentBlock title="Primary Buttons" description="Monochrome buttons with invert on press">
        <div className="space-y-4">
          <div className="flex gap-3 items-center">
            <button className="dialog-btn dialog-btn-primary">Primary</button>
            <button className="dialog-btn dialog-btn-secondary">Secondary</button>
            <button className="dialog-btn dialog-btn-danger">Danger</button>
          </div>
          <p className="text-xs text-[--muted]">
            CSS classes: <code className="bg-[--hover] px-1 rounded">dialog-btn dialog-btn-primary</code>, etc.
            Press and hold to see invert effect.
          </p>
        </div>
      </ComponentBlock>

      <ComponentBlock title="Icon Buttons" description="Square buttons with icons">
        <div className="flex flex-wrap gap-4 items-center">
          <button className="p-2 text-[--muted] hover:text-[--foreground] hover:bg-[--hover] rounded" title="Edit">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button className="p-2 text-[--muted] hover:text-red-600 hover:bg-red-50 rounded" title="Delete">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
          <button className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700" title="Add">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button className="p-1.5 text-[--muted] hover:text-[--accent]" title="Smaller">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
            </svg>
          </button>
        </div>
      </ComponentBlock>

      <ComponentBlock title="Sidebar Nav Buttons" description="Vertical navigation items">
        <div className="w-14 bg-gray-50 border border-[--border] rounded">
          <button className="w-full p-4 bg-white text-blue-600 border-l-2 border-blue-600">
            <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
          <button className="w-full p-4 text-[--muted] hover:bg-gray-100">
            <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </button>
        </div>
      </ComponentBlock>
    </div>
  );
}

function InputsSection() {
  return (
    <div>
      <SectionTitle>Inputs</SectionTitle>
      <p className="text-[--muted] mb-8">
        Form inputs and text fields.
      </p>

      <ComponentBlock title="Text Input" description="Standard single-line input">
        <div className="max-w-md space-y-4">
          <div>
            <label className="block text-xs font-medium text-[--muted] mb-1">Label</label>
            <input
              type="text"
              placeholder="Placeholder text..."
              className="w-full px-3 py-2 text-sm border border-[--border] rounded focus:outline-none focus:border-blue-500"
            />
          </div>
          <input
            type="text"
            value="Filled input"
            readOnly
            className="w-full px-3 py-2 text-sm border border-[--border] rounded"
          />
          <input
            type="text"
            disabled
            placeholder="Disabled"
            className="w-full px-3 py-2 text-sm border border-[--border] rounded bg-[--hover] text-[--muted] cursor-not-allowed"
          />
        </div>
      </ComponentBlock>

      <ComponentBlock title="Search Input" description="With search icon">
        <div className="max-w-md">
          <div className="relative">
            <svg
              className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[--muted]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-7 pr-2 py-1 text-xs bg-[--background] border border-[--border] rounded focus:outline-none focus:border-[--accent] text-[--foreground] placeholder:text-[--muted]"
            />
          </div>
        </div>
      </ComponentBlock>

      <ComponentBlock title="Textarea" description="Multi-line text input">
        <div className="max-w-md">
          <textarea
            rows={4}
            placeholder="Enter multiple lines..."
            className="w-full px-3 py-2 text-sm border border-[--border] rounded focus:outline-none focus:border-blue-500 resize-none"
          />
        </div>
      </ComponentBlock>

      <ComponentBlock title="Select" description="Dropdown selection">
        <div className="max-w-md">
          <select className="w-full px-3 py-2 text-sm border border-[--border] rounded focus:outline-none focus:border-blue-500">
            <option>Option 1</option>
            <option>Option 2</option>
            <option>Option 3</option>
          </select>
        </div>
      </ComponentBlock>

      <ComponentBlock title="Date & Time Inputs" description="Date picker and nullable time picker">
        <div className="max-w-md space-y-4">
          <div className="flex items-center gap-4 text-sm text-[--muted]">
            <input
              type="date"
              defaultValue="2024-01-15"
              className="bg-transparent outline-none italic cursor-pointer"
              style={{ colorScheme: 'light dark' }}
            />
            <span className="text-xs text-[--muted]">Date picker (always visible)</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-[--muted]">
            <div className="flex items-center gap-1">
              <input
                type="time"
                defaultValue="14:30"
                className="bg-transparent outline-none italic cursor-pointer"
                style={{ colorScheme: 'light dark' }}
              />
              <button
                type="button"
                className="p-0.5 hover:bg-[--hover] rounded text-[--muted] hover:text-[--foreground]"
                title="Clear time"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <span className="text-xs text-[--muted]">Time with clear button</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-[--muted]">
            <button
              type="button"
              className="px-2 py-0.5 text-xs border border-dashed border-[--border] rounded hover:border-[--accent] hover:text-[--accent] italic"
            >
              + time
            </button>
            <span className="text-xs text-[--muted]">Add time button (when empty)</span>
          </div>
        </div>
      </ComponentBlock>
    </div>
  );
}

function SidebarSection() {
  return (
    <div>
      <SectionTitle>Sidebar Components</SectionTitle>
      <p className="text-[--muted] mb-8">
        Components used in the notes sidebar/tree view.
      </p>

      <ComponentBlock title="Folder Tree Item" description="Expandable folder with children">
        <div className="w-64 bg-[--sidebar-bg] border border-[--border] rounded p-2">
          <div className="flex items-center gap-1 px-2 py-1.5 text-sm hover:bg-[--hover] rounded cursor-pointer">
            <svg className="w-3.5 h-3.5 text-[--muted]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 7h10v2H7z"/>
            </svg>
            <span className="truncate">Folder Name</span>
          </div>
          <div className="ml-4 border-l border-[--border] pl-2">
            <div className="flex items-center gap-1 px-2 py-1.5 text-sm hover:bg-[--hover] rounded cursor-pointer">
              <div className="w-3.5" />
              <svg className="w-4 h-4 text-[--muted]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="truncate">Note Title</span>
            </div>
          </div>
        </div>
      </ComponentBlock>

      <ComponentBlock title="Selected State" description="Active/selected item highlighting">
        <div className="w-64 bg-[--sidebar-bg] border border-[--border] rounded p-2 space-y-1">
          <div className="flex items-center gap-1 px-2 py-1.5 text-sm hover:bg-[--hover] rounded cursor-pointer">
            <div className="w-3.5" />
            <svg className="w-4 h-4 text-[--muted]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="truncate">Unselected</span>
          </div>
          <div
            className="flex items-center gap-1 px-2 py-1.5 text-sm rounded cursor-pointer"
            style={{ backgroundColor: 'var(--accent-muted)', color: 'white' }}
          >
            <div className="w-3.5" />
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="truncate">Selected</span>
          </div>
        </div>
      </ComponentBlock>

      <ComponentBlock title="Published Indicator" description="Green dot for published notes">
        <div className="w-64 bg-[--sidebar-bg] border border-[--border] rounded p-2 space-y-1">
          <div className="flex items-center gap-1 px-2 py-1.5 text-sm hover:bg-[--hover] rounded cursor-pointer">
            <div className="w-3.5" />
            <svg className="w-4 h-4 text-[--muted]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="truncate">Draft Note</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-1.5 text-sm hover:bg-[--hover] rounded cursor-pointer">
            <div className="w-3.5" />
            <svg className="w-4 h-4 text-[--muted]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="truncate flex-1">Published Note</span>
            <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
          </div>
        </div>
      </ComponentBlock>
    </div>
  );
}

function TagsSection() {
  // Hash-based pastel color generator
  const getTagColor = (tag: string) => {
    let hash = 0;
    for (let i = 0; i < tag.length; i++) {
      hash = tag.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 70%, 85%)`;
  };

  const tags = ["react", "typescript", "firebase", "design", "notes", "recipes"];

  return (
    <div>
      <SectionTitle>Tags</SectionTitle>
      <p className="text-[--muted] mb-8">
        Tag components with hash-based pastel colors.
      </p>

      <ComponentBlock title="Tag Pills" description="Used in note editor and lists">
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded text-xs font-medium"
              style={{ backgroundColor: getTagColor(tag) }}
            >
              {tag}
            </span>
          ))}
        </div>
      </ComponentBlock>

      <ComponentBlock title="Tag Input" description="Multi-select with autocomplete">
        <div className="max-w-md">
          <div className="flex flex-wrap gap-1.5 p-2 border border-[--border] rounded bg-[--background] min-h-[38px]">
            <span
              className="px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1"
              style={{ backgroundColor: getTagColor("react") }}
            >
              react
              <button className="hover:text-red-600">&times;</button>
            </span>
            <span
              className="px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1"
              style={{ backgroundColor: getTagColor("typescript") }}
            >
              typescript
              <button className="hover:text-red-600">&times;</button>
            </span>
            <input
              type="text"
              placeholder="Add tag..."
              className="flex-1 min-w-[80px] text-sm outline-none"
            />
          </div>
        </div>
      </ComponentBlock>

      <ComponentBlock title="Muted Tags" description="Subdued style for read-only display">
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 rounded bg-[--hover] text-[--muted]"
            >
              {tag}
            </span>
          ))}
        </div>
      </ComponentBlock>
    </div>
  );
}

function IconsSection() {
  const icons = [
    { name: "Document", path: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
    { name: "Folder", path: "M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" },
    { name: "Edit", path: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" },
    { name: "Trash", path: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" },
    { name: "Plus", path: "M12 4v16m8-8H4" },
    { name: "Search", path: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" },
    { name: "Chevron Down", path: "M19 9l-7 7-7-7" },
    { name: "Chevron Right", path: "M9 5l7 7-7 7" },
    { name: "X Close", path: "M6 18L18 6M6 6l12 12" },
    { name: "Home", path: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
    { name: "Image", path: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" },
    { name: "Users", path: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" },
    { name: "Logout", path: "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" },
    { name: "Download", path: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" },
    { name: "Save", path: "M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" },
  ];

  return (
    <div>
      <SectionTitle>Icons</SectionTitle>
      <p className="text-[--muted] mb-8">
        SVG icons from Heroicons (outline style). Standard size: w-5 h-5 for buttons, w-4 h-4 for inline.
      </p>

      <ComponentBlock title="Icon Gallery" description="Common icons used in the app">
        <div className="grid grid-cols-4 md:grid-cols-6 gap-4">
          {icons.map((icon) => (
            <div key={icon.name} className="flex flex-col items-center gap-2 p-3 rounded hover:bg-[--hover]">
              <svg className="w-6 h-6 text-[--foreground]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon.path} />
              </svg>
              <span className="text-xs text-[--muted] text-center">{icon.name}</span>
            </div>
          ))}
        </div>
      </ComponentBlock>

      <ComponentBlock title="Icon Sizes" description="Standard sizing conventions">
        <div className="flex items-end gap-6">
          <div className="flex flex-col items-center gap-2">
            <svg className="w-3.5 h-3.5 text-[--foreground]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="text-xs text-[--muted]">3.5 (14px)</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <svg className="w-4 h-4 text-[--foreground]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="text-xs text-[--muted]">4 (16px)</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <svg className="w-5 h-5 text-[--foreground]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="text-xs text-[--muted]">5 (20px)</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <svg className="w-6 h-6 text-[--foreground]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="text-xs text-[--muted]">6 (24px)</span>
          </div>
        </div>
      </ComponentBlock>
    </div>
  );
}

function LayoutsSection() {
  return (
    <div>
      <SectionTitle>Layouts</SectionTitle>
      <p className="text-[--muted] mb-8">
        Common layout patterns used across the application.
      </p>

      <ComponentBlock title="Two-Column Layout" description="Sidebar + main content (notes, recipes, admin)">
        <div className="border border-[--border] rounded overflow-hidden h-48 flex">
          <div className="w-48 bg-[--sidebar-bg] border-r border-[--border] p-3">
            <div className="text-xs text-[--muted] mb-2">Sidebar (w-48 to w-64)</div>
            <div className="space-y-1">
              <div className="h-4 bg-[--border] rounded w-full" />
              <div className="h-4 bg-[--accent-muted] rounded w-full opacity-40" />
              <div className="h-4 bg-[--border] rounded w-3/4" />
            </div>
          </div>
          <div className="flex-1 p-3">
            <div className="text-xs text-[--muted] mb-2">Main Content (flex-1)</div>
            <div className="space-y-2">
              <div className="h-6 bg-[--border] rounded w-1/2" />
              <div className="h-4 bg-[--hover] rounded w-full" />
              <div className="h-4 bg-[--hover] rounded w-full" />
              <div className="h-4 bg-[--hover] rounded w-3/4" />
            </div>
          </div>
        </div>
      </ComponentBlock>

      <ComponentBlock title="Three-Column Layout" description="Nav + sidebar + content (admin tabs)">
        <div className="border border-[--border] rounded overflow-hidden h-48 flex">
          <div className="w-14 bg-[--hover] border-r border-[--border] p-2">
            <div className="space-y-2">
              <div className="w-8 h-8 bg-[--accent-muted] rounded mx-auto opacity-40" />
              <div className="w-8 h-8 bg-[--border] rounded mx-auto" />
              <div className="w-8 h-8 bg-[--border] rounded mx-auto" />
            </div>
          </div>
          <div className="w-48 bg-[--sidebar-bg] border-r border-[--border] p-3">
            <div className="text-xs text-[--muted] mb-2">Panel</div>
            <div className="space-y-1">
              <div className="h-4 bg-[--border] rounded w-full" />
              <div className="h-4 bg-[--border] rounded w-3/4" />
            </div>
          </div>
          <div className="flex-1 p-3">
            <div className="text-xs text-[--muted] mb-2">Content</div>
          </div>
        </div>
      </ComponentBlock>

      <ComponentBlock title="Card Grid" description="Responsive grid of cards (carousel admin)">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border border-[--border] rounded-lg overflow-hidden">
              <div className="aspect-video bg-[--hover]" />
              <div className="p-2 space-y-1">
                <div className="h-3 bg-[--border] rounded w-full" />
                <div className="h-3 bg-[--hover] rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </ComponentBlock>

      <ComponentBlock title="Mobile Drawer" description="Slide-out sidebar for mobile">
        <div className="relative border border-[--border] rounded overflow-hidden h-48 bg-[--background]">
          <div className="absolute inset-y-0 left-0 w-48 bg-[--sidebar-bg] border-r border-[--border] p-3 shadow-lg z-10">
            <div className="text-xs text-[--muted] mb-2">Mobile Drawer</div>
            <div className="space-y-1">
              <div className="h-4 bg-[--border] rounded w-full" />
              <div className="h-4 bg-[--border] rounded w-3/4" />
            </div>
          </div>
          <div className="absolute inset-0 bg-black/20" />
        </div>
        <p className="text-xs text-[--muted] mt-2">
          Uses fixed positioning with z-index. Backdrop overlay closes drawer on click.
        </p>
      </ComponentBlock>
    </div>
  );
}

function DialogsSection() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [showDangerConfirm, setShowDangerConfirm] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [progressValue, setProgressValue] = useState(0);

  const runProgress = () => {
    setShowProgress(true);
    setProgressValue(0);
    const interval = setInterval(() => {
      setProgressValue(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setShowProgress(false), 500);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  return (
    <div>
      <SectionTitle>Dialogs</SectionTitle>
      <p className="text-[--muted] mb-8">
        Custom modal dialogs that replace browser defaults (window.confirm, window.alert).
        Located in <code className="text-sm bg-[--hover] px-1 rounded">@/components/ui/Dialog.tsx</code>.
        Button styles are in <code className="text-sm bg-[--hover] px-1 rounded">globals.css</code>.
      </p>

      <ComponentBlock title="Dialog Buttons" description="Monochrome buttons with invert on press">
        <div className="space-y-4">
          <div className="flex gap-3 items-center">
            <button className="dialog-btn dialog-btn-primary">Primary</button>
            <button className="dialog-btn dialog-btn-secondary">Secondary</button>
            <button className="dialog-btn dialog-btn-danger">Danger</button>
          </div>
          <p className="text-xs text-[--muted]">
            CSS classes: <code className="bg-[--hover] px-1 rounded">dialog-btn dialog-btn-primary</code>, etc.
            Press and hold to see invert effect.
          </p>
        </div>
      </ComponentBlock>

      <ComponentBlock title="Progress Bar" description="For long-running operations">
        <div className="space-y-4">
          <div className="max-w-sm">
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
              <div className="h-full bg-[#1a1a1a] dark:bg-[#e5e5e5]" style={{ width: '65%' }} />
            </div>
            <p className="text-xs text-[--muted] text-right">65%</p>
          </div>
          <button onClick={runProgress} className="dialog-btn dialog-btn-secondary">
            Show Progress Dialog
          </button>
        </div>
        <ProgressDialog
          open={showProgress}
          title="Processing"
          message="Please wait..."
          progress={progressValue}
          detail={`Step ${Math.ceil(progressValue / 10)} of 10`}
          onCancel={() => setShowProgress(false)}
        />
      </ComponentBlock>

      <ComponentBlock title="Confirm Dialog" description="For actions requiring user confirmation">
        <div className="flex gap-4">
          <button
            onClick={() => setShowConfirm(true)}
            className="dialog-btn dialog-btn-primary"
          >
            Show Confirm Dialog
          </button>
          <button
            onClick={() => setShowDangerConfirm(true)}
            className="dialog-btn dialog-btn-danger"
          >
            Show Danger Confirm
          </button>
        </div>
        <ConfirmDialog
          open={showConfirm}
          title="Confirm Action"
          message="Are you sure you want to proceed with this action?"
          onConfirm={() => setShowConfirm(false)}
          onCancel={() => setShowConfirm(false)}
        />
        <ConfirmDialog
          open={showDangerConfirm}
          title="Delete Item"
          message="This action cannot be undone. Are you sure you want to delete this item?"
          variant="danger"
          confirmLabel="Delete"
          onConfirm={() => setShowDangerConfirm(false)}
          onCancel={() => setShowDangerConfirm(false)}
        />
      </ComponentBlock>

      <ComponentBlock title="Alert Dialog" description="For informational messages">
        <button
          onClick={() => setShowAlert(true)}
          className="dialog-btn dialog-btn-secondary"
        >
          Show Alert Dialog
        </button>
        <AlertDialog
          open={showAlert}
          title="Operation Complete"
          message="The task has been completed successfully."
          onClose={() => setShowAlert(false)}
        />
      </ComponentBlock>

    </div>
  );
}

// ============================================
// PRINCIPLES SECTION
// ============================================

function PrinciplesSection() {
  return (
    <div>
      <SectionTitle>Design Principles</SectionTitle>
      <p className="text-[--muted] mb-8">
        Core design rules that apply across all platforms. These principles ensure visual consistency
        whether building for web, macOS, or iOS.
      </p>

      <ComponentBlock title="Density & Spacing" description="Compact, information-dense interface">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-sm mb-2">Spacing Scale (Tailwind)</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-4 bg-[--accent]" />
                  <code className="text-xs bg-[--hover] px-1 rounded">p-1</code>
                  <span className="text-[--muted]">4px - icon buttons</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-4 bg-[--accent]" />
                  <code className="text-xs bg-[--hover] px-1 rounded">p-2</code>
                  <span className="text-[--muted]">8px - compact padding</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-4 bg-[--accent]" />
                  <code className="text-xs bg-[--hover] px-1 rounded">p-3</code>
                  <span className="text-[--muted]">12px - standard padding</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-[--accent]" />
                  <code className="text-xs bg-[--hover] px-1 rounded">p-4</code>
                  <span className="text-[--muted]">16px - section padding</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-sm mb-2">Gap Scale</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-[--hover] px-1 rounded">gap-1</code>
                  <span className="text-[--muted]">4px - inline elements</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-[--hover] px-1 rounded">gap-2</code>
                  <span className="text-[--muted]">8px - list items, buttons</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-[--hover] px-1 rounded">gap-3</code>
                  <span className="text-[--muted]">12px - card grids</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-[--hover] px-1 rounded">gap-4</code>
                  <span className="text-[--muted]">16px - sections</span>
                </div>
              </div>
            </div>
          </div>
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-sm">
            <strong>Rule:</strong> Prefer tighter spacing. The app should feel dense and efficient, not airy and wasteful.
          </div>
        </div>
      </ComponentBlock>

      <ComponentBlock title="Modal Patterns" description="Consistent dialog behavior">
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 border border-[--border] rounded">
              <h4 className="font-medium mb-2">Structure</h4>
              <ul className="space-y-1 text-[--muted]">
                <li>• Use <code className="text-xs bg-[--hover] px-1 rounded">createPortal</code> to document.body</li>
                <li>• Z-index: <code className="text-xs bg-[--hover] px-1 rounded">z-[100]</code></li>
                <li>• Backdrop: <code className="text-xs bg-[--hover] px-1 rounded">bg-black/50</code></li>
                <li>• Background: <code className="text-xs bg-[--hover] px-1 rounded">var(--background)</code></li>
              </ul>
            </div>
            <div className="p-3 border border-[--border] rounded">
              <h4 className="font-medium mb-2">Behavior</h4>
              <ul className="space-y-1 text-[--muted]">
                <li>• Escape key closes</li>
                <li>• Click backdrop closes</li>
                <li>• Prevent body scroll when open</li>
                <li>• Stop propagation on modal content</li>
              </ul>
            </div>
          </div>
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
            <strong>Reference:</strong> See <code className="text-xs bg-[--hover] px-1 rounded">PropertiesModal.tsx</code> for the canonical implementation.
          </div>
        </div>
      </ComponentBlock>

      <ComponentBlock title="Icon Sizing" description="Standard icon sizes by context">
        <div className="space-y-4">
          <div className="flex items-end gap-8">
            <div className="text-center">
              <svg className="w-3 h-3 mx-auto mb-2 text-[--foreground]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <code className="text-xs bg-[--hover] px-1 rounded">w-3</code>
              <p className="text-xs text-[--muted] mt-1">12px</p>
              <p className="text-xs text-[--muted]">chevrons</p>
            </div>
            <div className="text-center">
              <svg className="w-3.5 h-3.5 mx-auto mb-2 text-[--foreground]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <code className="text-xs bg-[--hover] px-1 rounded">w-3.5</code>
              <p className="text-xs text-[--muted] mt-1">14px</p>
              <p className="text-xs text-[--muted]">search, small UI</p>
            </div>
            <div className="text-center">
              <svg className="w-4 h-4 mx-auto mb-2 text-[--foreground]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <code className="text-xs bg-[--hover] px-1 rounded">w-4</code>
              <p className="text-xs text-[--muted] mt-1">16px</p>
              <p className="text-xs text-[--muted]">sidebar items</p>
            </div>
            <div className="text-center">
              <svg className="w-5 h-5 mx-auto mb-2 text-[--foreground]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <code className="text-xs bg-[--hover] px-1 rounded">w-5</code>
              <p className="text-xs text-[--muted] mt-1">20px</p>
              <p className="text-xs text-[--muted]">standard buttons</p>
            </div>
          </div>
        </div>
      </ComponentBlock>

      <ComponentBlock title="Text Hierarchy" description="When to use which text styles">
        <div className="space-y-3 text-sm">
          <div className="flex items-baseline gap-4">
            <span className="w-32 text-[--muted]">Page titles</span>
            <span className="font-serif text-2xl font-bold">Serif, bold, 2xl</span>
          </div>
          <div className="flex items-baseline gap-4">
            <span className="w-32 text-[--muted]">Section headers</span>
            <span className="font-medium">Sans, medium, base</span>
          </div>
          <div className="flex items-baseline gap-4">
            <span className="w-32 text-[--muted]">Body (content)</span>
            <span className="font-serif">Serif, regular, base</span>
          </div>
          <div className="flex items-baseline gap-4">
            <span className="w-32 text-[--muted]">Body (UI)</span>
            <span className="text-sm">Sans, regular, sm</span>
          </div>
          <div className="flex items-baseline gap-4">
            <span className="w-32 text-[--muted]">Labels</span>
            <span className="text-xs text-[--muted]">Sans, muted, xs</span>
          </div>
        </div>
      </ComponentBlock>

      <ComponentBlock title="Color Usage" description="Semantic color application">
        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded" style={{ backgroundColor: 'var(--foreground)' }} />
            <span className="w-32 font-medium">Foreground</span>
            <span className="text-[--muted]">Primary text, icons in active state</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded" style={{ backgroundColor: 'var(--muted)' }} />
            <span className="w-32 font-medium">Muted</span>
            <span className="text-[--muted]">Secondary text, inactive icons, labels</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded" style={{ backgroundColor: 'var(--accent)' }} />
            <span className="w-32 font-medium">Accent</span>
            <span className="text-[--muted]">Links, focus states, selected items</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded border border-[--border]" style={{ backgroundColor: 'var(--hover)' }} />
            <span className="w-32 font-medium">Hover</span>
            <span className="text-[--muted]">Hover backgrounds, subtle fills</span>
          </div>
        </div>
      </ComponentBlock>

      <ComponentBlock title="Interactive States" description="Consistent interaction feedback">
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 border border-[--border] rounded">
              <div className="w-10 h-10 mx-auto mb-2 rounded flex items-center justify-center text-[--muted]">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <p className="font-medium">Default</p>
              <p className="text-xs text-[--muted]">text-[--muted]</p>
            </div>
            <div className="text-center p-4 border border-[--border] rounded bg-[--hover]">
              <div className="w-10 h-10 mx-auto mb-2 rounded flex items-center justify-center text-[--foreground] bg-[--hover]">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <p className="font-medium">Hover</p>
              <p className="text-xs text-[--muted]">text-[--foreground] bg-[--hover]</p>
            </div>
            <div className="text-center p-4 border border-[--border] rounded">
              <div className="w-10 h-10 mx-auto mb-2 rounded flex items-center justify-center text-white" style={{ backgroundColor: 'var(--accent-muted)' }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <p className="font-medium">Selected</p>
              <p className="text-xs text-[--muted]">text-white bg-[--accent-muted]</p>
            </div>
          </div>
        </div>
      </ComponentBlock>

      <ComponentBlock title="Don'ts" description="Common mistakes to avoid">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="p-3 border border-red-200 dark:border-red-800 rounded bg-red-50 dark:bg-red-900/20">
            <h4 className="font-medium text-red-700 dark:text-red-400 mb-2">Avoid</h4>
            <ul className="space-y-1 text-red-600 dark:text-red-400">
              <li>• Rounded corners on modals (use sharp)</li>
              <li>• Large padding (keep it tight)</li>
              <li>• Colored/blue primary buttons</li>
              <li>• Multiple font weights in one context</li>
              <li>• Shadows (except mobile drawers)</li>
            </ul>
          </div>
          <div className="p-3 border border-green-200 dark:border-green-800 rounded bg-green-50 dark:bg-green-900/20">
            <h4 className="font-medium text-green-700 dark:text-green-400 mb-2">Prefer</h4>
            <ul className="space-y-1 text-green-600 dark:text-green-400">
              <li>• Sharp corners, 1px borders</li>
              <li>• Compact, dense layouts</li>
              <li>• Monochrome buttons with invert</li>
              <li>• Consistent text hierarchy</li>
              <li>• Flat design, border separation</li>
            </ul>
          </div>
        </div>
      </ComponentBlock>
    </div>
  );
}

// ============================================
// PLATFORMS SECTION
// ============================================

function PlatformsSection() {
  const [platform, setPlatform] = useState<"web" | "macos" | "ios">("web");

  return (
    <div>
      <SectionTitle>Platform Guidelines</SectionTitle>
      <p className="text-[--muted] mb-6">
        Platform-specific adaptations while maintaining visual consistency.
      </p>

      {/* Platform Tabs */}
      <div className="flex gap-1 mb-8 p-1 bg-[--hover] rounded-lg w-fit">
        {(["web", "macos", "ios"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPlatform(p)}
            className={`px-4 py-2 text-sm rounded-md transition-colors ${
              platform === p
                ? "bg-[--background] text-[--foreground] shadow-sm"
                : "text-[--muted] hover:text-[--foreground]"
            }`}
          >
            {p === "web" ? "Web" : p === "macos" ? "macOS" : "iOS"}
          </button>
        ))}
      </div>

      {platform === "web" && (
        <div className="space-y-6">
          <ComponentBlock title="Framework" description="Next.js + React">
            <div className="text-sm space-y-2">
              <p>• <strong>CSS:</strong> Tailwind with CSS custom properties</p>
              <p>• <strong>Components:</strong> Functional React with hooks</p>
              <p>• <strong>State:</strong> Local state, Firestore for persistence</p>
              <p>• <strong>Icons:</strong> Heroicons (outline style)</p>
            </div>
          </ComponentBlock>

          <ComponentBlock title="Responsive Behavior" description="Mobile-first with breakpoints">
            <div className="text-sm space-y-3">
              <div className="flex items-center gap-4">
                <code className="text-xs bg-[--hover] px-2 py-1 rounded">sm: 640px</code>
                <span className="text-[--muted]">Sidebar becomes drawer overlay</span>
              </div>
              <div className="flex items-center gap-4">
                <code className="text-xs bg-[--hover] px-2 py-1 rounded">md: 768px</code>
                <span className="text-[--muted]">Two-column layouts activate</span>
              </div>
              <div className="flex items-center gap-4">
                <code className="text-xs bg-[--hover] px-2 py-1 rounded">lg: 1024px</code>
                <span className="text-[--muted]">Three-column layouts</span>
              </div>
            </div>
          </ComponentBlock>

          <ComponentBlock title="CSS Variables" description="Theme tokens in globals.css">
            <pre className="text-xs bg-[--hover] p-4 rounded overflow-x-auto">{`:root {
  --background: #ffffff;
  --foreground: #171717;
  --muted: #737373;
  --border: #e5e5e5;
  --hover: #f5f5f5;
  --sidebar-bg: #fafafa;
  --accent: #2563eb;
  --accent-muted: #3b82f6;
}

.dark {
  --background: #0a0a0a;
  --foreground: #ededed;
  --muted: #a3a3a3;
  --border: #262626;
  --hover: #171717;
  --sidebar-bg: #0f0f0f;
  --accent: #3b82f6;
  --accent-muted: #2563eb;
}`}</pre>
          </ComponentBlock>
        </div>
      )}

      {platform === "macos" && (
        <div className="space-y-6">
          <ComponentBlock title="Framework" description="SwiftUI (native)">
            <div className="text-sm space-y-2">
              <p>• <strong>UI:</strong> SwiftUI with AppKit interop where needed</p>
              <p>• <strong>Architecture:</strong> MVVM with Combine</p>
              <p>• <strong>Data:</strong> Firebase SDK + local SQLite cache</p>
              <p>• <strong>Icons:</strong> SF Symbols (matching Heroicons style)</p>
            </div>
          </ComponentBlock>

          <ComponentBlock title="macOS Adaptations" description="Platform conventions to follow">
            <div className="text-sm space-y-3">
              <div className="p-3 border border-[--border] rounded">
                <h4 className="font-medium mb-2">Window Chrome</h4>
                <p className="text-[--muted]">Use toolbar style with sidebar. Traffic lights in standard position. Title bar can be transparent with content underneath.</p>
              </div>
              <div className="p-3 border border-[--border] rounded">
                <h4 className="font-medium mb-2">Keyboard Shortcuts</h4>
                <p className="text-[--muted]">Cmd+N new note, Cmd+Shift+N new folder, Cmd+, preferences, Cmd+F search. Standard macOS conventions.</p>
              </div>
              <div className="p-3 border border-[--border] rounded">
                <h4 className="font-medium mb-2">Context Menus</h4>
                <p className="text-[--muted]">Right-click for actions. Use Menu/MenuItem SwiftUI components. Match system appearance.</p>
              </div>
            </div>
          </ComponentBlock>

          <ComponentBlock title="Color Mapping" description="CSS vars → SwiftUI colors">
            <div className="text-sm space-y-2">
              <p><code className="bg-[--hover] px-1 rounded">--foreground</code> → <code className="bg-[--hover] px-1 rounded">Color.primary</code></p>
              <p><code className="bg-[--hover] px-1 rounded">--muted</code> → <code className="bg-[--hover] px-1 rounded">Color.secondary</code></p>
              <p><code className="bg-[--hover] px-1 rounded">--background</code> → <code className="bg-[--hover] px-1 rounded">Color(.windowBackgroundColor)</code></p>
              <p><code className="bg-[--hover] px-1 rounded">--sidebar-bg</code> → <code className="bg-[--hover] px-1 rounded">Color(.controlBackgroundColor)</code></p>
              <p><code className="bg-[--hover] px-1 rounded">--accent</code> → <code className="bg-[--hover] px-1 rounded">Color.accentColor</code></p>
            </div>
          </ComponentBlock>
        </div>
      )}

      {platform === "ios" && (
        <div className="space-y-6">
          <ComponentBlock title="Framework" description="SwiftUI (shared code with macOS)">
            <div className="text-sm space-y-2">
              <p>• <strong>UI:</strong> SwiftUI with iOS-specific layouts</p>
              <p>• <strong>Navigation:</strong> NavigationStack, sheets, popovers</p>
              <p>• <strong>Data:</strong> Same Firebase + SQLite stack as macOS</p>
              <p>• <strong>Icons:</strong> SF Symbols</p>
            </div>
          </ComponentBlock>

          <ComponentBlock title="iOS Adaptations" description="Mobile-specific patterns">
            <div className="text-sm space-y-3">
              <div className="p-3 border border-[--border] rounded">
                <h4 className="font-medium mb-2">Navigation</h4>
                <p className="text-[--muted]">Push navigation for drill-down. Master-detail on iPad. Sheets for modals. Swipe gestures for back.</p>
              </div>
              <div className="p-3 border border-[--border] rounded">
                <h4 className="font-medium mb-2">Touch Targets</h4>
                <p className="text-[--muted]">Minimum 44pt tap targets. Larger spacing than web/mac. Bottom-anchored actions for thumb reach.</p>
              </div>
              <div className="p-3 border border-[--border] rounded">
                <h4 className="font-medium mb-2">Gestures</h4>
                <p className="text-[--muted]">Swipe to delete, long press for context menu, pull to refresh. Standard iOS patterns.</p>
              </div>
            </div>
          </ComponentBlock>

          <ComponentBlock title="Layout Differences" description="How iOS differs from web">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 border border-[--border] rounded">
                <h4 className="font-medium mb-2">Web</h4>
                <ul className="space-y-1 text-[--muted]">
                  <li>• Persistent sidebar</li>
                  <li>• Hover states</li>
                  <li>• Dense padding (p-2, p-3)</li>
                  <li>• Sharp corners</li>
                </ul>
              </div>
              <div className="p-3 border border-[--border] rounded">
                <h4 className="font-medium mb-2">iOS</h4>
                <ul className="space-y-1 text-[--muted]">
                  <li>• Full-screen navigation</li>
                  <li>• Touch feedback</li>
                  <li>• Generous padding (16pt+)</li>
                  <li>• Rounded corners (system)</li>
                </ul>
              </div>
            </div>
          </ComponentBlock>
        </div>
      )}
    </div>
  );
}

// ============================================
// EXPORT SECTION
// ============================================

function ExportSection({ isDark }: { isDark: boolean }) {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const swiftColors = `import SwiftUI

// Dirigible Design System Colors
// Generated from style guide

extension Color {
    // Core Colors
    static let dirigibleBackground = Color("background")
    static let dirigibleForeground = Color("foreground")
    static let dirigibleMuted = Color("muted")
    static let dirigibleBorder = Color("border")
    static let dirigibleHover = Color("hover")
    static let dirigibleSidebarBg = Color("sidebarBg")
    static let dirigibleAccent = Color("accent")
    static let dirigibleAccentMuted = Color("accentMuted")
}

// Color values for Asset Catalog
// Light Mode:
//   background: #FFFFFF
//   foreground: #171717
//   muted: #737373
//   border: #E5E5E5
//   hover: #F5F5F5
//   sidebarBg: #FAFAFA
//   accent: #2563EB
//   accentMuted: #3B82F6
//
// Dark Mode:
//   background: #0A0A0A
//   foreground: #EDEDED
//   muted: #A3A3A3
//   border: #262626
//   hover: #171717
//   sidebarBg: #0F0F0F
//   accent: #3B82F6
//   accentMuted: #2563EB`;

  const swiftTypography = `import SwiftUI

// Dirigible Design System Typography
// Generated from style guide

extension Font {
    // Headings
    static let dirigibleTitle = Font.system(size: 24, weight: .bold, design: .serif)
    static let dirigibleHeading = Font.system(size: 18, weight: .semibold)
    static let dirigibleSubheading = Font.system(size: 16, weight: .medium)

    // Body
    static let dirigibleBody = Font.system(size: 14)
    static let dirigibleBodySerif = Font.system(size: 14, design: .serif)
    static let dirigibleCaption = Font.system(size: 12)
    static let dirigibleSmall = Font.system(size: 11)

    // Labels
    static let dirigibleLabel = Font.system(size: 12, weight: .medium)
    static let dirigibleLabelSmall = Font.system(size: 10, weight: .medium)
}

extension View {
    func dirigibleTextStyle(_ style: DirigibleTextStyle) -> some View {
        switch style {
        case .title:
            return self.font(.dirigibleTitle).foregroundColor(.dirigibleForeground)
        case .heading:
            return self.font(.dirigibleHeading).foregroundColor(.dirigibleForeground)
        case .body:
            return self.font(.dirigibleBody).foregroundColor(.dirigibleForeground)
        case .bodySerif:
            return self.font(.dirigibleBodySerif).foregroundColor(.dirigibleForeground)
        case .caption:
            return self.font(.dirigibleCaption).foregroundColor(.dirigibleMuted)
        case .label:
            return self.font(.dirigibleLabel).foregroundColor(.dirigibleMuted)
        }
    }
}

enum DirigibleTextStyle {
    case title, heading, body, bodySerif, caption, label
}`;

  const swiftComponents = `import SwiftUI

// Dirigible Design System Components
// Generated from style guide

// MARK: - Buttons

struct DirigibleButton: View {
    let title: String
    let style: ButtonStyle
    let action: () -> Void

    enum ButtonStyle {
        case primary, secondary, danger
    }

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 13, weight: .medium))
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
        }
        .buttonStyle(DirigibleButtonStyle(style: style))
    }
}

struct DirigibleButtonStyle: SwiftUI.ButtonStyle {
    let style: DirigibleButton.ButtonStyle

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .background(backgroundColor(pressed: configuration.isPressed))
            .foregroundColor(foregroundColor(pressed: configuration.isPressed))
            .overlay(
                RoundedRectangle(cornerRadius: 0)
                    .stroke(borderColor, lineWidth: 1)
            )
    }

    private func backgroundColor(pressed: Bool) -> Color {
        switch style {
        case .primary:
            return pressed ? .dirigibleForeground : .dirigibleBackground
        case .secondary:
            return pressed ? .dirigibleMuted : .dirigibleBackground
        case .danger:
            return pressed ? .red : .dirigibleBackground
        }
    }

    private func foregroundColor(pressed: Bool) -> Color {
        switch style {
        case .primary:
            return pressed ? .dirigibleBackground : .dirigibleForeground
        case .secondary:
            return pressed ? .dirigibleBackground : .dirigibleMuted
        case .danger:
            return pressed ? .white : .red
        }
    }

    private var borderColor: Color {
        switch style {
        case .primary: return .dirigibleForeground
        case .secondary: return .dirigibleBorder
        case .danger: return .red
        }
    }
}

// MARK: - Sidebar Item

struct DirigibleSidebarItem: View {
    let icon: String
    let title: String
    let isSelected: Bool

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: icon)
                .font(.system(size: 14))
            Text(title)
                .font(.system(size: 13))
            Spacer()
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 6)
        .background(isSelected ? Color.dirigibleAccentMuted : Color.clear)
        .foregroundColor(isSelected ? .white : .dirigibleForeground)
    }
}

// MARK: - Tag

struct DirigibleTag: View {
    let text: String

    private var tagColor: Color {
        var hash = 0
        for char in text.unicodeScalars {
            hash = Int(char.value) &+ ((hash << 5) &- hash)
        }
        let hue = Double(abs(hash) % 360) / 360.0
        return Color(hue: hue, saturation: 0.7, brightness: 0.85)
    }

    var body: some View {
        Text(text)
            .font(.system(size: 11, weight: .medium))
            .padding(.horizontal, 8)
            .padding(.vertical, 2)
            .background(tagColor)
            .foregroundColor(.black.opacity(0.8))
    }
}`;

  return (
    <div>
      <SectionTitle>Swift Export</SectionTitle>
      <p className="text-[--muted] mb-8">
        Copy these Swift extensions into your Xcode project to maintain design consistency across platforms.
        Create an Asset Catalog with the color values below.
      </p>

      <ComponentBlock title="Colors" description="SwiftUI color extensions">
        <div className="relative">
          <button
            onClick={() => copyToClipboard(swiftColors, "colors")}
            className="absolute top-2 right-2 px-3 py-1 text-xs bg-[--background] border border-[--border] rounded hover:bg-[--hover]"
          >
            {copied === "colors" ? "Copied!" : "Copy"}
          </button>
          <pre className="text-xs bg-[--hover] p-4 rounded overflow-x-auto max-h-64">{swiftColors}</pre>
        </div>
      </ComponentBlock>

      <ComponentBlock title="Typography" description="SwiftUI font extensions">
        <div className="relative">
          <button
            onClick={() => copyToClipboard(swiftTypography, "typography")}
            className="absolute top-2 right-2 px-3 py-1 text-xs bg-[--background] border border-[--border] rounded hover:bg-[--hover]"
          >
            {copied === "typography" ? "Copied!" : "Copy"}
          </button>
          <pre className="text-xs bg-[--hover] p-4 rounded overflow-x-auto max-h-64">{swiftTypography}</pre>
        </div>
      </ComponentBlock>

      <ComponentBlock title="Components" description="Basic SwiftUI components">
        <div className="relative">
          <button
            onClick={() => copyToClipboard(swiftComponents, "components")}
            className="absolute top-2 right-2 px-3 py-1 text-xs bg-[--background] border border-[--border] rounded hover:bg-[--hover]"
          >
            {copied === "components" ? "Copied!" : "Copy"}
          </button>
          <pre className="text-xs bg-[--hover] p-4 rounded overflow-x-auto max-h-64">{swiftComponents}</pre>
        </div>
      </ComponentBlock>

      <ComponentBlock title="Asset Catalog Setup" description="How to set up colors in Xcode">
        <div className="text-sm space-y-3">
          <ol className="list-decimal list-inside space-y-2 text-[--muted]">
            <li>In Xcode, open your Asset Catalog (Assets.xcassets)</li>
            <li>Right-click → New Color Set for each color</li>
            <li>Name it exactly as shown (background, foreground, etc.)</li>
            <li>Set &ldquo;Any Appearance&rdquo; to light mode value</li>
            <li>Set &ldquo;Dark&rdquo; appearance to dark mode value</li>
            <li>Import the Color extensions file</li>
          </ol>
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
            <strong>Tip:</strong> The Color(&ldquo;name&rdquo;) initializer automatically handles light/dark mode switching when colors are defined in the Asset Catalog.
          </div>
        </div>
      </ComponentBlock>
    </div>
  );
}
