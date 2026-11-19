import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  IconCommand,
  IconLogout,
  IconUser,
  IconMenu2,
  IconShield,
} from '@tabler/icons-react';
import { PeriodPill } from '../ui/PeriodPill';

interface AppHeaderProps {
  currentRole: string;
  userName: string;
  currentPeriod: string;
  onPeriodChange: (p: string) => void;
  onOpenCommandPalette: () => void;
  onToggleSidebar?: () => void;
  onLogout?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  currentRole,
  userName,
  currentPeriod,
  onPeriodChange,
  onOpenCommandPalette,
  onToggleSidebar,
  onLogout,
}) => {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full shrink-0 items-center justify-between border-b border-hairline bg-white/95 px-4 sm:px-6 shadow-xs backdrop-blur-md">
      {/* Left: Mobile hamburger + Brand logo & subtitle */}
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-hairline text-cocoa hover:bg-shelf-base lg:hidden"
            title="Toggle Menu"
          >
            <IconMenu2 size={18} />
          </button>
        )}

        <Link to="/" className="flex items-baseline gap-2 focus:outline-none">
          <span className="font-serif text-2xl font-bold tracking-tight text-cocoa">
            PricePulse
          </span>
          <span className="hidden font-sans text-xs text-shelf-muted sm:inline">
            Retail Inflation Tracker
          </span>
        </Link>

        <span className="rounded-full border border-hairline bg-shelf-base px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-shelf-muted font-semibold">
          Illustrative sample data
        </span>
      </div>

      {/* Right Tools: Period Picker, ⌘K search, User Role pill, Logout */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Period Dropdown */}
        <PeriodPill
          currentPeriod={currentPeriod}
          onSelect={onPeriodChange}
          options={[
            '2024-W52',
            '2024-W51',
            '2024-W50',
            '2024-W49',
            '2024-W48',
            '2024-W47',
          ]}
        />

        {/* ⌘K Command Palette shortcut button */}
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="flex items-center gap-1.5 rounded-full border border-hairline bg-shelf-base px-2.5 py-1.5 font-sans text-xs font-medium text-shelf-muted hover:border-cocoa hover:text-cocoa shadow-xs transition"
          title="Search commands (⌘K or Ctrl+K)"
        >
          <IconCommand size={14} className="text-cocoa" />
          <span className="hidden font-mono text-[11px] sm:inline">⌘K</span>
        </button>

        {/* Active User Avatar & Role Tag */}
        <div className="flex items-center gap-2 rounded-full border border-hairline bg-shelf-base py-1 pl-2.5 pr-1.5 shadow-xs">
          <div className="flex items-center gap-1.5">
            <IconUser size={14} className="text-cocoa" />
            <span className="hidden font-sans text-xs font-medium text-cocoa sm:inline">
              {userName.split(' ')[0]}
            </span>
            <span className="rounded-full bg-cocoa px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-white">
              {currentRole}
            </span>
          </div>

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="rounded-full p-1 text-shelf-muted transition hover:bg-price-rise/10 hover:text-price-rise"
              title="Sign Out"
            >
              <IconLogout size={14} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
