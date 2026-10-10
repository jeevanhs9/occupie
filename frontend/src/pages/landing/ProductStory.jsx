import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, CalendarDays, Sparkles, UsersRound } from 'lucide-react';
import { MOCK_TABLES } from '../../services/mockData';
import { FloorPlan } from '../../components/dashboard/FloorPlan';

const roles = [
  ['01', 'Manager', 'A clear view of table states, reservations, and service alerts.'],
  ['02', 'Host', 'An arrival-ordered waitlist and a suitable table suggestion.'],
  ['03', 'Floor staff', 'A shared way to update tables through service and reset.'],
  ['04', 'Customer', 'A reservation request shaped by party size, time, and preference.'],
];

export function ProductStory() {
  const productStoryRef = useRef(null);

  useEffect(() => {
    const root = productStoryRef.current;
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!root || prefersReducedMotion || !('IntersectionObserver' in window)) return undefined;
    const sections = [...root.querySelectorAll('[data-reveal]')];
    sections.forEach((section) => section.classList.add('reveal-pending'));
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('reveal-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={productStoryRef} className="product-story">
      <section id="product" className="editorial-story" aria-labelledby="operating-room-title">
        <div className="operating-room-layout">
          <div className="operating-room-copy">
            <p className="eyebrow">The rhythm of a dining room</p>
            <h2 id="operating-room-title" className="editorial-headline">
              <span>Every table.</span>
              <span>Smarter seating.</span>
              <span>Less waiting.</span>
            </h2>
            <div className="editorial-support">
              <p className="eyebrow">Clear decisions, calmer service</p>
              <p>Occupie weighs party size, table capacity and availability, reservation commitments, and walk-in order before suggesting who to seat. The host stays in control, and wait estimates remain blank when reliable turnover data is unavailable.</p>
              <Link to="/auth/login" className="inline-link">Explore the operating room <ArrowUpRight size={15} /></Link>
            </div>
          </div>

          <div className="operating-room-demo">
            <div className="editorial-plan-heading">
              <p className="eyebrow">A shared view of the room</p>
              <span>Demonstration · sample table states</span>
            </div>
            <FloorPlan className="floor-plan--editorial" tables={MOCK_TABLES.slice(0, 4)} />
          </div>
        </div>
      </section>

      <section className="principles" aria-label="Occupie seating principles" data-reveal>
        <article><span>01</span><h3>The right fit</h3><p>Match parties to available tables with enough capacity, keeping larger settings open when possible.</p></article>
        <article><span>02</span><h3>A protected promise</h3><p>Reservation windows are considered before a table is recommended to a walk-in party.</p></article>
        <article><span>03</span><h3>One shared pace</h3><p>Hosts, floor staff, managers, and guests each see the part of service they need.</p></article>
      </section>

      <section className="how-it-works" data-reveal>
        <div><p className="eyebrow">Designed around service</p><h2>Clarity from arrival to reset.</h2></div>
        <ol>
          <li><CalendarDays size={19} /><span>01</span><div><h3>Receive</h3><p>Reservations and walk-ins arrive with the details the team needs to plan service.</p></div></li>
          <li><Sparkles size={19} /><span>02</span><div><h3>Consider</h3><p>Occupie surfaces a transparent table recommendation based on the current room.</p></div></li>
          <li><UsersRound size={19} /><span>03</span><div><h3>Welcome</h3><p>Staff update table states as the meal unfolds, keeping the room in step.</p></div></li>
        </ol>
      </section>

      <section id="about" className="roles-section" data-reveal>
        <p className="eyebrow">One room, four perspectives</p>
        <div className="roles-grid">{roles.map(([number, title, description]) => <article key={title}><span>{number}</span><h3>{title}</h3><p>{description}</p></article>)}</div>
      </section>
    </div>
  );
}

export default ProductStory;
