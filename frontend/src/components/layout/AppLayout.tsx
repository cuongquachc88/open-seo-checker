import * as React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './sidebar';
import { TopBar } from './topbar';

export function AppLayout(): React.ReactElement {
  // Scroll to top whenever the route changes so navigation feels natural.
  const location = useLocation();
  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0">
        <TopBar />
        <main className="flex-1 min-w-0">
          <div className="mx-auto w-full max-w-7xl p-4 md:p-6 pb-16 animate-fade-in min-h-[calc(100vh-4rem)]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
