import * as React from 'react';
import { Link } from 'react-router-dom';
import { Compass, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useDocumentTitle } from '@/hooks/useApi';

export function NotFoundPage(): React.ReactElement {
  useDocumentTitle('Not found');
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full">
        <CardContent className="p-10 text-center space-y-4">
          <div className="inline-flex h-12 w-12 rounded-lg ring-grad items-center justify-center text-white shadow-glow mx-auto">
            <Compass className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">404</h1>
            <p className="text-sm text-muted-foreground mt-2">
              The page you're looking for doesn't exist or has been moved.
            </p>
          </div>
          <Button asChild variant="brand">
            <Link to="/">
              <Home className="h-4 w-4" /> Back to dashboard
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
