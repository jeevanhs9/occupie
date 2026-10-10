import React, { useState } from 'react';
import { StatCard } from '../../../components/ui/StatCard';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Input } from '../../../components/ui/Input';
import { OperationalDataStatus } from '../../../components/common/OperationalDataStatus';
import { useOperationalData } from '../../../hooks/useOperationalData';
import { TABLE_STATUS_CONFIG } from '../../../lib/constants';
import { MOCK_RESTAURANT_INFO } from '../../../services/mockData';
import {
  Users,
  Activity,
  Armchair,
  Clock,
  Sparkles,
  Sliders,
  FileSpreadsheet,
  RotateCcw,
} from 'lucide-react';

export function ManagerDashboard() {
  const { tables, reservations, waitlist, demoMode, loading, error, refresh, createTable } = useOperationalData();
  const [showEmptyState, setShowEmptyState] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [showAllocationRules, setShowAllocationRules] = useState(false);
  const [showTableForm, setShowTableForm] = useState(false);
  const [tableForm, setTableForm] = useState({ id: '', name: '', capacity: '2', section: 'Main Dining' });
  const [tableNotice, setTableNotice] = useState(null);

  const filteredTables = tables.filter((t) => {
    if (activeFilter === 'all') return true;
    return t.status === activeFilter;
  });

  const occupiedCount = tables.filter((t) => t.status === 'occupied').length;
  const availableCount = tables.filter((t) => t.status === 'available').length;
  const reservedCount = tables.filter((t) => t.status === 'reserved').length;
  const cleaningCount = tables.filter((t) => t.status === 'cleaning').length;
  const totalCapacity = tables.reduce((sum, table) => sum + table.capacity, 0);
  const activeCovers = tables.filter((table) => table.status === 'occupied').reduce((sum, table) => sum + (table.partySize || 0), 0);
  const occupancyRate = totalCapacity ? Math.round((activeCovers / totalCapacity) * 100) : 0;
  const activeReservations = reservations.filter((res) => !['cancelled', 'no_show'].includes(res.status));

  const exportShiftReport = () => {
    const rows = [
      ['Record', 'ID', 'Name', 'Party size', 'Table', 'Status'],
      ...tables.map((table) => ['Table', table.id, table.name, table.partySize || 0, '', table.status]),
      ...activeReservations.map((res) => ['Reservation', res.id, res.guestName, res.partySize, res.table || '', res.status]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\r\n');
    const objectUrl = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = 'occupie-shift-report.csv';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  };

  const handleCreateTable = async (event) => {
    event.preventDefault();
    const result = await createTable({
      id: tableForm.id.trim(),
      name: tableForm.name.trim(),
      capacity: Number(tableForm.capacity),
      section: tableForm.section.trim(),
      status: 'available',
    });
    if (!result.success) {
      setTableNotice(`Could not add table: ${result.error}`);
      return;
    }
    setTableNotice(`${result.data.table.name} was added as available.`);
    setTableForm({ id: '', name: '', capacity: '2', section: 'Main Dining' });
    setShowTableForm(false);
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Top Welcome & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Restaurant Operations Hub
            </h2>
            <Badge variant="navy" size="sm">Admin</Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Table utilization, reservation monitoring, and shift operations.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <Button size="sm" variant="secondary" onClick={() => setShowTableForm((show) => !show)} icon={Armchair}>
            {showTableForm ? 'Close Table Form' : 'Add Table'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowEmptyState(!showEmptyState)}
            icon={RotateCcw}
          >
            {showEmptyState ? (demoMode ? 'Show Preview Data' : 'Show Restaurant Data') : 'Preview Empty State'}
          </Button>

          <Button
            size="sm"
            variant="primary"
            onClick={() => setShowAllocationRules((show) => !show)}
            icon={Sliders}
          >
            {showAllocationRules ? 'Hide Seating Rules' : 'Seating Rules'}
          </Button>

          <Button
            size="sm"
            variant="accent"
            onClick={exportShiftReport}
            icon={FileSpreadsheet}
          >
            Export Shift Report
          </Button>
        </div>
      </div>

      <OperationalDataStatus loading={loading} error={error} onRetry={refresh} />

      {showTableForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add a Restaurant Table</CardTitle>
            <CardDescription>New tables start as available and can be managed by floor staff.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateTable} className="grid grid-cols-1 gap-4 sm:grid-cols-5 sm:items-end">
              <Input label="Table ID" value={tableForm.id} onChange={(event) => setTableForm((form) => ({ ...form, id: event.target.value }))} placeholder="T17" required maxLength={32} />
              <Input label="Display name" value={tableForm.name} onChange={(event) => setTableForm((form) => ({ ...form, name: event.target.value }))} placeholder="Table 17" required maxLength={80} />
              <Input label="Capacity" type="number" min="1" max="30" value={tableForm.capacity} onChange={(event) => setTableForm((form) => ({ ...form, capacity: event.target.value }))} required />
              <Input label="Section" value={tableForm.section} onChange={(event) => setTableForm((form) => ({ ...form, section: event.target.value }))} placeholder="Main Dining" required maxLength={80} />
              <Button type="submit" variant="accent" icon={Armchair}>Save Table</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {tableNotice && <div role="status" className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">{tableNotice}</div>}

      {showAllocationRules && (
        <div className="rounded-2xl border border-occupie-teal-200 bg-occupie-teal-50 p-4 text-sm text-occupie-navy-900">
          <h3 className="font-bold">Current deterministic allocation rules</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
            <li>Only available tables that fit the party are candidates.</li>
            <li>Confirmed bookings protect their table within a 90-minute window.</li>
            <li>The smallest suitable table is preferred; a requested section is honored when possible.</li>
            <li>Occupied-table clearing time is not predicted, so no wait time is guaranteed.</li>
          </ul>
        </div>
      )}

      {showEmptyState ? (
        <EmptyState
          title="No Active Tables or Operations Loaded"
          description="The restaurant is currently closed or has no table data. Load preview data or refresh the configured API."
          actionLabel={demoMode ? 'Show Preview Data' : 'Refresh Restaurant Data'}
          onAction={() => demoMode ? setShowEmptyState(false) : refresh()}
        />
      ) : (
        <>
          {/* 4 Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Occupancy Snapshot"
              value={`${demoMode ? MOCK_RESTAURANT_INFO.currentOccupancyRate : occupancyRate}%`}
              trend={demoMode ? 'up' : undefined}
              trendValue={demoMode ? '+14% peak' : undefined}
              subtitle={demoMode ? 'Demo service snapshot' : `${activeCovers} of ${totalCapacity} seats filled`}
              icon={Activity}
              accentColor="teal"
            />
            <StatCard
              title="Active Table Units"
              value={`${occupiedCount} / ${tables.length}`}
              trend="neutral"
              trendValue={`${availableCount} open`}
              subtitle={`${cleaningCount} cleaning · ${reservedCount} reserved`}
              icon={Armchair}
              accentColor="cyan"
            />
            <StatCard
              title={demoMode ? 'Covers Seated Today' : 'Covers Currently Seated'}
              value={demoMode ? MOCK_RESTAURANT_INFO.activeCovers : activeCovers}
              trend="up"
              trendValue={demoMode ? '+28 bookings' : undefined}
              subtitle={demoMode ? 'Demo service snapshot' : `${activeReservations.length} active reservations`}
              icon={Users}
              accentColor="indigo"
            />
            <StatCard
              title="Avg Dining Turnaround"
              value={demoMode ? `${MOCK_RESTAURANT_INFO.avgTurnaroundMinutes} min` : '—'}
              trend={demoMode ? 'down' : undefined}
              trendValue={demoMode ? '-8m vs avg' : undefined}
              subtitle={demoMode ? 'Demo service snapshot' : 'Not enough persisted seating history'}
              icon={Clock}
              accentColor="amber"
            />
          </div>

          {/* Table Occupancy Visualization */}
          <Card id="tables" className="scroll-mt-24">
            <CardHeader
              action={
                <div className="flex items-center gap-1.5 flex-wrap">
                  {['all', 'available', 'occupied', 'cleaning', 'reserved'].map((status) => (
                    <button
                      key={status}
                      type="button"
                      aria-pressed={activeFilter === status}
                      onClick={() => setActiveFilter(status)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-medium capitalize transition-all ${
                        activeFilter === status
                          ? 'bg-occupie-navy-900 text-white font-semibold'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              }
            >
              <CardTitle>Floor Plan & Table Status Grid</CardTitle>
              <CardDescription>
                {demoMode ? 'Preview of table status by dining section.' : 'Current table status from the configured restaurant API.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredTables.length ? <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-8 gap-3">
                {filteredTables.map((table) => {
                  const statusMeta = TABLE_STATUS_CONFIG[table.status] || TABLE_STATUS_CONFIG.available;
                  return (
                    <div
                      key={table.id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all flex flex-col justify-between min-h-[110px]"
                    >
                      <div className="flex items-start justify-between">
                        <span className="font-bold text-slate-900 text-sm">{table.name}</span>
                        <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                          {table.capacity}p
                        </span>
                      </div>

                      <div className="space-y-1 my-2">
                        <div className="text-[11px] text-slate-500 truncate" title={table.section}>
                          {table.section}
                        </div>
                        {table.timeSeated && (
                          <div className="text-[10px] text-slate-400">
                            Seated {table.timeSeated}
                          </div>
                        )}
                      </div>

                      <div className="pt-1 border-t border-slate-100 flex items-center justify-between">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusMeta.badgeClass}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dotClass}`} />
                          {statusMeta.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div> : <EmptyState
                title={tables.length ? 'No tables match this filter' : 'No tables have been added'}
                description={tables.length ? 'Choose another status filter to see tables.' : 'Add the restaurant tables to start managing service.'}
                actionLabel={!tables.length ? 'Add a table' : undefined}
                onAction={!tables.length ? () => setShowTableForm(true) : undefined}
              />}
            </CardContent>
          </Card>

          {/* Recent Reservations & Operational Overrides */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Reservations List */}
            <div className="lg:col-span-2">
              <Card id="reservations" className="scroll-mt-24">
                <CardHeader
                  action={
                    <Badge variant="teal" size="sm">
                      {activeReservations.length} Active Today
                    </Badge>
                  }
                >
                  <CardTitle>Recent & Upcoming Reservations</CardTitle>
                  <CardDescription>
                    Bookings allocated for the current evening service.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-slate-100">
                    {activeReservations.map((res) => (
                      <div key={res.id} className="p-4 sm:px-6 flex items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0">
                            {res.time}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">{res.guestName}</p>
                            <p className="text-xs text-slate-500">
                              Party of {res.partySize} &bull; Assigned to <strong className="text-slate-700">{res.table}</strong>
                            </p>
                            {res.notes && (
                              <p className="text-[11px] text-slate-400 italic truncate mt-0.5">{res.notes}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="success" size="sm" dot={true}>
                            {res.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Operational alerts and current allocation notes */}
            <div className="space-y-6">
              <Card id="reports" className="scroll-mt-24">
                <CardHeader>
                  <CardTitle>Operational Alerts</CardTitle>
                  <CardDescription>
                    Conditions that may need attention during service.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {waitlist.length > 0 && (
                    <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                      {waitlist.length} {waitlist.length === 1 ? 'party is' : 'parties are'} waiting; {availableCount} tables are currently available.
                    </p>
                  )}
                  {cleaningCount > 0 && (
                    <p className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900">
                      {cleaningCount} {cleaningCount === 1 ? 'table needs' : 'tables need'} cleaning before seating.
                    </p>
                  )}
                  {waitlist.length === 0 && cleaningCount === 0 && (
                    <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">No active service alerts.</p>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-occupie-navy-950 to-slate-900 text-white border-occupie-navy-800">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center gap-2 text-occupie-teal-400 font-bold text-xs uppercase tracking-wider">
                    <Sparkles className="w-4 h-4" />
                    Service Data Note
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {demoMode ? 'Metrics and records use labeled preview fixtures. Changes reset when this page reloads.' : 'Tables, reservations, and the waitlist come from the configured API. Historical revenue and reliable turnover estimates are not available yet.'}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ManagerDashboard;
