import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { Logo } from '../../components/common/Logo';
import { CinematicScene } from './CinematicScene';
import { ProductStory } from './ProductStory';

// Cinematic animation variants for final CTA
const cinematicEase = [0.22, 1, 0.36, 1];

const eyebrowVariants = {
  hidden: { 
    opacity: 0,
    letterSpacing: '0.3em'
  },
  visible: {
    opacity: 1,
    letterSpacing: '0.18em',
    transition: {
      duration: 1.0,
      ease: cinematicEase
    }
  }
};

const headlinePartVariants = {
  hidden: {
    opacity: 0,
    y: 50,
    clipPath: 'inset(0 0 100% 0)'
  },
  visible: (custom) => ({
    opacity: 1,
    y: 0,
    clipPath: 'inset(0 0 0% 0)',
    transition: {
      duration: 1.3,
      delay: 0.3 + custom * 0.25,
      ease: cinematicEase
    }
  })
};

const supportTextVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.9,
      delay: 1.1,
      ease: cinematicEase
    }
  }
};

const ctaButtonVariants = {
  hidden: { 
    opacity: 0, 
    y: 30,
    scale: 0.96
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.8,
      delay: 1.4,
      ease: cinematicEase
    }
  }
};

const footerVariants = {
  hidden: { 
    opacity: 0, 
    y: 40
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 1.0,
      ease: cinematicEase
    }
  }
};

const footerChildVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (custom) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      delay: 0.2 + custom * 0.15,
      ease: cinematicEase
    }
  })
};

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
  
  // Refs for animation triggers
  const closingCtaRef = useRef(null);
  const footerRef = useRef(null);
  
  // Use framer-motion's useInView for scroll-triggered animations
  const isClosingCtaInView = useInView(closingCtaRef, {
    once: true,
    amount: 0.25,
    margin: '0px 0px -150px 0px'
  });
  
  const isFooterInView = useInView(footerRef, {
    once: true,
    amount: 0.4,
    margin: '0px 0px -80px 0px'
  });
  
  // Add visible class to footer for border animation
  useEffect(() => {
    if (isFooterInView && footerRef.current) {
      footerRef.current.classList.add('footer-visible');
    }
  }, [isFooterInView]);
  
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
        <section ref={closingCtaRef} className="closing-cta">
          <motion.p 
            className="eyebrow"
            initial={reduceMotion ? false : "hidden"}
            animate={isClosingCtaInView ? "visible" : "hidden"}
            variants={eyebrowVariants}
          >
            Make room for remarkable service
          </motion.p>
          
          <h2>
            <motion.span
              style={{ display: 'block' }}
              custom={0}
              initial={reduceMotion ? false : "hidden"}
              animate={isClosingCtaInView ? "visible" : "hidden"}
              variants={headlinePartVariants}
            >
              Let every guest feel
            </motion.span>
            <motion.span
              style={{ display: 'block' }}
              custom={1}
              initial={reduceMotion ? false : "hidden"}
              animate={isClosingCtaInView ? "visible" : "hidden"}
              variants={headlinePartVariants}
            >
              expected.
            </motion.span>
          </h2>
          
          <motion.p
            initial={reduceMotion ? false : "hidden"}
            animate={isClosingCtaInView ? "visible" : "hidden"}
            variants={supportTextVariants}
          >
            Explore the Occupie role demo and see how the dining room stays in step.
          </motion.p>
          
          <motion.div
            initial={reduceMotion ? false : "hidden"}
            animate={isClosingCtaInView ? "visible" : "hidden"}
            variants={ctaButtonVariants}
          >
            <Link to="/auth/login" className="gold-action cinematic-cta-button">
              Enter the workspace <ArrowUpRight size={16} />
            </Link>
          </motion.div>
        </section>
      </main>
      <motion.footer 
        ref={footerRef}
        className="luxury-footer"
        initial={reduceMotion ? false : "hidden"}
        animate={isFooterInView ? "visible" : "hidden"}
        variants={footerVariants}
      >
        <motion.div
          custom={0}
          initial={reduceMotion ? false : "hidden"}
          animate={isFooterInView ? "visible" : "hidden"}
          variants={footerChildVariants}
        >
          <Logo size="sm" theme="light" />
        </motion.div>
        <motion.p
          custom={1}
          initial={reduceMotion ? false : "hidden"}
          animate={isFooterInView ? "visible" : "hidden"}
          variants={footerChildVariants}
        >
          Intelligent seating for considered hospitality.
        </motion.p>
        <motion.p
          custom={2}
          initial={reduceMotion ? false : "hidden"}
          animate={isFooterInView ? "visible" : "hidden"}
          variants={footerChildVariants}
        >
          © {new Date().getFullYear()} Occupie
        </motion.p>
      </motion.footer>
    </div>
  );
}

export default LandingPage;
