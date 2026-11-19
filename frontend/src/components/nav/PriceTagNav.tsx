import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { IconCommand, IconUser, IconLogout } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { PeriodPill } from '../ui/PeriodPill';

export interface NavItem {
  id: string;
  label: string;
  path: string;
  badge?: number;
  roles?: string[]; // Admin, Analyst, Collector, Viewer
}

interface PriceTagNavProps {
  currentRole?: string;
  userName?: string;
  openReviewCount?: number;
  currentPeriod: string;
  onPeriodChange?: (period: string) => void;
  onOpenCommandPalette: () => void;
  onLogout?: () => void;
}

export const PriceTagNav: React.FC<PriceTagNavProps> = ({
  currentRole = 'Admin',
  userName = 'Gokul Analyst',
  openReviewCount = 3,
  currentPeriod,
  onPeriodChange,
  onOpenCommandPalette,
  onLogout,
}) => {
  const location = useLocation();

  const navItems: NavItem[] = [
    { id: 'home', label: 'Home', path: '/' },
    { id: 'prices', label: 'Prices', path: '/prices', roles: ['Admin', 'Analyst', 'Collector'] },
    { id: 'index', label: 'Index', path: '/index', roles: ['Admin', 'Analyst', 'Viewer'] },
    { id: 'markets', label: 'Markets', path: '/markets', roles: ['Admin', 'Analyst', 'Viewer'] },
    { id: 'forecast', label: 'Forecast', path: '/forecast', roles: ['Admin', 'Analyst', 'Viewer'] },
    { id: 'review', label: 'Review', path: '/review', badge: openReviewCount, roles: ['Admin', 'Analyst'] },
    { id: 'bulletins', label: 'Bulletins', path: '/bulletins' },
    { id: 'admin', label: 'Admin', path: '/admin', roles: ['Admin'] },
  ];

  // Filter items by role (if roles specified)
  const visibleItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(currentRole)
  );

  return (
    <header className="sticky top-0 z-30 bg-shelf border-b border-hairline/80">
      {/* Top thin string rail for hanging tags */}
      <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        
        {/* Left: Brand Logo in Young Serif */}
        <div className="flex items-center gap-3 shrink-0">
          <NavLink to="/" className="flex items-baseline gap-1.5 focus:outline-none">
            <span className="font-serif text-2xl lg:text-[26px] text-cocoa font-normal tracking-tight">
              PricePulse
            </span>
          </NavLink>
          <span className="hidden sm:inline-block text-[10px] uppercase tracking-wider font-semibold bg-cocoa-wash text-cocoa px-2 py-0.5 rounded-full border border-hairline">
            Illustrative sample data
          </span>
        </div>

        {/* Center: Hanging Price-Tag Navigation on a thin string rail */}
        <nav
          className="hidden md:flex items-start justify-center gap-2 lg:gap-3 relative h-full pt-2"
          aria-label="Main Navigation"
        >
          {/* Thin horizontal string rail */}
          <div className="absolute top-2 left-0 right-0 h-[1.5px] bg-hairline -z-10" />

          {visibleItems.map((item) => {
            const isActive =
              item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path);

            return (
              <NavLink
                key={item.id}
                to={item.path}
                className={cn(
                  'relative group flex flex-col items-center transition-all duration-200 outline-none select-none',
                  isActive ? 'translate-y-2' : 'hover:translate-y-1'
                )}
              >
                {/* Visual String hanging from rail */}
                <div
                  className={cn(
                    'w-[1.5px] transition-all duration-200',
                    isActive ? 'h-3 bg-cocoa' : 'h-2 bg-hairline group-hover:bg-muted'
                  )}
                />

                {/* The Price Tag itself (angled corner + punched hole) */}
                <div
                  className={cn(
                    'price-tag-shape px-3 py-1.5 min-w-[70px] text-center border transition-all duration-200 shadow-tag flex items-center justify-center gap-1.5',
                    isActive
                      ? 'bg-cocoa text-white border-cocoa-deep shadow-md font-semibold'
                      : 'bg-tile text-ink border-hairline group-hover:border-cocoa/40 font-medium'
                  )}
                >
                  {/* Punched hole at top-left angled notch */}
                  <div
                    className={cn(
                      'price-tag-hole absolute top-1 left-1',
                      isActive ? 'bg-cocoa-wash/80 border-cocoa-deep' : 'bg-shelf border-hairline'
                    )}
                  />

                  <span className="text-xs font-sans tracking-wide ml-1">
                    {item.label}
                  </span>

                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={cn(
                        'text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold leading-tight',
                        isActive
                          ? 'bg-white text-cocoa'
                          : 'bg-warn text-white'
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              </NavLink>
            );
          })}
        </nav>

        {/* Right tools: Period Pill, ⌘K search, user role avatar */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <PeriodPill
            currentPeriod={currentPeriod}
            onSelect={onPeriodChange}
          />

          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-hairline bg-tile hover:bg-cocoa-wash/40 text-muted hover:text-ink text-xs font-medium shadow-shelf transition-colors"
            title="Command Search (Ctrl+K)"
          >
            <IconCommand size={14} className="text-cocoa" />
            <span className="hidden sm:inline font-mono text-[11px]">⌘K</span>
          </button>

          {/* User Role Tag */}
          <div className="relative group">
            <div className="flex items-center gap-1.5 pl-2 py-1 pr-1 border border-hairline rounded-full bg-tile shadow-shelf">
              <span className="text-[11px] font-medium text-ink hidden sm:inline px-1">
                {userName.split(' ')[0]}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-cocoa text-white font-semibold uppercase">
                {currentRole}
              </span>
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="p-1 rounded-full text-muted hover:text-rise transition-colors"
                  title="Sign out"
                >
                  <IconLogout size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Swipeable Tag Row for smaller screens (§10.5.4) */}
      <div className="md:hidden flex items-center gap-2 overflow-x-auto px-4 py-2 border-t border-hairline bg-tile scrollbar-none">
        {visibleItems.map((item) => {
          const isActive =
            item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path);
          return (
            <NavLink
              key={item.id}
              to={item.path}
              className={cn(
                'price-tag-shape px-3 py-1 text-xs shrink-0 border font-medium transition-colors',
                isActive
                  ? 'bg-cocoa text-white border-cocoa'
                  : 'bg-shelf text-ink border-hairline'
              )}
            >
              {item.label}
              {item.badge !== undefined && item.badge > 0 && (
                <span className="ml-1.5 text-[10px] font-mono bg-warn text-white px-1 rounded-full">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </div>
    </header>
  );
};
