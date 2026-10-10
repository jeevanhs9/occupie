import React from 'react';
import { AlertCircle, LoaderCircle, RefreshCw } from 'lucide-react';
import { DATA_MODE } from '../../services/api';

export function OperationalDataStatus({ loading, error, onRetry }) {
  if (loading) {
    return (
      <div role="status" className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
        <LoaderCircle className="h-4 w-4 animate-spin" />
        Loading restaurant data…
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 sm:flex-row sm:items-center sm:justify-between">
        <span className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </span>
        <button type="button" onClick={onRetry} className="inline-flex items-center gap-1.5 font-semibold hover:underline">
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </button>
      </div>
    );
  }

  if (DATA_MODE === 'api') return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900">
      Preview data is in use. Changes are temporary and reset when this page reloads.
    </div>
  );
}

export default OperationalDataStatus;
