import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '../../components/common/Logo';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { TABLE_STATUS_CONFIG } from '../../lib/constants';
import { MOCK_TABLES, MOCK_RESTAURANT_INFO } from '../../services/mockData';
import {
  ArrowRight,
  Sparkles,
  CalendarCheck2,
  Cpu,
  Clock,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  Users,
  Store,
  ChevronRight,
  Menu,
  X,
  Armchair,
  Layers,
  Activity,
  HeartHandshake,
} from 'lucide-react';

export function LandingPage() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activePreviewTable, setActivePreviewTable] = useState(MOCK_TABLES[0]);

  const scrollToSection = (id) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-occupie-warm-50 text-slate-900 font-sans selection:bg-occupie-teal-500/20">
      {/* ================= 1. NAVIGATION BAR ================= */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Logo size="md" theme="dark" withTagline={true} />

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <button
              onClick={() => scrollToSection('product')}
              className="hover:text-occupie-navy-900 transition-colors"
            >
              Product
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="hover:text-occupie-navy-900 transition-colors"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection('features')}
              className="hover:text-occupie-navy-900 transition-colors"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection('about')}
              className="hover:text-occupie-navy-900 transition-colors"
            >
              About
            </button>
          </div>

          {/* Right Action CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Link to="/auth/login">
              <Button variant="ghost" size="md">
                Sign In
              </Button>
            </Link>
            <Link to="/auth/demo-roles">
              <Button variant="accent" size="md" icon={ArrowRight}>
                Try Demo
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-100"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-slate-200 px-6 py-6 space-y-4 shadow-xl animate-fadeIn">
            <div className="flex flex-col space-y-3 font-semibold text-sm text-slate-700">
              <button
                onClick={() => scrollToSection('product')}
                className="text-left py-2 hover:text-occupie-navy-900"
              >
                Product
              </button>
              <button
                onClick={() => scrollToSection('how-it-works')}
                className="text-left py-2 hover:text-occupie-navy-900"
              >
                How It Works
              </button>
              <button
                onClick={() => scrollToSection('features')}
                className="text-left py-2 hover:text-occupie-navy-900"
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection('about')}
                className="text-left py-2 hover:text-occupie-navy-900"
              >
                About
              </button>
            </div>
            <div className="pt-4 border-t border-slate-100 flex flex-col gap-2.5">
              <Link to="/auth/login" className="w-full">
                <Button variant="outline" size="md" className="w-full">
                  Sign In
                </Button>
              </Link>
              <Link to="/auth/demo-roles" className="w-full">
                <Button variant="accent" size="md" className="w-full">
                  Try Interactive Demo
                </Button>
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* ================= 2. HERO SECTION ================= */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-32 overflow-hidden bg-gradient-to-b from-white via-occupie-warm-50 to-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-occupie-navy-900 text-slate-200 border border-occupie-navy-700 text-xs font-semibold shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-occupie-teal-400" />
              <span>Next-Generation Restaurant Table Allocation</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.12]">
              Smarter Table Allocation.{' '}
              <span className="text-occupie-teal-600">
                Shorter Waits.
              </span>{' '}
              Happier Dining.
            </h1>

            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
              Mismatched party sizes, overlapping bookings, and walk-in queues can leave seats unused. Occupie checks table capacity, availability, confirmed reservations, and waitlist order before suggesting who to seat.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-4">
              <Link to="/auth/demo-roles">
                <Button size="lg" variant="primary" icon={ArrowRight} className="w-full sm:w-auto">
                  Get Started
                </Button>
              </Link>
              <Button
                size="lg"
                variant="secondary"
                className="w-full sm:w-auto"
                onClick={() => scrollToSection('product')}
              >
                Explore the Platform
              </Button>
            </div>

            {/* Micro proof tags */}
            <div className="flex flex-wrap items-center justify-center gap-6 pt-4 text-xs font-semibold text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> 4 Tailored Roles
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Intelligent Seating Algorithms
              </span>
              <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Clear Table Status Updates
              </span>
            </div>
          </div>

          {/* ================= 6. INTERACTIVE DASHBOARD PREVIEW ================= */}
          <div id="product" className="mt-14 max-w-5xl mx-auto">
            <div className="rounded-3xl bg-occupie-navy-950 p-4 sm:p-6 lg:p-8 shadow-2xl border border-occupie-navy-800 relative">
              {/* Fake Window Bar */}
              <div className="flex items-center justify-between pb-5 border-b border-occupie-navy-800 mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  <span className="ml-3 text-xs font-mono text-slate-400">
                    occupie.local/dashboard/manager &bull; Demo Data Preview
                  </span>
                </div>
                <Badge variant="teal" size="sm">
                  Sample Dinner Shift
                </Badge>
              </div>

              {/* Preview Content: Metrics Bar */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div className="p-3.5 rounded-xl bg-occupie-navy-900 border border-occupie-navy-800">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Occupancy</span>
                  <span className="text-xl font-black text-white">{MOCK_RESTAURANT_INFO.currentOccupancyRate}%</span>
                  <span className="text-[10px] text-emerald-400 block mt-0.5">+14% vs avg</span>
                </div>
                <div className="p-3.5 rounded-xl bg-occupie-navy-900 border border-occupie-navy-800">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Active Tables</span>
                  <span className="text-xl font-black text-white">12 / 16</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">4 ready for seating</span>
                </div>
                <div className="p-3.5 rounded-xl bg-occupie-navy-900 border border-occupie-navy-800">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Covers Tonight</span>
                  <span className="text-xl font-black text-white">48 guests</span>
                  <span className="text-[10px] text-occupie-teal-400 block mt-0.5">28 reservations</span>
                </div>
                <div className="p-3.5 rounded-xl bg-occupie-navy-900 border border-occupie-navy-800">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Avg Turnaround</span>
                  <span className="text-xl font-black text-white">{MOCK_RESTAURANT_INFO.avgTurnaroundMinutes}m</span>
                    <span className="text-[10px] text-emerald-400 block mt-0.5">Sample snapshot</span>
                </div>
              </div>

              {/* Preview Content: Demo Table Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span className="font-bold flex items-center gap-1.5">
                    <Armchair className="w-4 h-4 text-occupie-teal-400" />
                    Interactive Table Layout (Click to inspect)
                  </span>
                  <span className="text-slate-400 text-[11px]">
                    Showing 16 Tables across 4 Dining Zones
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2.5">
                  {MOCK_TABLES.map((table) => {
                    const isSelected = activePreviewTable.id === table.id;
                    const meta = TABLE_STATUS_CONFIG[table.status] || TABLE_STATUS_CONFIG.available;

                    return (
                      <button
                        key={table.id}
                        type="button"
                        onClick={() => setActivePreviewTable(table)}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'bg-occupie-navy-800 border-occupie-teal-400 shadow-glow-teal ring-2 ring-occupie-teal-400/40'
                            : 'bg-occupie-navy-900/90 border-occupie-navy-800 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">{table.name}</span>
                          <span className="text-[10px] font-medium text-slate-400">{table.capacity}p</span>
                        </div>
                        <div className="mt-2 flex items-center gap-1">
                          <span className={`w-2 h-2 rounded-full ${meta.dotClass}`} />
                          <span className="text-[10px] text-slate-300 capitalize">{meta.label}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Inspect Card */}
                {activePreviewTable && (
                  <div className="mt-4 p-4 rounded-xl bg-occupie-navy-900/90 border border-occupie-navy-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="text-white font-bold text-sm">
                        {activePreviewTable.name} ({activePreviewTable.capacity} Seats)
                      </span>
                      <span className="text-slate-400 ml-2">
                        Zone: <strong className="text-slate-200">{activePreviewTable.section}</strong> &bull; Server: <strong className="text-slate-200">{activePreviewTable.assignedServer}</strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Current Status:</span>
                      <Badge variant="teal" size="sm">
                        {activePreviewTable.status.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 7. FEATURE CARDS ================= */}
      <section id="features" className="py-20 md:py-28 bg-white border-t border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <Badge variant="navy" size="md">
              Intelligent Capability
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Designed For High-Turnover Restaurant Excellence
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              Coordinate tables, reservations, and walk-ins across Managers, Hosts, Floor Staff, and Diners.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1 */}
            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/80 hover:shadow-card hover:border-slate-300 transition-all flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200/60 flex items-center justify-center text-teal-600">
                  <CalendarCheck2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Smart Reservations</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Guests choose a time and party size. Occupie checks reservation holds and table capacity before confirming a suitable assignment.
                </p>
              </div>
              <div className="pt-6 border-t border-slate-200/60 mt-6 text-xs font-semibold text-teal-600 flex items-center gap-1">
                <span>Reservation-aware table assignment</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/80 hover:shadow-card hover:border-slate-300 transition-all flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-cyan-50 border border-cyan-200/60 flex items-center justify-center text-cyan-600">
                  <Cpu className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Capacity-Aware Seating</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Parties are matched to available tables that fit. The smallest suitable table is preferred to keep larger tables open where possible.
                </p>
              </div>
              <div className="pt-6 border-t border-slate-200/60 mt-6 text-xs font-semibold text-cyan-600 flex items-center gap-1">
                <span>Smallest suitable match</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/80 hover:shadow-card hover:border-slate-300 transition-all flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600">
                  <Clock className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Waitlist Flow</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Walk-ins stay ordered by arrival. The next party with a suitable available table is seated first; wait times stay blank without reliable turnover data.
                </p>
              </div>
              <div className="pt-6 border-t border-slate-200/60 mt-6 text-xs font-semibold text-amber-600 flex items-center gap-1">
                <span>Arrival-ordered queue</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/80 hover:shadow-card hover:border-slate-300 transition-all flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200/60 flex items-center justify-center text-indigo-600">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Occupancy Insights</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  View current occupancy, table states, active reservations, and service alerts. Historical revenue and turnover reports need more source data.
                </p>
              </div>
              <div className="pt-6 border-t border-slate-200/60 mt-6 text-xs font-semibold text-indigo-600 flex items-center gap-1">
                <span>Current service snapshot</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 8. THREE-STEP EXPLANATION ================= */}
      <section id="how-it-works" className="py-20 md:py-28 bg-slate-50 border-t border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <Badge variant="teal" size="md">
              Workflow Mechanics
            </Badge>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
              How Occupie Optimizes Your Dining Room in 3 Steps
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              From the initial booking to cleaning table turnover, every touchpoint is coordinated.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Step 1 */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xs relative space-y-4">
              <div className="w-10 h-10 rounded-xl bg-occupie-navy-900 text-white font-black text-base flex items-center justify-center shadow-sm">
                1
              </div>
              <h3 className="text-lg font-bold text-slate-900">Intake & Demand Staging</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Reservations and walk-ins include a party size and time. Conflicting reservation holds are checked before a table is assigned.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xs relative space-y-4">
              <div className="w-10 h-10 rounded-xl bg-occupie-teal-500 text-occupie-navy-950 font-black text-base flex items-center justify-center shadow-sm">
                2
              </div>
              <h3 className="text-lg font-bold text-slate-900">Smart Allocation & Seating</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Occupie suggests an available table that fits, prefers the smallest suitable option, and respects reservation windows before the host seats a party.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xs relative space-y-4">
              <div className="w-10 h-10 rounded-xl bg-occupie-cyan-600 text-white font-black text-base flex items-center justify-center shadow-sm">
                3
              </div>
              <h3 className="text-lg font-bold text-slate-900">Rapid Turnover & Sanitization</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Floor staff update tables as occupied, cleaning, or available. The current dashboard view reflects the change after the update succeeds.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= ABOUT SECTION ================= */}
      <section id="about" className="py-20 bg-white border-t border-slate-200/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-slate-900 text-white p-8 sm:p-12 border border-slate-800 shadow-xl flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-4">
              <Badge variant="teal" size="sm">About Occupie</Badge>
              <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Built For Independent & Casual Dining
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
                Occupie is designed around the everyday work of restaurant teams: organizing walk-in queues, honoring reservation commitments, and matching parties with tables that fit.
              </p>
            </div>
            <div className="shrink-0">
              <Link to="/auth/demo-roles">
                <Button size="lg" variant="accent" icon={ArrowRight}>
                  Explore Role Dashboards
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 9. FINAL CTA SECTION ================= */}
      <section className="py-20 md:py-28 bg-gradient-to-br from-occupie-navy-950 via-slate-950 to-occupie-navy-900 text-white text-center relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-6">
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
            Ready to Experience Intelligent Dining Operations?
          </h2>
          <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto">
            Test the Phase 1 interactive shells for Manager, Host, Floor Staff, and Guest right now.
          </p>
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/auth/demo-roles">
              <Button size="lg" variant="accent" icon={ArrowRight} className="w-full sm:w-auto">
                Open Role Preview Sandbox
              </Button>
            </Link>
            <Link to="/auth/login">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                Sign-In Preview
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="bg-occupie-navy-950 border-t border-occupie-navy-800 text-slate-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <Logo size="sm" theme="light" withTagline={true} />
          <div className="text-xs text-slate-500 text-center md:text-right space-y-1">
            <p>&copy; {new Date().getFullYear()} Occupie Restaurant Management Systems. Operational Demo.</p>
            <p>Designed for scalable multi-role restaurant operations.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
