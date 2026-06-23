import * as React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from 'sonner';

import { DashboardPage } from '@/pages/DashboardPage';
import { NewCrawlPage } from '@/pages/NewCrawlPage';
import { CrawlDetailPage } from '@/pages/CrawlDetailPage';
import { RunsPage } from '@/pages/RunsPage';
import { SitemapPage } from '@/pages/SitemapPage';
import { ComparePage } from '@/pages/ComparePage';
import { InsightsPage } from '@/pages/InsightsPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

export function App(): React.ReactElement {
  return (
    <BrowserRouter>
      <TooltipProvider delayDuration={150}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/crawl" element={<NewCrawlPage />} />
            <Route path="/crawl/:id/*" element={<CrawlDetailPage />} />
            <Route path="/runs" element={<RunsPage />} />
            <Route path="/sitemap" element={<SitemapPage />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="/insights" element={<InsightsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
        <Toaster
          position="top-right"
          toastOptions={{
            className: 'rounded-md border border-border bg-popover text-popover-foreground shadow-lg',
          }}
        />
      </TooltipProvider>
    </BrowserRouter>
  );
}
