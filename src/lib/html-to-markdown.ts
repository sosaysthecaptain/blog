/**
 * HTML to Markdown conversion module
 *
 * This module handles lazy migration of HTML content (from Tiptap editor)
 * to Markdown format. It should be removed once all notes are migrated.
 *
 * To remove after migration:
 * 1. Delete this file
 * 2. Remove imports and usage from NoteEditor.tsx
 * 3. Uninstall turndown: npm uninstall turndown @types/turndown
 */

import TurndownService from "turndown";

// Create turndown instance with custom rules
const turndown = new TurndownService({
  headingStyle: "atx", // # style headings
  codeBlockStyle: "fenced", // ``` style code blocks
  bulletListMarker: "-",
  emDelimiter: "*",
  strongDelimiter: "**",
});

// Custom rule for task lists (Tiptap format)
turndown.addRule("taskList", {
  filter: (node) => {
    return (
      node.nodeName === "LI" &&
      node.parentElement?.getAttribute("data-type") === "taskList"
    );
  },
  replacement: (content, node) => {
    const element = node as HTMLElement;
    const isChecked = element.getAttribute("data-checked") === "true";
    const checkbox = isChecked ? "[x]" : "[ ]";
    // Clean up the content - remove leading/trailing whitespace
    const cleanContent = content.trim().replace(/^\n+|\n+$/g, "");
    return `- ${checkbox} ${cleanContent}\n`;
  },
});

// Custom rule for task list container (skip the ul wrapper)
turndown.addRule("taskListContainer", {
  filter: (node) => {
    return (
      node.nodeName === "UL" &&
      (node as HTMLElement).getAttribute("data-type") === "taskList"
    );
  },
  replacement: (content) => {
    return content;
  },
});

// Custom rule for images with captions (figure/figcaption)
turndown.addRule("figureWithCaption", {
  filter: "figure",
  replacement: (content, node) => {
    const figure = node as HTMLElement;
    const img = figure.querySelector("img");
    const figcaption = figure.querySelector("figcaption");

    if (!img) return content;

    const src = img.getAttribute("src") || "";
    const alt = img.getAttribute("alt") || "";
    const caption = figcaption?.textContent?.trim() || "";

    // Get width from style if present
    const style = img.getAttribute("style") || "";
    const widthMatch = style.match(/width:\s*(\d+)px/);
    const widthPart = widthMatch ? ` =${widthMatch[1]}` : "";

    const captionPart = caption ? ` "${caption}"` : "";

    return `\n![${alt}](${src}${widthPart}${captionPart})\n`;
  },
});

// Custom rule for standalone images
turndown.addRule("image", {
  filter: "img",
  replacement: (content, node) => {
    const img = node as HTMLImageElement;
    const src = img.getAttribute("src") || "";
    const alt = img.getAttribute("alt") || "";

    // Skip if inside a figure (handled by figureWithCaption rule)
    if (img.closest("figure")) return "";

    // Get width from style if present
    const style = img.getAttribute("style") || "";
    const widthMatch = style.match(/width:\s*(\d+)px/);
    const widthPart = widthMatch ? ` =${widthMatch[1]}` : "";

    return `![${alt}](${src}${widthPart})`;
  },
});

// Keep code blocks with language
turndown.addRule("codeBlock", {
  filter: (node) => {
    return (
      node.nodeName === "PRE" &&
      node.firstChild?.nodeName === "CODE"
    );
  },
  replacement: (content, node) => {
    const pre = node as HTMLElement;
    const code = pre.querySelector("code");
    const language = code?.className?.match(/language-(\w+)/)?.[1] || "";
    const text = code?.textContent || "";
    return `\n\`\`\`${language}\n${text}\n\`\`\`\n`;
  },
});

/**
 * Check if content appears to be HTML (from Tiptap)
 * Returns true if content looks like HTML, false if it's already markdown
 */
export function isHtmlContent(content: string): boolean {
  if (!content || content.trim() === "") return false;

  const trimmed = content.trim();

  // If it starts with a markdown heading, it's probably markdown
  if (/^#{1,6}\s/.test(trimmed)) return false;

  // If it starts with a list item, it's probably markdown
  if (/^[-*+]\s/.test(trimmed) || /^\d+\.\s/.test(trimmed)) return false;

  // If it contains HTML tags, it's probably HTML
  if (/<(p|div|h[1-6]|ul|ol|li|blockquote|pre|figure|img|a|strong|em|code)\b/i.test(trimmed)) {
    return true;
  }

  // If it starts with <, it's probably HTML
  if (trimmed.startsWith("<")) return true;

  return false;
}

/**
 * Convert HTML content to Markdown
 */
export function htmlToMarkdown(html: string): string {
  if (!html || html.trim() === "") return "";

  // Run turndown conversion
  let markdown = turndown.turndown(html);

  // Clean up excessive newlines
  markdown = markdown.replace(/\n{3,}/g, "\n\n");

  // Trim leading/trailing whitespace
  markdown = markdown.trim();

  return markdown;
}

/**
 * Convert content if it's HTML, otherwise return as-is
 * This is the main function to call when loading note content
 */
export function migrateContentIfNeeded(content: string): {
  content: string;
  wasMigrated: boolean;
} {
  if (isHtmlContent(content)) {
    return {
      content: htmlToMarkdown(content),
      wasMigrated: true,
    };
  }

  return {
    content,
    wasMigrated: false,
  };
}
