import React, { useState } from 'react';
import { Armchair, Clock3, MapPin } from 'lucide-react';
import { TABLE_STATUS_CONFIG } from '../../lib/constants';

/** A section-grouped service map built only from table fields supplied by Occupie. */
export function FloorPlan({ tables = [], className = '', onStatusChange = null, isPending = null }) {
  const [selectedId, setSelectedId] = useState(null);
  const selectedTable = tables.find((table) => table.id === selectedId) || tables[0] || null;
  const sections = tables.reduce((grouped, table) => {
    const label = table.section?.trim() || 'Unassigned section';
    if (!grouped.has(label)) grouped.set(label, []);
    grouped.get(label).push(table);
    return grouped;
  }, new Map());
  const statusMeta = selectedTable
    ? (TABLE_STATUS_CONFIG[selectedTable.status] || TABLE_STATUS_CONFIG.available)
    : null;

  return (
    <div className={`floor-plan-layout ${className}`.trim()}>
      <div className="floor-plan-board" role="region" aria-label="Restaurant tables grouped by service section">
        <div className="floor-plan-board-heading">
          <div>
            <p className="floor-plan-kicker">Service map</p>
            <p className="floor-plan-caption">Tables are grouped by their configured section. Select a table for its current details.</p>
          </div>
          <span className="floor-plan-total">{tables.length} tables</span>
        </div>

        {tables.length ? (
          <div className="floor-plan-sections">
            {[...sections.entries()].map(([section, sectionTables]) => (
              <section key={section} className="floor-plan-section" aria-label={section}>
                <div className="floor-plan-section-heading">
                  <span><MapPin size={13} aria-hidden="true" /> {section}</span>
                  <span>{sectionTables.length}</span>
                </div>
                <div className="floor-plan-tables">
                  {sectionTables.map((table) => {
                    const tableStatus = TABLE_STATUS_CONFIG[table.status] || TABLE_STATUS_CONFIG.available;
                    const isSelected = selectedTable?.id === table.id;
                    return (
                      <button
                        key={table.id}
                        type="button"
                        className={`floor-table floor-table--${table.status} ${isSelected ? 'is-selected' : ''}`}
                        aria-label={`${table.name}, ${table.capacity} seats, ${tableStatus.label}, ${section}`}
                        aria-pressed={isSelected}
                        onClick={() => setSelectedId(table.id)}
                      >
                        <span className="floor-table-topline">
                          <Armchair size={14} aria-hidden="true" />
                          <span>{table.capacity} seats</span>
                        </span>
                        <strong>{table.name}</strong>
                        <span className="floor-table-status">
                          <i className={`floor-status-marker floor-status-marker--${table.status}`} aria-hidden="true" />
                          {tableStatus.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="floor-plan-empty">No table data is available for this view.</div>
        )}
      </div>

      <aside className="floor-plan-detail" aria-live="polite" aria-label="Selected table details">
        {selectedTable && statusMeta ? (
          <>
            <p className="floor-plan-kicker">Selected table</p>
            <h3>{selectedTable.name}</h3>
            <span className={`floor-detail-status floor-detail-status--${selectedTable.status}`}>
              <i className={`floor-status-marker floor-status-marker--${selectedTable.status}`} aria-hidden="true" />
              {statusMeta.label}
            </span>
            <dl>
              <div><dt>Section</dt><dd>{selectedTable.section || 'Not assigned'}</dd></div>
              <div><dt>Capacity</dt><dd>{selectedTable.capacity} guests</dd></div>
              {selectedTable.status === 'occupied' && selectedTable.partySize > 0 && (
                <div><dt>Party seated</dt><dd>{selectedTable.partySize} guests</dd></div>
              )}
              {selectedTable.timeSeated && (
                <div><dt>Seated at</dt><dd><Clock3 size={13} aria-hidden="true" /> {selectedTable.timeSeated}</dd></div>
              )}
            </dl>
            
            {onStatusChange && (
              <div className="mt-4 space-y-2">
                <p className="floor-plan-kicker">Change Status</p>
                <div className="grid grid-cols-2 gap-2">
                  {['available', 'occupied', 'reserved', 'cleaning'].map((status) => {
                    const isActive = selectedTable.status === status;
                    const actionPending = isPending && isPending(selectedTable.id);
                    return (
                      <button
                        key={status}
                        type="button"
                        onClick={() => !isActive && onStatusChange(selectedTable.id, status)}
                        disabled={isActive || actionPending}
                        className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                          isActive 
                            ? 'bg-occupie-burgundy-100 text-occupie-burgundy-700 border-occupie-burgundy-300 cursor-default'
                            : 'bg-white text-occupie-taupe border-slate-200 hover:bg-occupie-ivory hover:border-occupie-brass-400'
                        }`}
                      >
                        {status}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-occupie-taupe/70 mt-2 italic">
                  Manager can override table status for operational needs.
                </p>
              </div>
            )}
            
            {!onStatusChange && (
              <p className="floor-plan-detail-note">Status changes are made from the role workflow that owns this table action.</p>
            )}
          </>
        ) : (
          <>
            <p className="floor-plan-kicker">Selected table</p>
            <h3>No table selected</h3>
            <p className="floor-plan-detail-note">Table details will appear here when table data is available.</p>
          </>
        )}
      </aside>
    </div>
  );
}

export default FloorPlan;
