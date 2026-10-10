import React, { useState } from 'react';
import { PageEntrance } from '../../../components/ui/PageEntrance';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/Card';
import { StatCard } from '../../../components/ui/StatCard';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { OperationalDataStatus } from '../../../components/common/OperationalDataStatus';
import { useOperationalData } from '../../../hooks/useOperationalData';
import { useRole } from '../../../hooks/useRole';
import { TABLE_STATUS, TABLE_STATUS_CONFIG } from '../../../lib/constants';
import {
  Sparkles,
  Armchair,
  CheckCircle2,
  Coffee,
  RotateCw,
  Clock,
  UserCheck,
  AlertCircle,
} from 'lucide-react';

export function FloorStaffDashboard() {
  const { tables, loading, error, refresh, updateTableStatus, demoMode } = useOperationalData();
  const { user, isDemoMode } = useRole();
  const [filterMode, setFilterMode] = useState('assigned'); // 'assigned' | 'all'
  const [lastAction, setLastAction] = useState(null);
  const [partySizes, setPartySizes] = useState({});
  const [pendingTableId, setPendingTableId] = useState(null);

  const assignedServer = isDemoMode ? 'Marco R.' : (user?.name || '');

  const handleUpdateStatus = async (tableId, nextStatus, partySize) => {
    if (pendingTableId) return;
    setPendingTableId(tableId);
    const result = await updateTableStatus(tableId, nextStatus, partySize);
    setLastAction(result.success
      ? { type: 'success', message: `Updated ${tableId} to "${TABLE_STATUS_CONFIG[nextStatus].label}".` }
      : { type: 'error', message: `Could not update ${tableId}: ${result.error}` });
    setPendingTableId(null);
  };

  const displayedTables = filterMode === 'assigned'
    ? tables.filter((t) => t.assignedServer === assignedServer)
    : tables;

  const occupiedCount = displayedTables.filter((t) => t.status === 'occupied').length;
  const cleaningCount = displayedTables.filter((t) => t.status === 'cleaning').length;
  const availableCount = displayedTables.filter((t) => t.status === 'available').length;

  return (
    <PageEntrance className="space-y-6 sm:space-y-8">
      {/* Top Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Floor Staff & Table Turnover
            </h2>
            <Badge variant="warning" size="sm">My Station &bull; {user?.name || assignedServer || 'No staff assignment'}</Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Tap table controls below to quickly update dining, clearing, and ready status.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-white p-1 rounded-xl border border-slate-200 flex items-center gap-1 shadow-xs">
            <button
              onClick={() => setFilterMode('assigned')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterMode === 'assigned'
                  ? 'bg-occupie-navy-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              My Station ({tables.filter(t => t.assignedServer === assignedServer).length})
            </button>
            {isDemoMode && <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterMode === 'all'
                  ? 'bg-occupie-navy-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Tables ({tables.length})
            </button>}
          </div>
        </div>
      </div>

      <div id="service-updates" className="scroll-mt-24">
        <OperationalDataStatus loading={loading} error={error} onRetry={refresh} />
        {lastAction && (
          <div role={lastAction.type === 'error' ? 'alert' : 'status'} className={`mt-3 p-3 rounded-xl text-xs font-medium flex items-center justify-between shadow-md ${lastAction.type === 'error' ? 'bg-rose-800 text-white' : 'bg-slate-900 text-white'}`}>
            <div className="flex items-center gap-2">
              {lastAction.type === 'error' ? <AlertCircle className="w-4 h-4 text-rose-200" aria-hidden="true" /> : <CheckCircle2 className="w-4 h-4 text-occupie-teal-400" aria-hidden="true" />}
              <span>{lastAction.message}</span>
            </div>
            <span className="text-[10px] text-slate-400">{demoMode ? 'Demo preview' : 'Restaurant data'}</span>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Active Dining Tables"
          value={occupiedCount}
          subtitle="Currently seated with guests"
          icon={Coffee}
          accentColor="cyan"
        />
        <StatCard
          title="Turnover / Cleaning Required"
          value={cleaningCount}
          subtitle="Priority turnaround targets"
          icon={Sparkles}
          accentColor="amber"
        />
        <StatCard
          title="Ready For Guests"
          value={availableCount}
          subtitle="Sanitized and set"
          icon={Armchair}
          accentColor="teal"
        />
      </div>

      {/* Table Cards Grid with Fast Status Action Buttons */}
      <Card id="assigned-tables" className="scroll-mt-24">
        <CardHeader
          action={
            <span className="text-xs text-slate-500 font-medium">
              Click status pills to cycle table states
            </span>
          }
        >
          <CardTitle>
            {filterMode === 'assigned' ? 'Station A — Assigned Tables' : 'Full Restaurant Floor Overview'}
          </CardTitle>
          <CardDescription>
            Instant touch-optimized buttons designed for handheld staff tablets.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div id="table-status" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 scroll-mt-24">
            {!loading && !error && displayedTables.length === 0 ? (
              <div className="col-span-full rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center" role="status">
                <Armchair className="mx-auto mb-3 h-8 w-8 text-slate-400" aria-hidden="true" />
                <h3 className="font-semibold text-slate-800">
                  {tables.length ? 'No tables are assigned to your station' : 'No tables are configured yet'}
                </h3>
                <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                  {tables.length
                    ? 'Your manager has not assigned tables to your account. You can view the full floor while you wait.'
                    : 'Ask a manager to add restaurant tables before updating service status.'}
                </p>
                {tables.length > 0 && filterMode === 'assigned' && (
                  <Button type="button" size="sm" variant="outline" className="mt-4" onClick={() => setFilterMode('all')}>
                    View all tables
                  </Button>
                )}
              </div>
            ) : displayedTables.map((table) => {
              const statusMeta = TABLE_STATUS_CONFIG[table.status] || TABLE_STATUS_CONFIG.available;

              return (
                <div
                  key={table.id}
                  className="p-5 rounded-2xl border border-slate-200/90 bg-white hover:border-slate-300 shadow-xs hover:shadow-card transition-all flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-slate-900">{table.name}</span>
                        <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          {table.capacity} seats
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{table.section}</p>
                    </div>

                    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${statusMeta.badgeClass}`}>
                      <span className={`w-2 h-2 rounded-full ${statusMeta.dotClass}`} />
                      {statusMeta.label}
                    </span>
                  </div>

                  <div className="py-4 my-2 border-y border-slate-100 flex items-center justify-between text-xs text-slate-600">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Assigned Server</span>
                      <span className="font-semibold text-slate-800">{table.assignedServer}</span>
                    </div>
                    {table.status === 'occupied' && (
                      <div className="text-right">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Party Size</span>
                        <span className="font-semibold text-slate-800">{table.partySize} guests ({table.timeSeated})</span>
                      </div>
                    )}
                  </div>

                  {/* Status Toggle Action Buttons */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Update State:
                    </span>
                    {table.status === TABLE_STATUS.AVAILABLE && (
                      <label className="mb-2 flex items-center gap-2 text-[11px] font-medium text-slate-600">
                        Party size
                        <input
                          aria-label={`Party size for ${table.name}`}
                          type="number"
                          min="1"
                          max={table.capacity}
                          value={partySizes[table.id] || Math.min(2, table.capacity)}
                          onChange={(event) => setPartySizes((current) => ({ ...current, [table.id]: event.target.value }))}
                          className="w-16 rounded-lg border border-slate-300 px-2 py-1 text-xs focus:border-occupie-cyan-500 focus:outline-none focus:ring-2 focus:ring-occupie-cyan-500/30"
                        />
                        <span>of {table.capacity} seats</span>
                      </label>
                    )}
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(table.id, TABLE_STATUS.AVAILABLE)}
                        disabled={pendingTableId === table.id || (table.status !== TABLE_STATUS.CLEANING && table.status !== TABLE_STATUS.AVAILABLE)}
                        className={`text-[11px] font-bold py-1.5 px-2 rounded-lg border transition-all ${
                          table.status === TABLE_STATUS.AVAILABLE
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                        }`}
                      >
                        Available
                      </button>

                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(table.id, TABLE_STATUS.OCCUPIED, Number(partySizes[table.id] || Math.min(2, table.capacity)))}
                        disabled={pendingTableId === table.id || table.status !== TABLE_STATUS.AVAILABLE}
                        className={`text-[11px] font-bold py-1.5 px-2 rounded-lg border transition-all ${
                          table.status === TABLE_STATUS.OCCUPIED
                            ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                            : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                        }`}
                      >
                        Occupied
                      </button>

                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(table.id, TABLE_STATUS.CLEANING)}
                        disabled={pendingTableId === table.id || table.status === TABLE_STATUS.CLEANING || table.status === TABLE_STATUS.RESERVED}
                        className={`text-[11px] font-bold py-1.5 px-2 rounded-lg border transition-all ${
                          table.status === TABLE_STATUS.CLEANING
                            ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                            : 'bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100'
                        }`}
                      >
                        Cleaning
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </PageEntrance>
  );
}

export default FloorStaffDashboard;
