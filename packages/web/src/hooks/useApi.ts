import * as React from 'react';

interface FetchState<T> {
  data: T | null;
  error: Error | null;
  loading: boolean;
}

export function useApi<T>(
  fetcher: () => Promise<T>,
  deps: React.DependencyList = [],
): FetchState<T> & { refetch: () => void } {
  const [state, setState] = React.useState<FetchState<T>>({
    data: null,
    error: null,
    loading: true,
  });

  const fetcherRef = React.useRef(fetcher);
  fetcherRef.current = fetcher;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const memoFetcher = React.useCallback(() => fetcherRef.current(), []);

  const execute = React.useCallback(() => {
    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    memoFetcher()
      .then((data) => {
        if (!cancelled) setState({ data, error: null, loading: false });
      })
      .catch((err) => {
        if (!cancelled) {
          setState({
            data: null,
            error: err instanceof Error ? err : new Error(String(err)),
            loading: false,
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [memoFetcher]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(execute, deps);

  return { ...state, refetch: execute };
}

export function useInterval(callback: () => void, delayMs: number | null) {
  const savedCallback = React.useRef(callback);
  React.useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);
  React.useEffect(() => {
    if (delayMs == null) return;
    const id = setInterval(() => savedCallback.current(), delayMs);
    return () => clearInterval(id);
  }, [delayMs]);
}

export function useDocumentTitle(title: string) {
  React.useEffect(() => {
    document.title = `${title} | Open SEO Checker`;
  }, [title]);
}
