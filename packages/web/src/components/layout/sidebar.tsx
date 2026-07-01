import * as React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  PlayCircle,
  ListChecks,
  Globe,
  GitCompareArrows,
  Sparkles,
  Settings,
  ChartLine,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { BrandMark } from '@/components/brand/BrandMark';
import rootPackage from '../../../../../package.json';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  disabled?: boolean;
}

const PRIMARY_NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/crawl', label: 'New Crawl', icon: PlayCircle },
  { to: '/runs', label: 'Crawl Runs', icon: ListChecks },
];

const TOOLS_NAV: NavItem[] = [
  { to: '/sitemap', label: 'Sitemap Studio', icon: Globe },
  { to: '/compare', label: 'Compare Runs', icon: GitCompareArrows },
  { to: '/insights', label: 'AI Insights', icon: Sparkles },
  { to: '/reports', label: 'Reports', icon: ChartLine },
];

function SidebarLink({ item }: { item: NavItem }) {
  const Icon = item.icon;
  if (item.disabled) {
    return (
      <span
        aria-disabled
        className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/40 cursor-not-allowed"
      >
        <Icon className="h-4 w-4" />
        <span>{item.label}</span>
      </span>
    );
  }
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
          isActive
            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            className={cn('h-4 w-4 transition-transform', isActive && 'text-primary')}
          />
          <span>{item.label}</span>
          {isActive ? (
            <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary animate-pulse-glow" />
          ) : null}
        </>
      )}
    </NavLink>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden md:flex md:sticky md:top-0 md:self-start md:h-screen w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-accent z-20">
      <div className="flex items-center gap-3 px-5 h-20 border-b border-sidebar-accent">
        <BrandMark size="md" role="fe" subtitle="Professional" />
      </div>

      <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
        <div>
          <p className="px-3 mb-2 text-[10px] font-semibold tracking-widest uppercase text-sidebar-foreground/50">
            Overview
          </p>
          <div className="space-y-1">
            {PRIMARY_NAV.map((item) => (
              <SidebarLink key={item.to} item={item} />
            ))}
          </div>
        </div>
        <div>
          <p className="px-3 mb-2 text-[10px] font-semibold tracking-widest uppercase text-sidebar-foreground/50">
            Tools
          </p>
          <div className="space-y-1">
            {TOOLS_NAV.map((item) => (
              <SidebarLink key={item.to} item={item} />
            ))}
          </div>
        </div>
      </nav>

      <div className="border-t border-sidebar-accent p-4 space-y-2">
        <SidebarLink item={{ to: '/settings', label: 'Settings', icon: Settings }} />
        <div className="rounded-md bg-sidebar-accent p-3 text-xs text-sidebar-foreground/70 leading-relaxed">
          <p className="font-medium text-sidebar-foreground">v{rootPackage.version} </p>
          <p>Free, open source, {rootPackage.license} licensed.</p>
        </div>
      </div>
    </aside>
  );
}

export { Button };
