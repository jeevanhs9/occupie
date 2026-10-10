import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, CalendarDays, Sparkles, UsersRound } from 'lucide-react';
import { MOCK_TABLES } from '../../services/mockData';
import { FloorPlan } from '../../components/dashboard/FloorPlan';

const roles = [
  ['01', 'Manager', 'A clear view of table states, reservations, and service alerts.'],
  ['02', 'Host', 'An arrival-ordered waitlist and a suitable table suggestion.'],
  ['03', 'Floor staff', 'A shared way to update tables through service and reset.'],
  ['04', 'Customer', 'A reservation request shaped by party size, time, and preference.'],
];

// Cinematic scroll animation variants
const cinematicEase = [0.22, 1, 0.36, 1];

const headlineLineVariants = {
  hidden: { 
    opacity: 0, 
    y: 40,
    clipPath: 'inset(0 0 100% 0)'
  },
  visible: (custom) => ({
    opacity: 1,
    y: 0,
    clipPath: 'inset(0 0 0% 0)',
    transition: {
      duration: 1.2,
      delay: custom * 0.15,
      ease: cinematicEase
    }
  })
};

const supportContentVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (custom) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      delay: 0.6 + custom * 0.12,
      ease: cinematicEase
    }
  })
};

const dashboardVariants = {
  hidden: { 
    opacity: 0, 
    y: 60,
    rotateX: 8,
    scale: 0.94
  },
  visible: {
    opacity: 1,
    y: 0,
    rotateX: 0,
    scale: 1,
    transition: {
      duration: 1.4,
      delay: 0.3,
      ease: cinematicEase
    }
  }
};

const dashboardChildVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (custom) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      delay: 0.8 + custom * 0.08,
      ease: cinematicEase
    }
  })
};

export function ProductStory() {
  const productStoryRef = useRef(null);
  const operatingRoomRef = useRef(null);
  const shouldReduceMotion = useReducedMotion();
  
  // Use framer-motion's useInView for the main cinematic section
  const isOperatingRoomInView = useInView(operatingRoomRef, {
    once: true,
    amount: 0.2,
    margin: '0px 0px -100px 0px'
  });

  // Preserve existing reveal logic for other sections
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
      <section 
        ref={operatingRoomRef}
        id="product" 
        className="editorial-story" 
        aria-labelledby="operating-room-title"
        style={{ perspective: '2000px' }}
      >
        <div className="operating-room-layout">
          {/* Animated Copy Section */}
          <div className="operating-room-copy">
            <motion.p 
              className="eyebrow"
              initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
              animate={isOperatingRoomInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, ease: cinematicEase }}
            >
              The rhythm of a dining room
            </motion.p>
            
            <h2 id="operating-room-title" className="editorial-headline">
              <motion.span
                custom={0}
                initial={shouldReduceMotion ? false : "hidden"}
                animate={isOperatingRoomInView ? "visible" : "hidden"}
                variants={headlineLineVariants}
              >
                Every table.
              </motion.span>
              <motion.span
                custom={1}
                initial={shouldReduceMotion ? false : "hidden"}
                animate={isOperatingRoomInView ? "visible" : "hidden"}
                variants={headlineLineVariants}
              >
                Smarter seating.
              </motion.span>
              <motion.span
                custom={2}
                initial={shouldReduceMotion ? false : "hidden"}
                animate={isOperatingRoomInView ? "visible" : "hidden"}
                variants={headlineLineVariants}
              >
                Less waiting.
              </motion.span>
            </h2>
            
            <div className="editorial-support">
              <motion.p 
                className="eyebrow"
                custom={0}
                initial={shouldReduceMotion ? false : "hidden"}
                animate={isOperatingRoomInView ? "visible" : "hidden"}
                variants={supportContentVariants}
              >
                Clear decisions, calmer service
              </motion.p>
              <motion.p
                custom={1}
                initial={shouldReduceMotion ? false : "hidden"}
                animate={isOperatingRoomInView ? "visible" : "hidden"}
                variants={supportContentVariants}
              >
                Occupie weighs party size, table capacity and availability, reservation commitments, and walk-in order before suggesting who to seat. The host stays in control, and wait estimates remain blank when reliable turnover data is unavailable.
              </motion.p>
              <motion.div
                custom={2}
                initial={shouldReduceMotion ? false : "hidden"}
                animate={isOperatingRoomInView ? "visible" : "hidden"}
                variants={supportContentVariants}
              >
                <Link to="/auth/login" className="inline-link cinematic-link">
                  Explore the operating room <ArrowUpRight size={15} />
                </Link>
              </motion.div>
            </div>
          </div>

          {/* Animated Dashboard Preview */}
          <motion.div 
            className="operating-room-demo cinematic-dashboard"
            initial={shouldReduceMotion ? false : "hidden"}
            animate={isOperatingRoomInView ? "visible" : "hidden"}
            variants={dashboardVariants}
          >
            <motion.div 
              className="editorial-plan-heading"
              custom={0}
              initial={shouldReduceMotion ? false : "hidden"}
              animate={isOperatingRoomInView ? "visible" : "hidden"}
              variants={dashboardChildVariants}
            >
              <p className="eyebrow">A shared view of the room</p>
              <span>Demonstration · sample table states</span>
            </motion.div>
            <motion.div
              custom={1}
              initial={shouldReduceMotion ? false : "hidden"}
              animate={isOperatingRoomInView ? "visible" : "hidden"}
              variants={dashboardChildVariants}
            >
              <FloorPlan className="floor-plan--editorial" tables={MOCK_TABLES.slice(0, 4)} />
            </motion.div>
          </motion.div>
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
