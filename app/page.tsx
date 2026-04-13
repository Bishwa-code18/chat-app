"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Zap, Shield, Search, Image, MessageCircle, Users,
  Star, ArrowRight, Check, ChevronRight, Menu, X,
  Globe, Bell, Lock, Smile,
} from "lucide-react";

// ─── Intersection Observer hook for scroll animations ─────────────────────────
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.disconnect(); } },
      { threshold }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold]);
  return { ref, inView };
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const features = [
  { icon: Zap,           title: "Real-Time Messaging",    desc: "Messages delivered instantly via WebSocket — zero lag, zero refresh." },
  { icon: Image,         title: "File & Image Sharing",   desc: "Send photos, PDFs and documents right inside the chat with inline previews." },
  { icon: Search,        title: "Find by Username",       desc: "Search any user by username and open a direct conversation in one click." },
  { icon: Globe,         title: "Global Chat Room",       desc: "Jump into the public room and connect with everyone at once." },
  { icon: Bell,          title: "Live Online Presence",   desc: "See who's online with real-time green indicators — no stale status." },
  { icon: Lock,          title: "Secure by Default",      desc: "Every session is authenticated. Guest mode works great for quick demos." },
];

const steps = [
  { n: "01", title: "Create your account",   desc: "Sign up in seconds with email, or jump straight in as a guest." },
  { n: "02", title: "Find your people",       desc: "Search for friends by username and start a private conversation." },
  { n: "03", title: "Chat in real time",      desc: "Send messages, images & files — delivered instantly to anyone online." },
];

const testimonials = [
  { name: "Priya Sharma",   role: "Product Designer",       avatar: "P", text: "The cleanest chat UI I've ever used. Real-time delivery is buttery smooth and the file upload is a game changer." },
  { name: "James O'Brien",  role: "Full-Stack Developer",   avatar: "J", text: "Built on InsForge — the backend is solid. Messages never drop, presence tracking is accurate, and setup took minutes." },
  { name: "Aisha Mensah",   role: "Community Manager",      avatar: "A", text: "Switched our team's channel to InsForge Chat and haven't looked back. Guest mode means anyone can jump in." },
];

const navLinks = ["Features", "How it works", "Testimonials"];

