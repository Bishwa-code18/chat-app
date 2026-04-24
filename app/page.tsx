"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  MessageCircle, Zap, Shield, Image as ImageIcon,
  ArrowRight, Search, Globe, Menu, X,
  Users, Lock, Star, Sparkles, Send, PlayCircle, Heart, Check
} from "lucide-react";

// ─── Animation Hook ──────────────────────────────────────────────────────────
function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);
  return { ref, inView };
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const { ref: heroRef, inView: heroInView } = useInView(0.1);
  const { ref: aboutRef, inView: aboutInView } = useInView(0.2);
  const { ref: featuresRef, inView: featuresInView } = useInView(0.1);
  const { ref: testimonialsRef, inView: testimonialsInView } = useInView(0.1);
  const { ref: ctaRef, inView: ctaInView } = useInView(0.2);

  return (
    <div className="min-h-screen bg-[#fafafa] text-slate-800 font-sans overflow-x-hidden selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* ── Navbar ──────────────────────────────────────────────────────────── */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${scrolled ? "bg-white/70 backdrop-blur-xl border-b border-slate-200/50 py-3 shadow-sm" : "bg-transparent py-5"}`}>
        <div className="max-w-7xl mx-auto px-6 sm:px-10 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center shadow-md shadow-indigo-200 group-hover:shadow-lg transition-all group-hover:-translate-y-0.5">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900">Chat-me</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-8">
            {["About", "Features", "Testimonials"].map(item => (
              <a key={item} href={`#${item.toLowerCase()}`} className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
                {item}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-4">
            <Link href="/chat" className="text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors">
              Sign In
            </Link>
            <Link href="/chat" className="text-sm font-semibold text-white bg-slate-900 hover:bg-indigo-600 px-5 py-2.5 rounded-full shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300">
              Get Started
            </Link>
          </div>

          <button className="md:hidden text-slate-600 p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        <div className={`md:hidden absolute top-full left-0 w-full bg-white border-b border-slate-100 shadow-xl transition-all duration-300 overflow-hidden ${mobileMenuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}>
          <div className="flex flex-col p-6 gap-4">
            {["About", "Features", "Testimonials"].map(item => (
              <a key={item} href={`#${item.toLowerCase()}`} onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-slate-600 hover:text-indigo-600 border-b border-slate-50 pb-2">
                {item}
              </a>
            ))}
            <Link href="/chat" className="text-center w-full mt-2 text-sm font-semibold text-white bg-slate-900 px-5 py-3 rounded-xl">
              Get Started for Free
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero Section ────────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden px-6 lg:px-8">
        {/* Abstract Background Elements */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-5xl aspect-square flex justify-center items-center pointer-events-none -z-10">
          <div className="absolute w-[800px] h-[800px] bg-gradient-to-tr from-indigo-100 via-purple-50 to-amber-50 rounded-full blur-3xl opacity-70 animate-float" />
          <div className="absolute right-[-10%] top-[-10%] w-[500px] h-[500px] bg-blue-50 rounded-full blur-3xl opacity-80 animate-float-delayed" />
        </div>

        <div ref={heroRef} className={`max-w-5xl mx-auto text-center transition-all duration-1000 ease-out transform ${heroInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}`}>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm mb-8 animate-fade-in-up">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            <span className="text-xs font-semibold tracking-wide text-slate-600">Chat-me 2.0 is live</span>
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight text-slate-900 mb-6 leading-tight">
            Connect <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-violet-500">beautifully</span>, <br className="hidden md:block"/> chat instantly.
          </h1>
          
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-500 mb-10 leading-relaxed font-medium">
            A modern, lightning-fast chat application designed for seamless communication. Clean interfaces, zero lag, and an experience your users will love.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20 animate-fade-in-up animation-delay-200">
            <Link href="/chat" className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-full font-semibold text-lg hover:shadow-2xl hover:shadow-slate-900/20 hover:-translate-y-1 transition-all duration-300">
              Start chatting
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a href="#about" className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 px-8 py-4 rounded-full font-semibold text-lg transition-all duration-300">
              <PlayCircle className="w-5 h-5 text-slate-400" />
              See how it works
            </a>
          </div>

          {/* Floating UI Mockup */}
          <div className="relative mx-auto mt-10 max-w-4xl z-10 perspective-1000 animate-fade-in-up animation-delay-400">
            <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent z-20 pointer-events-none rounded-b-3xl"></div>
            
            <div className="relative rounded-3xl bg-white border border-slate-200 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] overflow-hidden transform rotate-x-12 hover:rotate-x-0 transition-transform duration-700 ease-out">
              {/* App Header */}
              <div className="flex items-center gap-2 px-4 py-3 bg-slate-50/80 border-b border-slate-100 backdrop-blur-md">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                  <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                </div>
                <div className="mx-auto flex items-center gap-1.5 px-3 py-1 bg-white rounded-md shadow-sm border border-slate-100">
                  <Lock className="w-3 h-3 text-slate-400" />
                  <span className="text-xs text-slate-500 font-medium font-mono">chat-me.site</span>
                </div>
              </div>
              
              {/* App Body */}
              <div className="flex h-[400px]">
                {/* Sidebar */}
                <div className="w-64 bg-slate-50 border-r border-slate-100 p-4 hidden md:flex flex-col gap-4 hidden-scrollbar">
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-2">Channels</h4>
                    <div className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-2 rounded-lg font-medium text-sm border border-indigo-100 shadow-sm">
                      <Globe className="w-4 h-4" /> Global Room
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-2 mt-4">Direct Messages</h4>
                    {["Alice", "Bob", "Charlie"].map((name, i) => (
                      <div key={name} className="flex items-center gap-3 px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors">
                        <div className="relative">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-inner bg-gradient-to-br ${i === 0 ? "from-pink-400 to-rose-500" : i === 1 ? "from-blue-400 to-cyan-500" : "from-amber-400 to-orange-500"}`}>
                            {name[0]}
                          </div>
                          <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${i !== 2 ? 'bg-emerald-400' : 'bg-slate-300'}`}></div>
                        </div>
                        <span className="text-sm font-medium">{name}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Main Chat Area */}
                <div className="flex-1 bg-white flex flex-col relative w-full">
                   <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-[0.3]"></div>
                   
                   <div className="flex-1 p-6 flex flex-col gap-4 overflow-hidden relative z-10">
                     <div className="flex gap-3">
                       <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white text-xs font-bold shrink-0">A</div>
                       <div className="bg-slate-100 text-slate-700 px-4 py-2.5 rounded-2xl rounded-tl-none text-sm max-w-[80%] shadow-sm">
                         Hey everyone! Has anyone checked out the new light mode?
                       </div>
                     </div>
                     <div className="flex gap-3">
                       <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white text-xs font-bold shrink-0">B</div>
                       <div className="bg-slate-100 text-slate-700 px-4 py-2.5 rounded-2xl rounded-tl-none text-sm max-w-[80%] shadow-sm">
                         Yes! It is incredibly clean. The typography is spot on. ✨
                       </div>
                     </div>
                     <div className="flex gap-3 flex-row-reverse">
                       <div className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white px-4 py-2.5 rounded-2xl rounded-tr-none text-sm max-w-[80%] shadow-md">
                         It really makes the content pop. Wait until you see the animations!
                       </div>
                     </div>
                   </div>

                   {/* Input Area */}
                   <div className="p-4 bg-white/80 backdrop-blur border-t border-slate-100 z-10 m-4 rounded-xl shadow-sm border">
                     <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-full px-4 py-2">
                       <span className="text-slate-400 text-sm flex-1">Type a message...</span>
                       <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center shadow-md">
                         <Send className="w-4 h-4 text-white ml-auto mr-auto" />
                       </div>
                     </div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── About Section ───────────────────────────────────────────────────── */}
      <section id="about" className="py-24 bg-white border-y border-slate-100 relative overflow-hidden">
        <div ref={aboutRef} className={`max-w-7xl mx-auto px-6 sm:px-10 transition-all duration-1000 transform ${aboutInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-16"}`}>
          <div className="grid md:grid-cols-2 gap-16 items-center">
            
            <div className="order-2 md:order-1 relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-3xl transform rotate-3 scale-105 z-0" />
              <div className="relative z-10 bg-white p-8 sm:p-10 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Seamless Experience</h3>
                    <p className="text-slate-500 text-sm">Crafted for human connection</p>
                  </div>
                </div>
                <p className="text-slate-600 text-lg leading-relaxed mb-6 font-medium">
                  We believe communication tools should get out of your way. That&apos;s why we reimagined the chat experience from the ground up, combining WebSockets with a pristine, distraction-free interface.
                </p>
                <div className="flex flex-col gap-3">
                  {[
                    "Zero-latency message delivery",
                    "Intuitive file sharing capabilities",
                    "Private and global channels"
                  ].map((feature, i) => (
                    <div key={i} className="flex items-center gap-3 text-slate-700 font-medium">
                      <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                        <Check className="w-4 h-4 text-emerald-600" />
                      </div>
                      {feature}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="order-1 md:order-2">
              <span className="text-indigo-600 font-bold tracking-wider uppercase text-sm mb-4 block">About our app</span>
              <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 leading-tight">
                Designed to make every conversation <span className="underline decoration-indigo-200 decoration-wavy underline-offset-4">matter.</span>
              </h2>
                <p className="text-xl text-slate-500 mb-8 leading-relaxed">
                Most chat apps are cluttered and heavy. Chat-me delivers an airy, light-mode-first aesthetic that feels less like software and more like a simple extension of your thoughts.
              </p>
              <Link href="/chat" className="inline-flex items-center gap-2 text-indigo-600 font-bold group text-lg">
                Discover the magic 
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* ── Features Section ────────────────────────────────────────────────── */}
      <section id="features" className="py-32 bg-[#fafafa]">
        <div ref={featuresRef} className={`max-w-7xl mx-auto px-6 sm:px-10 transition-all duration-1000 transform ${featuresInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-16"}`}>
          
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6">Powerful features wrapped in absolute simplicity.</h2>
            <p className="text-xl text-slate-500 font-medium">Everything you need to collaborate, share, and connect without the bloat.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Zap, title: "Lightning Fast", desc: "Powered by real-time WebSockets, messages appear instantly across all devices. No refreshing required.", color: "text-amber-500", bg: "bg-amber-100" },
              { icon: Shield, title: "Secure by Design", desc: "Your conversations are protected with robust authentication. Join easily as a guest or create a secure persistent account.", color: "text-emerald-500", bg: "bg-emerald-100" },
              { icon: Globe, title: "Global & Private", desc: "Jump into the global room to meet new people, or search for a username to start a private direct message instantly.", color: "text-blue-500", bg: "bg-blue-100" },
              { icon: ImageIcon, title: "Rich File Sharing", desc: "Drag and drop images, PDFs, and documents directly into the chat. Instant previews make sharing effortless.", color: "text-purple-500", bg: "bg-purple-100" },
              { icon: Users, title: "Live Presence", desc: "See exactly who is online and when they are typing with real-time green indicators and dynamic animations.", color: "text-rose-500", bg: "bg-rose-100" },
              { icon: Search, title: "Instant Search", desc: "Find any user in milliseconds. Our optimized search makes connecting with the right person faster than ever.", color: "text-indigo-500", bg: "bg-indigo-100" }
            ].map((feature, i) => (
              <div key={i} className="group bg-white rounded-3xl p-8 border border-slate-100 shadow-sm hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] transition-all duration-300 hover:-translate-y-1">
                <div className={`w-14 h-14 rounded-2xl ${feature.bg} ${feature.color} flex items-center justify-center mb-6 transform group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-slate-500 leading-relaxed font-medium">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials Section ────────────────────────────────────────────── */}
      <section id="testimonials" className="py-32 bg-white border-y border-slate-100 relative overflow-hidden">
        {/* Soft background shape */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/3 w-[800px] h-[800px] bg-slate-50 rounded-full blur-3xl opacity-50 z-0"></div>
        
        <div ref={testimonialsRef} className={`relative z-10 max-w-7xl mx-auto px-6 sm:px-10 transition-all duration-1000 transform ${testimonialsInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-16"}`}>
          <div className="text-center mb-20">
            <span className="text-indigo-600 font-bold tracking-wider uppercase text-sm mb-4 block">Wall of Love</span>
            <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900">Don&apos;t just take our word for it.</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { name: "Sarah Jenkins", role: "Product Designer", text: "The light mode aesthetic is perfection. It feels like breathing fresh air compared to the heavy chat apps we used to use. It's incredibly fast too.", avatar: "S", color: "from-purple-500 to-indigo-500" },
              { name: "David Chen", role: "Software Engineer", text: "As a developer, I appreciate the real-time websocket implementation. There's zero latency. File sharing works flawlessly and the UI is just incredibly crisp.", avatar: "D", color: "from-emerald-400 to-teal-500" },
              { name: "Maya Patel", role: "Community Manager", text: "We moved our entire community to Chat-me. The global room makes onboarding new members fun, and the direct messaging is super reliable.", avatar: "M", color: "from-rose-400 to-orange-500" },
            ].map((test, i) => (
              <div key={i} className="bg-slate-50 rounded-3xl p-8 border border-slate-100 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300">
                <div className="flex items-center gap-1 mb-6">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="w-5 h-5 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-slate-700 text-lg mb-8 leading-relaxed font-medium">&quot;{test.text}&quot;</p>
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${test.color} flex items-center justify-center text-white font-bold text-lg shadow-inner`}>
                    {test.avatar}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">{test.name}</h4>
                    <span className="text-sm text-slate-500 font-medium">{test.role}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Section ─────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 lg:px-8 bg-[#fafafa]">
        <div ref={ctaRef} className={`max-w-6xl mx-auto transition-all duration-1000 transform ${ctaInView ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-10"}`}>
          <div className="relative bg-slate-900 rounded-[3rem] p-12 md:p-20 overflow-hidden text-center shadow-2xl shadow-slate-900/20">
            {/* Dark background lighting effects */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-2xl bg-gradient-to-b from-indigo-500/30 to-transparent blur-3xl rounded-full pointer-events-none"></div>
            
            <div className="relative z-10">
              <h2 className="text-4xl md:text-6xl font-extrabold text-white mb-6 tracking-tight">
                Ready to elevate your chat?
              </h2>
              <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto font-medium">
                Join thousands of users who have already switched to the sleekest, fastest chat experience on the web. No credit card required.
              </p>
              
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link href="/chat" className="bg-white text-slate-900 hover:bg-slate-50 px-8 py-4 rounded-full font-bold text-lg transition-all duration-300 hover:scale-105 shadow-xl">
                  Create free account
                </Link>
                <Link href="/chat" className="bg-slate-800 border border-slate-700 text-white hover:bg-slate-700 px-8 py-4 rounded-full font-bold text-lg transition-all duration-300">
                  Try as Guest
                </Link>
              </div>
              <p className="mt-8 text-slate-400 text-sm font-medium flex items-center justify-center gap-2">
                <Lock className="w-4 h-4" /> Secure and encrypted by default
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="bg-white border-t border-slate-100 py-16 text-center md:text-left">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 grid md:grid-cols-4 gap-12 md:gap-8">
          
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="inline-flex items-center justify-center md:justify-start gap-2.5 mb-6 group">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-xl tracking-tight text-slate-900">Chat-me</span>
            </Link>
            <p className="text-slate-500 max-w-sm mx-auto md:mx-0 font-medium leading-relaxed">
              Redefining real-time communication with elegant design, powerful WebSockets, and unbreakable security. 
            </p>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 mb-6 uppercase tracking-wider text-sm">Product</h4>
            <ul className="space-y-4 font-medium">
              {["Features", "Testimonials", "Pricing", "About Us"].map(l => (
                <li key={l}>
                  <a href={`#${l.toLowerCase()}`} className="text-slate-500 hover:text-indigo-600 transition-colors">{l}</a>
                </li>
              ))}
            </ul>
          </div>
          
          <div>
            <h4 className="font-bold text-slate-900 mb-6 uppercase tracking-wider text-sm">Legal</h4>
            <ul className="space-y-4 font-medium">
              {["Privacy Policy", "Terms of Service", "Cookie Policy", "Contact Support"].map(l => (
                <li key={l}>
                  <a href="#" className="text-slate-500 hover:text-indigo-600 transition-colors">{l}</a>
                </li>
              ))}
            </ul>
          </div>

        </div>

        <div className="max-w-7xl mx-auto px-6 sm:px-10 mt-16 pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-400 text-sm font-medium">
            © {new Date().getFullYear()} Chat-me. All rights reserved.
          </p>
          <div className="flex items-center gap-2 text-sm font-medium text-slate-400">
            Designed with <Heart className="w-4 h-4 text-rose-500 fill-rose-500" /> by You
          </div>
        </div>
      </footer>

      {/* ── Global Styles ───────────────────────────────────────────────────── */}
      <style jsx global>{`
        html {
          scroll-behavior: smooth;
        }

        /* Hide scrollbar for a cleaner look in the mockup */
        .hidden-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hidden-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-30px) scale(1.05); }
        }
        
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0) scale(1.05); }
          50% { transform: translateY(30px) scale(1); }
        }

        @keyframes fade-in-up {
          0% {
            opacity: 0;
            transform: translateY(20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-float {
          animation: float 12s ease-in-out infinite;
        }
        
        .animate-float-delayed {
          animation: float-delayed 14s ease-in-out infinite;
          animation-delay: 2s;
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out forwards;
          opacity: 0;
        }

        .animation-delay-200 { animation-delay: 200ms; }
        .animation-delay-400 { animation-delay: 400ms; }

        .perspective-1000 {
          perspective: 1000px;
        }
        .rotate-x-12 {
          transform: rotateX(12deg) rotateY(-5deg) scale(0.95);
        }
        .hover\\:rotate-x-0:hover {
          transform: rotateX(0) rotateY(0) scale(1);
        }
      `}</style>
    </div>
  );
}
