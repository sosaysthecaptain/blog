'use client';

import { useState, useRef, useEffect } from 'react';
import { ToolType } from '@/lib/cad/types';

interface ToolbarProps {
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  constructionMode: boolean;
  onConstructionModeChange: (mode: boolean) => void;
}

interface ToolButtonProps {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  active: boolean;
  onClick: () => void;
}

function ToolButton({ icon, label, shortcut, active, onClick }: ToolButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center justify-center w-8 h-8 rounded
        transition-colors
        ${active
          ? 'bg-[--accent] text-white'
          : 'hover:bg-[--hover] text-[--foreground]'
        }
      `}
      title={`${label}${shortcut ? ` (${shortcut})` : ''}`}
    >
      {icon}
    </button>
  );
}

interface ToolDropdownProps {
  tools: Array<{
    id: ToolType;
    icon: React.ReactNode;
    label: string;
    shortcut?: string;
  }>;
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  lastUsed: ToolType;
}

function ToolDropdown({ tools, activeTool, onToolChange, lastUsed }: ToolDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentTool = tools.find(t => t.id === activeTool) || tools.find(t => t.id === lastUsed) || tools[0];
  const isActive = tools.some(t => t.id === activeTool);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      <div className="flex">
        <button
          onClick={() => onToolChange(currentTool.id)}
          className={`
            flex items-center justify-center w-8 h-8 rounded-l
            transition-colors
            ${isActive
              ? 'bg-[--accent] text-white'
              : 'hover:bg-[--hover] text-[--foreground]'
            }
          `}
          title={`${currentTool.label}${currentTool.shortcut ? ` (${currentTool.shortcut})` : ''}`}
        >
          {currentTool.icon}
        </button>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`
            flex items-center justify-center w-4 h-8 rounded-r border-l border-[--border]
            transition-colors
            ${isActive
              ? 'bg-[--accent] text-white'
              : 'hover:bg-[--hover] text-[--foreground]'
            }
          `}
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-[--background] border border-[--border] rounded shadow-lg z-50 min-w-[160px]">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => {
                onToolChange(tool.id);
                setIsOpen(false);
              }}
              className={`
                flex items-center gap-2 w-full px-3 py-2 text-left text-sm
                ${activeTool === tool.id ? 'bg-[--hover]' : 'hover:bg-[--hover]'}
              `}
            >
              <span className="w-5 h-5">{tool.icon}</span>
              <span className="flex-1">{tool.label}</span>
              {tool.shortcut && (
                <span className="text-[--muted] text-xs">{tool.shortcut}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// SVG Icons
const Icons = {
  select: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59" />
    </svg>
  ),
  point: (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="3" fill="currentColor" />
    </svg>
  ),
  line: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 20L20 4" />
    </svg>
  ),
  circle: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="8" strokeWidth={1.5} />
    </svg>
  ),
  rectangleCorner: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <rect x="4" y="6" width="16" height="12" strokeWidth={1.5} rx="0" />
      <circle cx="4" cy="6" r="2" fill="currentColor" />
    </svg>
  ),
  rectangleCenter: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <rect x="4" y="6" width="16" height="12" strokeWidth={1.5} rx="0" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
  ),
  dimension: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 12h16M4 12l3-3m-3 3l3 3m13-3l-3-3m3 3l-3 3" />
    </svg>
  ),
  construction: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} strokeDasharray="3 3" d="M4 20L20 4" />
    </svg>
  ),
  horizontal: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 12h16" />
    </svg>
  ),
  vertical: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16" />
    </svg>
  ),
  coincident: (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth={1.5} />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  ),
  parallel: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 6l12 12M6 18l12-12" />
    </svg>
  ),
  perpendicular: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16M4 12h16" />
    </svg>
  ),
  undo: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
    </svg>
  ),
  redo: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" />
    </svg>
  ),
};

export default function Toolbar({
  activeTool,
  onToolChange,
  constructionMode,
  onConstructionModeChange,
}: ToolbarProps) {
  const [lastRectTool, setLastRectTool] = useState<ToolType>('rectangle-corner');

  const rectangleTools = [
    { id: 'rectangle-corner' as ToolType, icon: Icons.rectangleCorner, label: 'Corner Rectangle', shortcut: 'G' },
    { id: 'rectangle-center' as ToolType, icon: Icons.rectangleCenter, label: 'Center Rectangle', shortcut: 'R' },
  ];

  const handleRectToolChange = (tool: ToolType) => {
    setLastRectTool(tool);
    onToolChange(tool);
  };

  return (
    <div className="flex items-center gap-1 px-2 py-1.5 bg-[--sidebar-bg] border-b border-[--border]">
      {/* Selection */}
      <ToolButton
        icon={Icons.select}
        label="Select"
        shortcut="Esc"
        active={activeTool === 'select'}
        onClick={() => onToolChange('select')}
      />

      <div className="w-px h-6 bg-[--border] mx-1" />

      {/* Drawing Tools */}
      <ToolButton
        icon={Icons.point}
        label="Point"
        shortcut="P"
        active={activeTool === 'point'}
        onClick={() => onToolChange('point')}
      />
      <ToolButton
        icon={Icons.line}
        label="Line"
        shortcut="L"
        active={activeTool === 'line'}
        onClick={() => onToolChange('line')}
      />
      <ToolButton
        icon={Icons.circle}
        label="Circle"
        shortcut="C"
        active={activeTool === 'circle'}
        onClick={() => onToolChange('circle')}
      />
      <ToolDropdown
        tools={rectangleTools}
        activeTool={activeTool}
        onToolChange={handleRectToolChange}
        lastUsed={lastRectTool}
      />

      <div className="w-px h-6 bg-[--border] mx-1" />

      {/* Constraints */}
      <ToolButton
        icon={Icons.horizontal}
        label="Horizontal"
        shortcut="H"
        active={false}
        onClick={() => {}}
      />
      <ToolButton
        icon={Icons.vertical}
        label="Vertical"
        shortcut="V"
        active={false}
        onClick={() => {}}
      />
      <ToolButton
        icon={Icons.coincident}
        label="Coincident"
        shortcut="I"
        active={false}
        onClick={() => {}}
      />

      <div className="w-px h-6 bg-[--border] mx-1" />

      {/* Dimension */}
      <ToolButton
        icon={Icons.dimension}
        label="Dimension"
        shortcut="D"
        active={activeTool === 'dimension'}
        onClick={() => onToolChange('dimension')}
      />

      <div className="w-px h-6 bg-[--border] mx-1" />

      {/* Construction Mode */}
      <ToolButton
        icon={Icons.construction}
        label="Construction Mode"
        shortcut="Q"
        active={constructionMode}
        onClick={() => onConstructionModeChange(!constructionMode)}
      />

      <div className="flex-1" />

      {/* Undo/Redo */}
      <ToolButton
        icon={Icons.undo}
        label="Undo"
        shortcut="Cmd+Z"
        active={false}
        onClick={() => {}}
      />
      <ToolButton
        icon={Icons.redo}
        label="Redo"
        shortcut="Cmd+Shift+Z"
        active={false}
        onClick={() => {}}
      />
    </div>
  );
}
