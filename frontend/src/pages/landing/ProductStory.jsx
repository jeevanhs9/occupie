import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, CalendarDays, Sparkles, UsersRound } from 'lucide-react';
import { MOCK_TABLES } from '../../services/mockData';

const roles = [
  ['01', 'Manager', 'A clear view of table states, reservations, and service alerts.'],
  ['02', 'Host', 'An arrival-ordered waitlist and a suitable table suggestion.'],
  ['03', 'Floor staff', 'A shared way to update tables through service and reset.'],
  ['04', 'Customer', 'A reservation request shaped by party size, time, and preference.'],
];

export function ProductStory() {
  const [selectedTable, setSelectedTable] = useState(MOCK_TABLES[0]);

  return (
    <div className="product-story">
      <section id="product" className="editorial-story">
        <div className="story-intro">
          <p className="eyebrow">The rhythm of a dining room</p>
          <h2>A full room moves faster than a seating chart.</h2>
          <p className="story-lede">Reservations arrive. Walk-ins gather. A table turns. The team needs one considered view of what is happening now.</p>
        </div>
        <figure className="story-image">
          <img src="/frames/frame_0120.webp" alt="Candlelit restaurant table set for dinner" loading="lazy" decoding="async" />
          <figcaption><span>Occupie</span><span>Intelligent seating, in service of hospitality</span></figcaption>
        </figure>
        <div className="story-copy">
          <p>Occupie checks party size, table capacity and availability, reservation commitments, and the order of walk-in arrivals before suggesting who to seat.</p>
          <p>The recommendation stays transparent and the host remains in control. Wait estimates stay blank where reliable turnover data is not available.</p>
          <Link to="/auth/demo-roles" className="inline-link">Explore the operating room <ArrowUpRight size={15} /></Link>
        </div>
      </section>

      <section className="principles" aria-label="Occupie seating principles">
        <article><span>01</span><h3>The right fit</h3><p>Match parties to available tables with enough capacity, keeping larger settings open when possible.</p></article>
        <article><span>02</span><h3>A protected promise</h3><p>Reservation windows are considered before a table is recommended to a walk-in party.</p></article>
        <article><span>03</span><h3>One shared pace</h3><p>Hosts, floor staff, managers, and guests each see the part of service they need.</p></article>
      </section>

      <section className="seating-preview" aria-labelledby="room-preview-title">
        <div className="preview-heading">
          <p className="eyebrow">A view of the room</p>
          <h2 id="room-preview-title">Every setting has a story.</h2>
          <p>This seating plan is a demonstration preview. Live table states are available when the app is configured to use the backend API.</p>
        </div>
        <div className="room-plan">
          <div className="room-plan-top"><span>Tonight’s room</span><span>Demo preview</span></div>
          <div className="table-layout">
            {MOCK_TABLES.slice(0, 12).map((table) => (
              <button key={table.id} onClick={() => setSelectedTable(table)} className={`table-setting ${selectedTable?.id === table.id ? 'is-selected' : ''}`} aria-pressed={selectedTable?.id === table.id}>
                <b>{table.name}</b><small>{table.capacity} guests</small><i className={`status-${table.status}`} aria-hidden="true" />
              </button>
            ))}
          </div>
          {selectedTable && <div className="selected-setting"><span>Selected setting</span><strong>{selectedTable.name} · {selectedTable.capacity} seats</strong><em>{selectedTable.section} · {selectedTable.status}</em></div>}
        </div>
      </section>

      <section className="how-it-works">
        <div><p className="eyebrow">Designed around service</p><h2>Clarity from arrival to reset.</h2></div>
        <ol>
          <li><CalendarDays size={19} /><span>01</span><div><h3>Receive</h3><p>Reservations and walk-ins arrive with the details the team needs to plan service.</p></div></li>
          <li><Sparkles size={19} /><span>02</span><div><h3>Consider</h3><p>Occupie surfaces a transparent table recommendation based on the current room.</p></div></li>
          <li><UsersRound size={19} /><span>03</span><div><h3>Welcome</h3><p>Staff update table states as the meal unfolds, keeping the room in step.</p></div></li>
        </ol>
      </section>

      <section id="about" className="roles-section">
        <p className="eyebrow">One room, four perspectives</p>
        <div className="roles-grid">{roles.map(([number, title, description]) => <article key={title}><span>{number}</span><h3>{title}</h3><p>{description}</p></article>)}</div>
      </section>
    </div>
  );
}

export default ProductStory;
