import * as React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './sidebar';
import { TopBar } from './topbar';

export function AppLayout(): React.ReactElement {
  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl p-4 md:p-6 pb-16 animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
