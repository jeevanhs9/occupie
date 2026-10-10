import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { Logo } from '../../components/common/Logo';
import { CinematicScene } from './CinematicScene';
import { ProductStory } from './ProductStory';

function LuxuryNavigation({ menuOpen, setMenuOpen, scrolled, reduceMotion }) {
  const goTo = (target) => {
    setMenuOpen(false);
    document.getElementById(target)?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  };
  const links = [['Product', 'product'], ['Experience', 'experience'], ['About', 'about']];

  return (
    <header className={`luxury-nav ${menuOpen ? 'luxury-nav-menu-open' : scrolled ? 'luxury-nav-solid' : ''}`}>
      <div className="luxury-nav-inner">
        <Logo size="md" theme="light" className="landing-nav-logo" />
        <nav className="luxury-links" aria-label="Primary navigation">
          {links.map(([label, target]) => <button key={target} onClick={() => goTo(target)}>{label}</button>)}
        </nav>
        <div className="luxury-actions">
          <Link to="/auth/login" className="text-action">Sign in</Link>
          <Link to="/auth/login" className="gold-action">Enter the workspace <ArrowUpRight size={15} /></Link>
        </div>
        <button className="menu-toggle" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-label="Toggle navigation">
          {menuOpen ? <X size={20} /> : <Menu size={21} />}
        </button>
      </div>
      <AnimatePresence>
        {menuOpen && <motion.nav className="mobile-nav" initial={reduceMotion ? false : { opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? undefined : { opacity: 0, y: -8 }} aria-label="Mobile navigation">
          {links.map(([label, target]) => <button key={target} onClick={() => goTo(target)}>{label}</button>)}
          <Link to="/auth/login" onClick={() => setMenuOpen(false)}>Sign in</Link>
          <Link to="/auth/login" onClick={() => setMenuOpen(false)}>Enter the workspace</Link>
        </motion.nav>}
      </AnimatePresence>
    </header>
  );
}

export function LandingPage() {
  const reduceMotion = useReducedMotion();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const updateNav = () => setScrolled(window.scrollY > 36);
    updateNav();
    window.addEventListener('scroll', updateNav, { passive: true });
    return () => window.removeEventListener('scroll', updateNav);
  }, []);

  return (
    <div className="luxury-page cinematic-intro-active">
      <LuxuryNavigation menuOpen={menuOpen} setMenuOpen={setMenuOpen} scrolled={scrolled} reduceMotion={reduceMotion} />
      <main>
        <CinematicScene />
        <ProductStory />
        <section className="closing-cta">
          <p className="eyebrow">Make room for remarkable service</p>
          <h2>Let every guest feel expected.</h2>
          <p>Explore the Occupie role demo and see how the dining room stays in step.</p>
          <Link to="/auth/login" className="gold-action">Enter the workspace <ArrowUpRight size={16} /></Link>
        </section>
      </main>
      <footer className="luxury-footer">
        <Logo size="sm" theme="light" />
        <p>Intelligent seating for considered hospitality.</p>
        <p>© {new Date().getFullYear()} Occupie</p>
      </footer>
    </div>
  );
}

export default LandingPage;
