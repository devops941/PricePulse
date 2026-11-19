import React, { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import {
  IconSearch,
  IconHome,
  IconReceipt,
  IconTrendingUp,
  IconBuildingStore,
  IconChartInfographic,
  IconAlertTriangle,
  IconFileText,
  IconSettings,
  IconX
} from '@tabler/icons-react';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onOpenChange }) => {
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, onOpenChange]);

  if (!open) return null;

  const runCommand = (action: () => void) => {
    action();
    onOpenChange(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-ink/40 backdrop-blur-sm animate-fade-in">
      <div
        className="fixed inset-0 -z-10"
        onClick={() => onOpenChange(false)}
      />
      <div className="w-full max-w-xl bg-tile rounded-tile border border-hairline shadow-2xl overflow-hidden animate-scale-up">
        <Command className="flex flex-col w-full focus:outline-none">
          <div className="flex items-center px-4 border-b border-hairline bg-shelf/40">
            <IconSearch size={18} className="text-muted shrink-0 mr-2" />
            <Command.Input
              autoFocus
              placeholder="Type a command, page, or search basket items..."
              className="w-full py-3 bg-transparent text-sm font-sans text-ink placeholder:text-muted focus:outline-none"
            />
            <button
              onClick={() => onOpenChange(false)}
              className="text-muted hover:text-ink text-xs p-1"
            >
              <IconX size={16} />
            </button>
          </div>

          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Empty className="p-4 text-center text-xs text-muted font-sans">
              No matching pages or commands found.
            </Command.Empty>

            <Command.Group heading="Navigation" className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted font-sans">
              <Command.Item
                onSelect={() => runCommand(() => navigate('/'))}
                className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-ink rounded-md cursor-pointer hover:bg-cocoa-wash/50"
              >
                <IconHome size={16} className="text-cocoa" />
                <span>Home Dashboard</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => navigate('/prices'))}
                className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-ink rounded-md cursor-pointer hover:bg-cocoa-wash/50"
              >
                <IconReceipt size={16} className="text-cocoa" />
                <span>Price Entry & Records</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => navigate('/index'))}
                className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-ink rounded-md cursor-pointer hover:bg-cocoa-wash/50"
              >
                <IconTrendingUp size={16} className="text-cocoa" />
                <span>Index Engine & Calculations</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => navigate('/markets'))}
                className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-ink rounded-md cursor-pointer hover:bg-cocoa-wash/50"
              >
                <IconBuildingStore size={16} className="text-cocoa" />
                <span>Markets & Regional Analysis</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => navigate('/forecast'))}
                className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-ink rounded-md cursor-pointer hover:bg-cocoa-wash/50"
              >
                <IconChartInfographic size={16} className="text-cocoa" />
                <span>Forecasting & Volatility</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => navigate('/review'))}
                className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-ink rounded-md cursor-pointer hover:bg-cocoa-wash/50"
              >
                <IconAlertTriangle size={16} className="text-warn" />
                <span>Review Desk (Flagged Prices)</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => navigate('/bulletins'))}
                className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-ink rounded-md cursor-pointer hover:bg-cocoa-wash/50"
              >
                <IconFileText size={16} className="text-cocoa" />
                <span>Bulletins & PDF Reports</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => navigate('/admin'))}
                className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-ink rounded-md cursor-pointer hover:bg-cocoa-wash/50"
              >
                <IconSettings size={16} className="text-cocoa" />
                <span>Admin & Basket Builder</span>
              </Command.Item>
            </Command.Group>
          </Command.List>

          <div className="border-t border-hairline px-3 py-2 bg-shelf/50 flex items-center justify-between text-[11px] text-muted font-mono">
            <span>Use ↑↓ to navigate</span>
            <span>↵ to select · ESC to dismiss</span>
          </div>
        </Command>
      </div>
    </div>
  );
};