// ─── Component ────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const hero    = useInView(0.05);
  const featSec = useInView(0.1);
  const stepSec = useInView(0.1);
  const testSec = useInView(0.1);
  const ctaSec  = useInView(0.1);

  return (
    <div className="font-sans antialiased text-slate-900 bg-white overflow-x-hidden">

      {/* ── Navbar ──────────────────────────────────────────────────────────── */}
      <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? "bg-white/90 backdrop-blur-xl shadow-sm border-b border-slate-100" : "bg-transparent"}`}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200">
              <MessageCircle className="w-4 h-4 text-white" />
            </div>
            <span className="font-extrabold text-lg tracking-tight">InsForge Chat</span>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map(l => (
              <a key={l} href={`#${l.toLowerCase().replace(/ /g, "-")}`}
                className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">{l}</a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Link href="/chat" className="text-sm font-semibold text-slate-700 hover:text-indigo-600 transition-colors px-3 py-2">Sign In</Link>
            <Link href="/chat" className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-semibold px-5 py-2 rounded-xl shadow-md shadow-indigo-200 transition-all hover:shadow-lg hover:shadow-indigo-300 hover:-translate-y-px">
              Get Started Free
            </Link>
          </div>

          {/* Mobile menu toggle */}
          <button className="md:hidden p-2 text-slate-600" onClick={() => setMenuOpen(v => !v)}>
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile dropdown */}
        {menuOpen && (
          <div className="md:hidden bg-white border-b border-slate-100 px-6 pb-5 pt-2 space-y-3">
            {navLinks.map(l => (
              <a key={l} href={`#${l.toLowerCase().replace(/ /g, "-")}`}
                onClick={() => setMenuOpen(false)}
                className="block text-sm font-medium text-slate-700 py-2">{l}</a>
            ))}
            <Link href="/chat" className="block w-full text-center bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold py-3 rounded-xl mt-2">
              Get Started Free
            </Link>
          </div>
        )}
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-16">
        {/* Background blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-gradient-to-br from-indigo-200/60 to-purple-200/40 rounded-full blur-[96px] animate-blob" />
          <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-gradient-to-tr from-violet-200/50 to-pink-200/30 rounded-full blur-[96px] animate-blob animation-delay-2000" />
          <div className="absolute top-[30%] left-[20%] w-[300px] h-[300px] bg-indigo-100/40 rounded-full blur-[80px] animate-blob animation-delay-4000" />
          {/* Grid */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.04)_1px,transparent_1px)] bg-[size:64px_64px]" />
        </div>

        <div ref={hero.ref} className={`relative z-10 max-w-4xl mx-auto px-6 text-center transition-all duration-1000 ${hero.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-semibold px-4 py-2 rounded-full mb-8 shadow-sm">
            <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
            Powered by InsForge real-time infrastructure
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.05] mb-6">
            Chat that{" "}
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-600 bg-clip-text text-transparent">
              moves as fast
            </span>
            <br />as you think
          </h1>

          <p className="text-lg sm:text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            Real-time messaging, file sharing, direct messages and a global chat room — all in one beautifully designed app. No setup required.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link href="/chat"
              className="group flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold px-8 py-4 rounded-2xl shadow-xl shadow-indigo-300/40 transition-all hover:shadow-2xl hover:shadow-indigo-400/40 hover:-translate-y-1 text-base">
              Start chatting for free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a href="#how-it-works"
              className="flex items-center gap-2 text-slate-600 font-semibold px-6 py-4 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all text-base">
              See how it works <ChevronRight className="w-4 h-4" />
            </a>
          </div>

          {/* Chat UI Mockup */}
          <div className="relative mx-auto max-w-3xl rounded-3xl border border-slate-200/80 shadow-[0_32px_80px_-12px_rgba(99,102,241,0.25)] overflow-hidden bg-[#050508] hover:-translate-y-1 transition-transform duration-500">
            {/* Window chrome */}
            <div className="flex items-center gap-2 px-4 py-3 bg-[#0a0b12] border-b border-white/5">
              <span className="w-3 h-3 rounded-full bg-red-500/80" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="ml-auto text-[11px] text-white/20 font-mono">insforge.chat</span>
            </div>
            {/* Mock chat */}
            <div className="flex h-72">
              {/* Sidebar */}
              <div className="w-48 bg-white/[0.02] border-r border-white/5 p-3 flex flex-col gap-2">
                <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1 px-1">Channels</div>
                <div className="flex items-center gap-2 bg-indigo-500/20 rounded-lg px-2 py-1.5">
                  <span className="text-indigo-400 text-xs">#</span><span className="text-indigo-300 text-xs font-medium">Global Room</span>
                </div>
                <div className="text-[10px] text-white/30 uppercase tracking-widest mt-3 mb-1 px-1">DMs</div>
                {[{ n: "J", c: "from-emerald-500 to-teal-600", on: true }, { n: "A", c: "from-pink-500 to-rose-600", on: false }, { n: "K", c: "from-amber-500 to-orange-600", on: true }].map((u, i) => (
                  <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg">
                    <div className="relative">
                      <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${u.c} text-white text-[10px] font-bold flex items-center justify-center`}>{u.n}</div>
                      {u.on && <span className="absolute -bottom-px -right-px w-2 h-2 bg-emerald-500 rounded-full border border-[#050508]" />}
                    </div>
                    <span className="text-white/50 text-xs">User {u.n}</span>
                  </div>
                ))}
              </div>
              {/* Messages */}
              <div className="flex-1 flex flex-col">
                <div className="flex-1 p-4 space-y-3 overflow-hidden">
                  {[
                    { t: "Hey everyone! 👋", me: false, u: "J" },
                    { t: "This app is so fast!", me: false, u: "A" },
                    { t: "Right? Real-time magic ✨", me: true },
                    { t: "Just sent a file too 📎", me: true },
                  ].map((m, i) => (
                    <div key={i} className={`flex ${m.me ? "justify-end" : "justify-start"} animate-chat-pop`} style={{ animationDelay: `${i * 150}ms` }}>
                      <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-[11px] ${m.me ? "bg-gradient-to-br from-indigo-600 to-purple-700 text-white rounded-tr-sm" : "bg-white/8 text-white/80 rounded-tl-sm"}`}>
                        {!m.me && <span className="text-indigo-400 font-semibold block text-[10px] mb-0.5">{m.u}</span>}
                        {m.t}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-3 pb-3">
                  <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                    <span className="flex-1 text-xs text-white/20">Message the room…</span>
                    <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center">
                      <ArrowRight className="w-3 h-3 text-white" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Social proof */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-slate-400">
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-500" />No credit card required</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-500" />Guest mode available</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-500" />Real-time by default</span>
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────────── */}
      <section id="features" className="py-28 bg-gradient-to-b from-white to-slate-50/80">
        <div ref={featSec.ref} className={`max-w-6xl mx-auto px-6 transition-all duration-700 ${featSec.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}`}>
          <div className="text-center mb-16">
            <span className="inline-block text-indigo-600 font-semibold text-sm uppercase tracking-widest mb-4">Everything you need</span>
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-5">Built for real conversations</h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto">From quick DMs to file sharing, every feature is designed around speed and simplicity.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, title, desc }, i) => (
              <div key={title} className="group relative bg-white rounded-2xl border border-slate-100 p-6 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-100/50 transition-all duration-300 hover:-translate-y-1"
                style={{ transitionDelay: `${i * 60}ms` }}>
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 flex items-center justify-center mb-4 group-hover:from-indigo-600 group-hover:to-purple-600 group-hover:border-transparent transition-all duration-300">
                  <Icon className="w-5 h-5 text-indigo-600 group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="font-bold text-slate-900 mb-2">{title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it Works ────────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-28 bg-white">
        <div ref={stepSec.ref} className={`max-w-5xl mx-auto px-6 transition-all duration-700 ${stepSec.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}`}>
          <div className="text-center mb-16">
            <span className="inline-block text-indigo-600 font-semibold text-sm uppercase tracking-widest mb-4">Simple setup</span>
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-5">Up and running in 60 seconds</h2>
            <p className="text-slate-500 text-lg max-w-xl mx-auto">No downloads, no installs. Just open the app and start connecting.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-10 left-[calc(16.66%+1.5rem)] right-[calc(16.66%+1.5rem)] h-px bg-gradient-to-r from-indigo-200 via-purple-300 to-indigo-200" />

            {steps.map(({ n, title, desc }, i) => (
              <div key={n} className="relative flex flex-col items-center text-center" style={{ transitionDelay: `${i * 120}ms` }}>
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center mb-6 shadow-xl shadow-indigo-300/40 z-10">
                  <span className="text-white text-2xl font-black">{n}</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-3">{title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          <div className="flex justify-center mt-14">
            <Link href="/chat"
              className="group flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold px-8 py-4 rounded-2xl shadow-xl shadow-indigo-300/40 transition-all hover:-translate-y-1 text-base">
              Try it now — it's free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Testimonials ────────────────────────────────────────────────────── */}
      <section id="testimonials" className="py-28 bg-gradient-to-b from-slate-50/80 to-white">
        <div ref={testSec.ref} className={`max-w-6xl mx-auto px-6 transition-all duration-700 ${testSec.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}`}>
          <div className="text-center mb-16">
            <span className="inline-block text-indigo-600 font-semibold text-sm uppercase tracking-widest mb-4">Loved by users</span>
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-5">People are talking</h2>
            <div className="flex items-center justify-center gap-1 mb-2">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />)}
              <span className="ml-2 text-slate-500 text-sm font-medium">5.0 from early users</span>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map(({ name, role, avatar, text }, i) => (
              <div key={name} className="bg-white rounded-2xl border border-slate-100 p-7 shadow-sm hover:shadow-xl hover:shadow-indigo-100/40 hover:-translate-y-1 transition-all duration-300"
                style={{ transitionDelay: `${i * 80}ms` }}>
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, j) => <Star key={j} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-slate-600 text-sm leading-relaxed mb-6">"{text}"</p>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                    {avatar}
                  </div>
                  <div>
                    <p className="text-slate-900 font-bold text-sm">{name}</p>
                    <p className="text-slate-400 text-xs">{role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats Banner ────────────────────────────────────────────────────── */}
      <section className="py-16 bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-700 overflow-hidden relative">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:64px_64px]" />
        <div className="relative max-w-5xl mx-auto px-6 grid sm:grid-cols-3 gap-8 text-center text-white">
          {[["∞", "Messages delivered"], ["< 50ms", "Average latency"], ["100%", "Uptime SLA"]].map(([val, label]) => (
            <div key={label}>
              <div className="text-4xl font-black mb-1">{val}</div>
              <div className="text-indigo-200 text-sm font-medium">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────────── */}
      <section id="cta" className="py-32 bg-white">
        <div ref={ctaSec.ref} className={`max-w-4xl mx-auto px-6 text-center transition-all duration-700 ${ctaSec.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}`}>
          <div className="relative bg-gradient-to-br from-indigo-600 via-purple-700 to-violet-800 rounded-3xl p-12 md:p-20 overflow-hidden shadow-2xl shadow-indigo-500/30">
            {/* Background decoration */}
            <div className="absolute top-[-40%] right-[-10%] w-80 h-80 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute bottom-[-40%] left-[-10%] w-80 h-80 bg-white/10 rounded-full blur-3xl" />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 bg-white/15 border border-white/20 text-white/90 text-xs font-semibold px-4 py-2 rounded-full mb-8">
                <Smile className="w-3.5 h-3.5" />
                Free forever for individuals
              </div>
              <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-6 leading-tight">
                Ready to start a real<br />conversation?
              </h2>
              <p className="text-indigo-200 text-lg mb-10 max-w-xl mx-auto">
                Join InsForge Chat today. No account needed to explore — guest mode gets you started in seconds.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/chat"
                  className="group flex items-center gap-2 bg-white text-indigo-700 font-bold px-8 py-4 rounded-2xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all text-base">
                  Open the app
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link href="/chat"
                  className="flex items-center gap-2 border-2 border-white/30 hover:border-white/60 text-white font-semibold px-8 py-4 rounded-2xl transition-all text-base hover:bg-white/10">
                  Continue as Guest
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="bg-slate-900 text-white py-14">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 text-white" />
                </div>
                <span className="font-extrabold text-lg">InsForge Chat</span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
                Real-time messaging built on the InsForge platform. Fast, reliable, and beautifully simple.
              </p>
            </div>

            {/* Product */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">Product</p>
              <ul className="space-y-3">
                {["Features", "How it works", "Open App"].map(l => (
                  <li key={l}>
                    <a href={l === "Open App" ? "/chat" : `#${l.toLowerCase().replace(/ /g, "-")}`}
                      className="text-sm text-slate-400 hover:text-white transition-colors">{l}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Built with */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">Built with</p>
              <ul className="space-y-3">
                {["Next.js 16", "InsForge SDK", "Tailwind CSS 3", "TypeScript"].map(l => (
                  <li key={l}><span className="text-sm text-slate-400">{l}</span></li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-slate-500 text-sm">© {new Date().getFullYear()} InsForge Chat. All rights reserved.</p>
            <div className="flex items-center gap-1 text-slate-500 text-sm">
              <span>Powered by</span>
              <a href="https://insforge.com" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors ml-1">InsForge</a>
            </div>
          </div>
        </div>
      </footer>

      {/* ── Global animation styles ──────────────────────────────────────────── */}
      <style jsx global>{`
        @keyframes blob {
          0%, 100% { transform: translate(0,0) scale(1); }
          33%       { transform: translate(20px,-20px) scale(1.05); }
          66%       { transform: translate(-15px,15px) scale(0.97); }
        }
        .animate-blob { animation: blob 10s ease-in-out infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }

        @keyframes chat-pop {
          from { opacity: 0; transform: translateY(8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-chat-pop {
          animation: chat-pop 0.5s ease forwards;
          opacity: 0;
        }

        html { scroll-behavior: smooth; }
      `}</style>
    </div>
  );
}
