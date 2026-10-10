import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, CalendarDays, Menu, Sparkles, UsersRound, X } from 'lucide-react';
import { Logo } from '../../components/common/Logo';
import { MOCK_TABLES } from '../../services/mockData';
import { ScrollVideoExperience } from './ScrollVideoExperience';

const roles = [
  ['01', 'Manager', 'See the room at a glance, set table states, and coordinate the service rhythm.'],
  ['02', 'Host', 'Keep arrivals ordered while matching each party to a table that fits.'],
  ['03', 'Floor staff', 'Move each table from service to reset with a clear shared view.'],
  ['04', 'Guest', 'Request a table with party size, time, and seating preference.'],
];

function BrandIntro({ onComplete }) {
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    const timer = window.setTimeout(onComplete, reduceMotion ? 0 : 1250);
    return () => window.clearTimeout(timer);
  }, [onComplete, reduceMotion]);
  return <motion.div className="brand-intro" initial={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: reduceMotion ? 0 : 0.35 } }} aria-label="Occupie introduction">
    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: reduceMotion ? 0 : 0.55 }}>
      <Logo size="lg" theme="light" withLink={false} />
      <p>Intelligent Seating. Exceptional Hospitality.</p>
    </motion.div>
  </motion.div>;
}

function Navigation({ menuOpen, setMenuOpen, scrolled }) {
  const goTo = (target) => {
    setMenuOpen(false);
    document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const links = [['Product', 'product'], ['Experience', 'experience'], ['About', 'about']];
  return <header className={`luxury-nav ${scrolled || menuOpen ? 'luxury-nav-solid' : ''}`}>
    <div className="luxury-nav-inner">
      <Logo size="md" theme="light" withTagline={false} />
      <nav className="luxury-links" aria-label="Primary navigation">
        {links.map(([label, target]) => <button key={target} onClick={() => goTo(target)}>{label}</button>)}
      </nav>
      <div className="luxury-actions"><Link to="/auth/login" className="text-action">Sign in</Link><Link to="/auth/demo-roles" className="gold-action">Explore Occupie <ArrowUpRight size={15} /></Link></div>
      <button className="menu-toggle" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-label="Toggle navigation">{menuOpen ? <X size={20} /> : <Menu size={21} />}</button>
    </div>
    <AnimatePresence>{menuOpen && <motion.nav className="mobile-nav" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
      {links.map(([label, target]) => <button key={target} onClick={() => goTo(target)}>{label}</button>)}
      <Link to="/auth/login" onClick={() => setMenuOpen(false)}>Sign in</Link><Link to="/auth/demo-roles" onClick={() => setMenuOpen(false)}>Explore Occupie</Link>
    </motion.nav>}</AnimatePresence>
  </header>;
}

export function LandingPage() {
  const reduceMotion = useReducedMotion();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [introVisible, setIntroVisible] = useState(() => {
    try { return !window.sessionStorage.getItem('occupie-intro-seen') && !window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
  });
  const [selectedTable, setSelectedTable] = useState(MOCK_TABLES[0]);
  useEffect(() => {
    const updateNav = () => setScrolled(window.scrollY > 36);
    updateNav(); window.addEventListener('scroll', updateNav, { passive: true });
    return () => window.removeEventListener('scroll', updateNav);
  }, []);
  const completeIntro = () => { try { window.sessionStorage.setItem('occupie-intro-seen', 'true'); } catch { /* optional */ } setIntroVisible(false); };

  return <div className="luxury-page">
    <AnimatePresence>{introVisible && <BrandIntro onComplete={completeIntro} />}</AnimatePresence>
    <Navigation menuOpen={menuOpen} setMenuOpen={setMenuOpen} scrolled={scrolled} />
    <main>
      <section className="opening-hero">
        <div className="opening-backdrop" />
        <div className="opening-content">
          <motion.p className="eyebrow" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduceMotion ? 0 : 0.2 }}>The art of arrival</motion.p>
          <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduceMotion ? 0 : 0.32, duration: 0.75 }}>A considered room<br />begins at the door.</motion.h1>
          <motion.p className="opening-intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: reduceMotion ? 0 : 0.6 }}>Occupie brings a calm, informed rhythm to the moments where exceptional hospitality begins.</motion.p>
          <motion.div className="opening-actions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: reduceMotion ? 0 : 0.75 }}>
            <button className="gold-action" onClick={() => document.getElementById('experience')?.scrollIntoView({ behavior: 'smooth' })}>Enter the experience <ArrowUpRight size={16} /></button><Link to="/auth/demo-roles" className="quiet-action">Open the demo</Link>
          </motion.div>
        </div>
        <p className="opening-index">01 / 04</p>
      </section>
      <ScrollVideoExperience />
      <section id="product" className="editorial-story">
        <div className="story-intro"><p className="eyebrow">The intelligence behind the welcome</p><h2>Invisible when it works.<br />Indispensable when it matters.</h2></div>
        <div className="story-copy"><p>Service runs best when the room feels effortless. Occupie gives the team a shared, current view of availability, reservations, and the waiting list.</p><p>Its seating recommendation considers party size, a table’s capacity and status, reservation protection, and the arrival order of walk-ins. The host remains in control of every decision.</p><Link to="/auth/demo-roles" className="inline-link">Explore the operating room <ArrowUpRight size={15} /></Link></div>
      </section>
      <section className="principles" aria-label="Occupie principles">
        <article><span>01</span><h3>The right fit</h3><p>Available tables are matched to parties that fit, preserving larger settings where possible.</p></article>
        <article><span>02</span><h3>A protected promise</h3><p>Confirmed reservations protect their table window while hosts assess the room.</p></article>
        <article><span>03</span><h3>One shared pace</h3><p>Hosts, floor staff, managers, and guests each see the part of service they need.</p></article>
      </section>
      <section className="seating-preview" id="about">
        <div className="preview-heading"><p className="eyebrow">A view of the room</p><h2>Every setting has a story.</h2><p>This interactive preview uses demonstration data. In API mode, table states come from your configured backend.</p></div>
        <div className="room-plan"><div className="room-plan-top"><span>Tonight’s room</span><span>Demo preview</span></div><div className="table-layout">{MOCK_TABLES.slice(0, 12).map((table) => <button key={table.id} onClick={() => setSelectedTable(table)} className={`table-setting ${selectedTable?.id === table.id ? 'is-selected' : ''}`} aria-pressed={selectedTable?.id === table.id}><b>{table.name}</b><small>{table.capacity} guests</small><i className={`status-${table.status}`} /></button>)}</div>{selectedTable && <div className="selected-setting"><span>Selected setting</span><strong>{selectedTable.name} · {selectedTable.capacity} seats</strong><em>{selectedTable.section} · {selectedTable.status}</em></div>}</div>
      </section>
      <section id="how-it-works" className="how-it-works"><div><p className="eyebrow">Designed around service</p><h2>A quieter way to run a full room.</h2></div><ol>
        <li><CalendarDays size={19} /><span>01</span><div><h3>Receive</h3><p>Reservations and walk-ins arrive with the details the team needs to plan service.</p></div></li>
        <li><Sparkles size={19} /><span>02</span><div><h3>Consider</h3><p>Occupie surfaces a transparent table recommendation without inventing a wait-time promise.</p></div></li>
        <li><UsersRound size={19} /><span>03</span><div><h3>Welcome</h3><p>Staff update the table state as the meal unfolds, so the next arrival is met with clarity.</p></div></li>
      </ol></section>
      <section className="roles-section"><p className="eyebrow">One room, four perspectives</p><div className="roles-grid">{roles.map(([number, title, description]) => <article key={title}><span>{number}</span><h3>{title}</h3><p>{description}</p></article>)}</div></section>
      <section className="closing-cta"><p className="eyebrow">Make room for remarkable service</p><h2>Let every guest feel expected.</h2><p>Explore the Occupie role demo and see how the dining room stays in step.</p><Link to="/auth/demo-roles" className="gold-action">Explore Occupie <ArrowUpRight size={16} /></Link></section>
    </main>
    <footer className="luxury-footer"><Logo size="sm" theme="light" withTagline={false} /><p>Intelligent seating for considered hospitality.</p><p>© {new Date().getFullYear()} Occupie</p></footer>
  </div>;
}

export default LandingPage;
