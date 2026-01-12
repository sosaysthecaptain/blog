'use client';

import { useState } from 'react';

interface CodePanelProps {
  code: string;
  onCodeChange?: (code: string) => void;
}

export default function CodePanel({ code, onCodeChange }: CodePanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedCode, setEditedCode] = useState(code);

  const handleToggle = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleEdit = () => {
    setEditedCode(code);
    setIsEditing(true);
  };

  const handleSave = () => {
    if (onCodeChange) {
      onCodeChange(editedCode);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedCode(code);
    setIsEditing(false);
  };

  if (isCollapsed) {
    return (
      <button
        onClick={handleToggle}
        className="absolute right-0 top-1/2 -translate-y-1/2 bg-[--sidebar-bg] border border-[--border] border-r-0 rounded-l px-1 py-4 hover:bg-[--hover] transition-colors"
        title="Show Code"
      >
        <svg className="w-4 h-4 text-[--muted]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
    );
  }

  return (
    <div className="w-80 border-l border-[--border] bg-[--sidebar-bg] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[--border]">
        <span className="text-xs font-medium text-[--foreground]">Sketch Code</span>
        <div className="flex items-center gap-1">
          {!isEditing && (
            <button
              onClick={handleEdit}
              className="p-1 hover:bg-[--hover] rounded text-[--muted]"
              title="Edit Code"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}
          <button
            onClick={handleToggle}
            className="p-1 hover:bg-[--hover] rounded text-[--muted]"
            title="Collapse Panel"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Code Area */}
      <div className="flex-1 overflow-auto p-3">
        {isEditing ? (
          <textarea
            value={editedCode}
            onChange={(e) => setEditedCode(e.target.value)}
            className="w-full h-full bg-[--editor-bg] border border-[--border] rounded p-2 font-mono text-xs text-[--foreground] resize-none focus:outline-none focus:border-[--accent]"
            spellCheck={false}
          />
        ) : (
          <pre className="font-mono text-xs text-[--foreground] whitespace-pre-wrap">
            {code}
          </pre>
        )}
      </div>

      {/* Edit Actions */}
      {isEditing && (
        <div className="flex items-center justify-end gap-2 px-3 py-2 border-t border-[--border]">
          <button
            onClick={handleCancel}
            className="px-3 py-1 text-xs text-[--muted] hover:text-[--foreground]"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1 text-xs bg-[--accent] text-white rounded hover:opacity-90"
          >
            Apply
          </button>
        </div>
      )}

      {/* Footer Info */}
      {!isEditing && (
        <div className="px-3 py-2 border-t border-[--border] text-xs text-[--muted]">
          <p>This code represents the current sketch.</p>
          <p className="mt-1">AI can generate or modify this code to create designs.</p>
        </div>
      )}
    </div>
  );
}
