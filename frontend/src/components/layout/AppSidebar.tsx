import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  IconHome,
  IconTrendingUp,
  IconBuildingStore,
  IconChartArcs,
  IconReceipt,
  IconShieldCheck,
  IconFileText,
  IconSettings,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';

interface NavSection {
  title: string;
  items: {
    id: string;
    label: string;
    path: string;
    icon: React.ReactNode;
    badge?: number | string;
    badgeColor?: string;
    roles?: string[];
  }[];
}

interface AppSidebarProps {
  currentRole: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  reviewCount?: number;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  currentRole,
  isCollapsed,
  onToggleCollapse,
  reviewCount = 0,
}) => {
  const location = useLocation();

  const sections: NavSection[] = [
    {
      title: 'Analytics & Intelligence',
      items: [
        {
          id: 'home',
          label: 'Dashboard Home',
          path: '/',
          icon: <IconHome size={18} />,
        },
        {
          id: 'index',
          label: 'Index Engine',
          path: '/index',
          icon: <IconTrendingUp size={18} />,
        },
        {
          id: 'markets',
          label: 'Markets & Price Gaps',
          path: '/markets',
          icon: <IconBuildingStore size={18} />,
        },
        {
          id: 'forecast',
          label: 'Forecasting & Fans',
          path: '/forecast',
          icon: <IconChartArcs size={18} />,
        },
      ],
    },
    {
      title: 'Data Operations',
      items: [
        {
          id: 'prices',
          label: 'Prices & Weekly Grid',
          path: '/prices',
          icon: <IconReceipt size={18} />,
          roles: ['Admin', 'Analyst', 'Collector'],
        },
        {
          id: 'review',
          label: 'Review Desk',
          path: '/review',
          icon: <IconShieldCheck size={18} />,
          badge: reviewCount > 0 ? `${reviewCount} Open` : undefined,
          badgeColor: 'bg-price-rise text-white',
          roles: ['Admin', 'Analyst'],
        },
      ],
    },
    {
      title: 'Publications & System',
      items: [
        {
          id: 'bulletins',
          label: 'Official Bulletins (PDF)',
          path: '/bulletins',
          icon: <IconFileText size={18} />,
        },
        {
          id: 'admin',
          label: 'Basket & Admin',
          path: '/admin',
          icon: <IconSettings size={18} />,
          roles: ['Admin'],
        },
      ],
    },
  ];

  return (
    <aside
      className={cn(
        'sticky top-16 z-30 flex h-[calc(100vh-4rem)] shrink-0 flex-col justify-between border-r border-hairline bg-white transition-all duration-300 shadow-xs',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Scrollable Navigation Items */}
      <div className="flex-1 overflow-y-auto px-2 py-4">
        {sections.map((sec, secIdx) => {
          // Filter items by role
          const visibleItems = sec.items.filter(
            (it) => !it.roles || it.roles.includes(currentRole)
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={sec.title} className={cn(secIdx > 0 && 'mt-5')}>
              {/* Section Header */}
              {!isCollapsed && (
                <div className="px-3 pb-1.5 font-serif text-[11px] font-bold uppercase tracking-wider text-shelf-muted">
                  {sec.title}
                </div>
              )}

              {/* Items */}
              <div className="space-y-1">
                {visibleItems.map((item) => {
                  const isActive =
                    item.path === '/'
                      ? location.pathname === '/'
                      : location.pathname.startsWith(item.path);

                  return (
                    <NavLink
                      key={item.id}
                      to={item.path}
                      title={isCollapsed ? item.label : undefined}
                      className={cn(
                        'group flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-all select-none',
                        isActive
                          ? 'border border-cocoa/30 bg-cocoa text-white shadow-xs font-semibold'
                          : 'text-shelf-muted hover:border-hairline hover:bg-shelf-base hover:text-cocoa'
                      )}
                    >
                      <span
                        className={cn(
                          'shrink-0 transition-transform group-hover:scale-105',
                          isActive ? 'text-white' : 'text-cocoa'
                        )}
                      >
                        {item.icon}
                      </span>

                      {!isCollapsed && (
                        <div className="flex flex-1 items-center justify-between truncate">
                          <span className="truncate">{item.label}</span>
                          {item.badge && (
                            <span
                              className={cn(
                                'rounded-full px-1.5 py-0.5 font-mono text-[10px] font-bold shadow-2xs',
                                item.badgeColor || 'bg-cocoa-wash text-cocoa'
                              )}
                            >
                              {item.badge}
                            </span>
                          )}
                        </div>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Collapse / Expand Toggle at Bottom */}
      <div className="border-t border-hairline/80 p-2">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="flex w-full items-center justify-center gap-2 rounded-lg py-2 text-xs font-medium text-shelf-muted transition hover:bg-shelf-base hover:text-cocoa"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <IconLayoutSidebarLeftExpand size={18} className="text-cocoa" />
          ) : (
            <>
              <IconLayoutSidebarLeftCollapse size={18} className="text-cocoa" />
              <span className="font-sans text-[11px]">Collapse Sidebar</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};
