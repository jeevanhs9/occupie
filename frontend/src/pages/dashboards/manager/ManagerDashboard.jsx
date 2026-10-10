import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { PageEntrance } from '../../../components/ui/PageEntrance';
import { RoyalKPICard } from '../../../components/dashboard/RoyalKPICard';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Input } from '../../../components/ui/Input';
import { OperationalDataStatus } from '../../../components/common/OperationalDataStatus';
import { FloorPlan } from '../../../components/dashboard/FloorPlan';
import { useOperationalData } from '../../../hooks/useOperationalData';
import { MOCK_RESTAURANT_INFO } from '../../../services/mockData';
import { nextSeatableWaitlistEntry } from '../../../services/allocation';
import {
  Users,
  Activity,
  Armchair,
  Clock,
  Sparkles,
  Sliders,
  FileSpreadsheet,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';

export function ManagerDashboard() {
  const { 
    tables, 
    reservations, 
    waitlist, 
    demoMode, 
    loading, 
    error, 
    refresh, 
    createTable,
    updateTableStatus,
    seatWaitlistEntry,
    updateWaitlistStatus,
  } = useOperationalData();
  const [showEmptyState, setShowEmptyState] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [showAllocationRules, setShowAllocationRules] = useState(false);
  const [showTableForm, setShowTableForm] = useState(false);
  const [tableForm, setTableForm] = useState({ id: '', name: '', capacity: '2', section: 'Main Dining' });
  const [tableNotice, setTableNotice] = useState(null);
  const [actionNotice, setActionNotice] = useState(null);
  const [pendingActions, setPendingActions] = useState(new Set());
  const shouldReduceMotion = useReducedMotion();

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
  const seatingRecommendation = nextSeatableWaitlistEntry({ waitlist, tables, reservations });

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

  const runAction = async (key, action) => {
    if (pendingActions.has(key)) return;
    setPendingActions((current) => new Set(current).add(key));
    try {
      await action();
    } finally {
      setPendingActions((current) => {
        const updated = new Set(current);
        updated.delete(key);
        return updated;
      });
    }
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

  const handleTableStatusChange = (tableId, newStatus) => runAction(`table:${tableId}`, async () => {
    const result = await updateTableStatus(tableId, newStatus);
    if (result.success) {
      setActionNotice({ type: 'success', message: `Table ${tableId} status updated to ${newStatus}.` });
      setTimeout(() => setActionNotice(null), 3000);
    } else {
      setActionNotice({ type: 'error', message: `Failed to update table: ${result.error}` });
      setTimeout(() => setActionNotice(null), 5000);
    }
  });

  const handleSeatWaitlistEntry = (entryId) => runAction(`waitlist:${entryId}`, async () => {
    const entry = waitlist.find((e) => e.id === entryId);
    const result = await seatWaitlistEntry(entryId);
    if (result.success) {
      setActionNotice({ 
        type: 'success', 
        message: `Seated ${entry?.partyName || 'party'} at table ${result.data.table?.id || result.data.table?.name || 'assigned'}.` 
      });
      setTimeout(() => setActionNotice(null), 3000);
    } else {
      setActionNotice({ type: 'error', message: `Could not seat party: ${result.error}` });
      setTimeout(() => setActionNotice(null), 5000);
    }
  });

  const handleCancelWaitlistEntry = (entryId) => runAction(`waitlist-cancel:${entryId}`, async () => {
    const entry = waitlist.find((e) => e.id === entryId);
    const result = await updateWaitlistStatus(entryId, 'cancelled');
    if (result.success) {
      setActionNotice({ 
        type: 'success', 
        message: `Removed ${entry?.partyName || 'party'} from waitlist.` 
      });
      setTimeout(() => setActionNotice(null), 3000);
    } else {
      setActionNotice({ type: 'error', message: `Could not remove party: ${result.error}` });
      setTimeout(() => setActionNotice(null), 5000);
    }
  });

  return (
    <PageEntrance className="space-y-6 sm:space-y-8 bg-occupie-cream min-h-screen">
      {/* Royal Header */}
      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <motion.div 
            initial={shouldReduceMotion ? false : { opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex items-center gap-3 mb-2"
          >
            <h1 className="royal-heading royal-heading-xl">Restaurant Operations</h1>
            <Badge variant="navy" size="sm" className="bg-occupie-burgundy-700 text-occupie-ivory border-occupie-burgundy-600">
              Manager
            </Badge>
          </motion.div>
          <motion.p
            initial={shouldReduceMotion ? false : { opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="royal-body text-occupie-taupe flex items-center gap-2"
          >
            Intelligent seating allocation and real-time service monitoring
            {demoMode && (
              <Badge variant="outline" size="sm" className="bg-amber-50 text-amber-700 border-amber-200">
                Preview Mode
              </Badge>
            )}
            {!demoMode && !loading && (
              <Badge variant="outline" size="sm" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                Live Data
              </Badge>
            )}
          </motion.p>
        </div>

        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex items-center flex-wrap gap-2.5"
        >
          <Button size="sm" variant="secondary" onClick={() => setShowTableForm((show) => !show)} icon={Armchair}>
            {showTableForm ? 'Close' : 'Add Table'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowEmptyState(!showEmptyState)}
            icon={RotateCcw}
          >
            {showEmptyState ? (demoMode ? 'Show Preview' : 'Show Data') : 'Preview Empty'}
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={() => setShowAllocationRules((show) => !show)}
            icon={Sliders}
          >
            Seating Rules
          </Button>
          <Button
            size="sm"
            variant="accent"
            onClick={exportShiftReport}
            icon={FileSpreadsheet}
          >
            Export Report
          </Button>
        </motion.div>
      </motion.div>

      <OperationalDataStatus loading={loading} error={error} onRetry={refresh} />

      {/* Data Source Status Panel */}
      {!showEmptyState && (
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
          className={`royal-card-emphasis p-4 ${demoMode ? 'bg-gradient-to-br from-amber-900/20 to-amber-800/20 border-amber-600/30' : 'bg-gradient-to-br from-emerald-900/20 to-emerald-800/20 border-emerald-600/30'}`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${demoMode ? 'bg-amber-500/20' : 'bg-emerald-500/20'}`}>
                {demoMode ? (
                  <Sparkles className="w-5 h-5 text-amber-300" />
                ) : (
                  <Activity className="w-5 h-5 text-emerald-300" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-occupie-ivory mb-1">
                  {demoMode ? 'Preview Data Mode' : 'Live Restaurant Data'}
                </h3>
                <p className="text-xs text-occupie-ivory/70 leading-relaxed">
                  {demoMode ? (
                    <>
                      Using labeled preview fixtures. Metrics include demo occupancy rate ({MOCK_RESTAURANT_INFO.currentOccupancyRate}%), 
                      covers seated ({MOCK_RESTAURANT_INFO.activeCovers}), and turnaround time ({MOCK_RESTAURANT_INFO.avgTurnaroundMinutes} min). 
                      Changes reset on page reload.
                    </>
                  ) : (
                    <>
                      Connected to Flask backend at <code className="px-1 py-0.5 rounded bg-occupie-walnut-900/50 text-emerald-300 text-xs">
                        {import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1'}
                      </code>. 
                      Showing {tables.length} tables, {activeReservations.length} active reservations, and {waitlist.length} waitlist {waitlist.length === 1 ? 'entry' : 'entries'}. 
                      {totalCapacity === 0 && ' No table capacity configured yet.'}
                    </>
                  )}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={refresh}
              className="text-occupie-ivory/80 hover:text-occupie-ivory hover:bg-white/10"
              disabled={demoMode || loading}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </motion.div>
      )}

      {showTableForm && (
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="royal-card">
            <CardHeader>
              <CardTitle className="royal-heading royal-heading-md">Add a Restaurant Table</CardTitle>
              <CardDescription className="royal-body text-occupie-taupe">
                New tables start as available and can be managed by floor staff.
              </CardDescription>
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
        </motion.div>
      )}

      {tableNotice && (
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          role="status"
          className="royal-alert royal-alert-success"
        >
          {tableNotice}
        </motion.div>
      )}

      {actionNotice && (
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          role="status"
          className={`royal-alert ${actionNotice.type === 'success' ? 'royal-alert-success' : 'royal-alert-error'}`}
        >
          {actionNotice.message}
        </motion.div>
      )}

      {showAllocationRules && (
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          className="royal-alert royal-alert-info"
        >
          <h3 className="font-bold mb-2 text-occupie-burgundy-700">Current Deterministic Allocation Rules</h3>
          <ul className="space-y-2 text-xs leading-relaxed">
            <li className="flex gap-2">
              <span className="text-occupie-brass-500">•</span>
              <span>Only available tables that fit the party are candidates.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-occupie-brass-500">•</span>
              <span>Confirmed bookings protect their table within a 90-minute window.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-occupie-brass-500">•</span>
              <span>The smallest suitable table is preferred; a requested section is honored when possible.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-occupie-brass-500">•</span>
              <span>Occupied-table clearing time is not predicted, so no wait time is guaranteed.</span>
            </li>
          </ul>
        </motion.div>
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
          {/* Royal KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <RoyalKPICard
              title="Occupancy Snapshot"
              value={`${occupancyRate}%`}
              trend={demoMode ? 'up' : undefined}
              trendValue={demoMode ? '+14% vs peak' : undefined}
              subtitle={demoMode 
                ? 'Demo service snapshot' 
                : totalCapacity > 0 
                  ? `${activeCovers} of ${totalCapacity} seats filled`
                  : 'No table capacity configured'
              }
              icon={Activity}
              accentColor="brass"
              delay={0}
            />
            <RoyalKPICard
              title="Active Table Units"
              value={`${occupiedCount}/${tables.length || '0'}`}
              trend={availableCount > 0 ? 'neutral' : undefined}
              trendValue={availableCount > 0 ? `${availableCount} available` : undefined}
              subtitle={tables.length > 0 
                ? `${cleaningCount} cleaning · ${reservedCount} reserved`
                : 'No tables added yet'
              }
              icon={Armchair}
              accentColor="burgundy"
              delay={0.05}
            />
            <RoyalKPICard
              title="Covers Currently Seated"
              value={activeCovers}
              trend={demoMode ? 'up' : undefined}
              trendValue={demoMode ? '+28 bookings' : undefined}
              subtitle={demoMode 
                ? 'Demo service snapshot' 
                : activeReservations.length > 0
                  ? `${activeReservations.length} active ${activeReservations.length === 1 ? 'reservation' : 'reservations'}`
                  : 'No active reservations'
              }
              icon={Users}
              accentColor="sage"
              delay={0.1}
            />
            <RoyalKPICard
              title="Avg Dining Turnaround"
              value={demoMode ? `${MOCK_RESTAURANT_INFO.avgTurnaroundMinutes} min` : '—'}
              trend={demoMode ? 'down' : undefined}
              trendValue={demoMode ? '-8m vs avg' : undefined}
              subtitle={demoMode 
                ? 'Demo service snapshot' 
                : 'Requires seated → cleared timestamp history'
              }
              icon={Clock}
              accentColor="amber"
              delay={0.15}
            />
          </div>

          {/* Royal Operations Grid: Waitlist & Recommendation */}
          <div className="royal-operations-grid">
            {/* Waitlist Panel */}
            <motion.section
              initial={shouldReduceMotion ? false : { opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="royal-panel"
              aria-labelledby="manager-queue-title"
            >
              <div className="royal-panel-header">
                <div>
                  <p className="royal-panel-kicker">Front of House</p>
                  <h3 id="manager-queue-title" className="royal-panel-title">Waiting List</h3>
                </div>
                <span className="royal-panel-badge">
                  {waitlist.length} {waitlist.length === 1 ? 'party' : 'parties'}
                </span>
              </div>
              
              {waitlist.length ? (
                <div className="royal-waitlist">
                  {waitlist.slice(0, 5).map((entry, index) => {
                    const isSeatable = seatingRecommendation.entry?.id === entry.id && seatingRecommendation.table;
                    const isPending = pendingActions.has(`waitlist:${entry.id}`) || pendingActions.has(`waitlist-cancel:${entry.id}`);
                    
                    return (
                      <motion.div
                        key={entry.id}
                        initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.4 + index * 0.05 }}
                        className="royal-waitlist-entry"
                      >
                        <span className="royal-waitlist-position">{String(index + 1).padStart(2, '0')}</span>
                        <div className="flex-1">
                          <span className="royal-waitlist-name">{entry.partyName}</span>
                          <span className="royal-waitlist-size">{entry.partySize} guests</span>
                        </div>
                        {entry.status === 'ready' && (
                          <span className="royal-waitlist-status">Ready</span>
                        )}
                        <span className="royal-waitlist-wait">{entry.waitMinutes ?? '—'} min</span>
                        
                        {!demoMode && (
                          <div className="flex items-center gap-2 ml-2">
                            {isSeatable && (
                              <Button
                                size="xs"
                                variant="accent"
                                onClick={() => handleSeatWaitlistEntry(entry.id)}
                                disabled={isPending}
                                className="text-xs px-2 py-1"
                              >
                                {isPending ? 'Seating...' : 'Seat'}
                              </Button>
                            )}
                            <Button
                              size="xs"
                              variant="ghost"
                              onClick={() => handleCancelWaitlistEntry(entry.id)}
                              disabled={isPending}
                              className="text-xs px-2 py-1 text-occupie-taupe hover:text-red-600"
                            >
                              Remove
                            </Button>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <p className="royal-panel-empty">The waitlist is clear.</p>
              )}
              
              {demoMode ? (
                <p className="royal-recommendation-note">Preview queue data • changes won't persist</p>
              ) : (
                waitlist.length === 0 && (
                  <p className="royal-recommendation-note">Live waitlist is empty</p>
                )
              )}
            </motion.section>

            {/* Recommendation Panel */}
            <motion.section
              initial={shouldReduceMotion ? false : { opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.35 }}
              className="royal-recommendation"
              aria-labelledby="manager-recommendation-title"
            >
              <div className="royal-panel-header">
                <div>
                  <p className="royal-panel-kicker">Intelligent Allocation</p>
                  <h3 id="manager-recommendation-title" className="royal-panel-title">Next Suitable Seating</h3>
                </div>
                <span className="royal-recommendation-mark" aria-hidden="true">✦</span>
              </div>
              
              {seatingRecommendation.entry && seatingRecommendation.table ? (
                <motion.div
                  initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: 0.5 }}
                >
                  <p className="royal-recommendation-party">{seatingRecommendation.entry.partyName}</p>
                  <div className="mb-3">
                    <p className="royal-recommendation-table">{seatingRecommendation.table.name}</p>
                    <p className="royal-recommendation-details">
                      {seatingRecommendation.table.section} · {seatingRecommendation.table.capacity} seats · Party of {seatingRecommendation.entry.partySize}
                    </p>
                  </div>
                  <p className="royal-recommendation-reason">{seatingRecommendation.reason}</p>
                </motion.div>
              ) : (
                <p className="royal-panel-empty">{seatingRecommendation.reason}</p>
              )}
              
              <p className="royal-recommendation-note">
                {demoMode ? 'Preview recommendation · no table was assigned' : 'Suggestion only · confirm to assign table'}
              </p>
            </motion.section>
          </div>

          {/* Royal Floor Plan */}
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card id="tables" className="scroll-mt-24 royal-floor-container border-occupie-brass-300/20">
              <CardHeader
                action={
                  <div className="royal-floor-filters">
                    {['all', 'available', 'occupied', 'cleaning', 'reserved'].map((status) => (
                      <button
                        key={status}
                        type="button"
                        aria-pressed={activeFilter === status}
                        onClick={() => setActiveFilter(status)}
                        className={`royal-filter-button ${activeFilter === status ? 'active' : ''}`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                }
              >
                <CardTitle className="royal-heading royal-heading-md">Restaurant Floor Plan</CardTitle>
                <CardDescription className="royal-body text-occupie-taupe">
                  {demoMode ? 'Preview of table status by dining section.' : 'Live table status from restaurant operations.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredTables.length ? (
                  <FloorPlan 
                    tables={filteredTables} 
                    onStatusChange={handleTableStatusChange}
                    isPending={(tableId) => pendingActions.has(`table:${tableId}`)}
                  />
                ) : (
                  <EmptyState
                    title={tables.length ? 'No tables match this filter' : 'No tables have been added'}
                    description={tables.length ? 'Choose another status filter to see tables.' : 'Add the restaurant tables to start managing service.'}
                    actionLabel={!tables.length ? 'Add a table' : undefined}
                    onAction={!tables.length ? () => setShowTableForm(true) : undefined}
                  />
                )}
              </CardContent>
            </Card>
          </motion.div>

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
    </PageEntrance>
  );
}

export default ManagerDashboard;
