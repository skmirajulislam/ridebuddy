"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Shield,
  Camera,
  Navigation,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Radio,
  Building2,
  ChevronDown,
  CloudUpload,
  Award,
  Globe,
  AlertTriangle,
  Droplets,
  Bot,
  Zap,
  Volume2,
  Landmark,
  Map as MapIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import AuthModal from "../_components/AuthModal";

export default function WelcomePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");

  const openAuth = (mode: "signin" | "signup") => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 selection:bg-cyan-500 selection:text-black overflow-x-hidden font-sans relative">
      {/* ── Lightweight Static Ambient Background (Zero GPU Lag) ───────── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-40">
        <div className="absolute -top-40 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full" />
        <div className="absolute top-[600px] -right-20 w-96 h-96 bg-indigo-600/10 rounded-full" />
        <div className="absolute top-[1400px] -left-20 w-96 h-96 bg-blue-600/10 rounded-full" />
      </div>

      {/* ── Sticky Navbar ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-[#07090e]/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
              <Shield className="h-6 w-6" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tight text-white flex items-center gap-1.5">
                RideBuddy
                <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
              </span>
              <span className="text-[11px] font-semibold tracking-wider uppercase text-cyan-400">
                AI Safety Radar
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#how-it-works" className="hover:text-cyan-400 transition-colors">
              How It Works
            </a>
            <a href="#features" className="hover:text-cyan-400 transition-colors">
              Safety Arsenal
            </a>
            <a href="#govops" className="hover:text-cyan-400 transition-colors flex items-center gap-1.5 text-cyan-300">
              <Building2 className="h-4 w-4" />
              GovOps Portal
            </a>
            <a href="#faq" className="hover:text-cyan-400 transition-colors">
              FAQ
            </a>
          </nav>

          {/* Right CTAs */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex"
              onClick={() => openAuth("signin")}
            >
              Sign In
            </Button>
            <Link href="/">
              <Button variant="default" size="sm" className="shadow-cyan-500/20">
                <Navigation className="h-4 w-4" />
                <span>Launch Map</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero Section ──────────────────────────────────────────────── */}
      <section className="relative pt-12 pb-16 md:pt-20 md:pb-28 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Top Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 text-xs sm:text-sm font-semibold mb-8 shadow-sm">
            <Sparkles className="h-4 w-4 text-cyan-400" />
            <span>AI-Verified Road Hazard Radar & Smart Navigation</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-5xl mx-auto leading-[1.1]">
            Navigate Every Road <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">
              Safely, Intelligently, Fearlessly.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-base sm:text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed">
            RideBuddy empowers millions of daily commuters and riders with real-time road hazard alerts. Avoid suspension-breaking potholes, submerged underpasses, accidents, and sudden roadblocks using <strong>Google Gemini Vision AI</strong> verification and hazard-scored routing.
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md sm:max-w-none mx-auto">
            <Button
              size="lg"
              className="w-full sm:w-auto text-base h-13 px-8 shadow-xl shadow-cyan-500/20"
              onClick={() => openAuth("signup")}
            >
              <span>Start Navigating Free</span>
              <ArrowRight className="h-5 w-5" />
            </Button>

            <Link href="/" className="w-full sm:w-auto">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto text-base h-13 px-8">
                <Globe className="h-5 w-5 text-cyan-400" />
                <span>Explore Live Radar Map</span>
              </Button>
            </Link>

            <Link href="/gov/login" className="w-full sm:w-auto">
              <Button variant="gov" size="lg" className="w-full sm:w-auto text-base h-13 px-8">
                <Building2 className="h-5 w-5" />
                <span>Government Portal</span>
              </Button>
            </Link>
          </div>

          {/* ── Hero Cockpit & Radar Card Mockup ───────────────────────── */}
          <div className="mt-14 max-w-5xl mx-auto relative">
            <div className="rounded-3xl border border-slate-700/70 bg-slate-900 shadow-2xl overflow-hidden">
              {/* Window Header */}
              <div className="h-12 border-b border-slate-800 bg-slate-950 px-4 sm:px-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500/80" />
                  <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                  <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                </div>
                <div className="text-xs font-mono text-slate-400 truncate max-w-[200px] sm:max-w-none flex items-center gap-2">
                  <Shield className="h-3.5 w-3.5 text-cyan-400" />
                  <span>ridebuddy.app/navigation — Active Highway Radar</span>
                </div>
                <Badge variant="success" className="text-[11px] py-0.5">
                  <Radio className="h-3 w-3 animate-ping" />
                  <span>LIVE RADAR</span>
                </Badge>
              </div>

              {/* Window Content / Optimized Next.js Image */}
              <div className="relative h-72 sm:h-[460px] w-full overflow-hidden bg-slate-950">
                <Image
                  src="https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=75"
                  alt="Modern driving car on open highway"
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 1024px"
                  className="object-cover opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#07090e] via-slate-950/40 to-transparent" />

                {/* Floating Hazard Alert 1 */}
                <div className="absolute top-6 left-4 sm:left-8 max-w-xs sm:max-w-sm rounded-2xl border border-red-500/40 bg-slate-950/90 p-3.5 sm:p-4 shadow-2xl text-left transform-gpu hover:scale-102 transition-transform">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-bold text-white">
                        Severe Pothole Cluster — 140m Ahead
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-semibold">
                          <Bot className="w-3 h-3" />
                          <span>96% AI Verified</span>
                        </span>
                        <span className="text-[11px] text-slate-400">Severity Level 3</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating Hazard Alert 2 */}
                <div className="hidden sm:block absolute top-24 right-8 max-w-sm rounded-2xl border border-sky-500/40 bg-slate-950/90 p-4 shadow-2xl text-left transform-gpu hover:scale-102 transition-transform">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center flex-shrink-0">
                      <Droplets className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">
                        Waterlogged Underpass
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold">
                          <Zap className="w-3 h-3" />
                          <span>Safe Reroute: Flyover (+2 min)</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Route Status Pill */}
                <div className="absolute bottom-6 right-4 sm:right-8 rounded-full border border-cyan-500/40 bg-slate-950/95 px-4 sm:px-6 py-2.5 flex items-center gap-3 shadow-xl">
                  <div className="h-2.5 w-2.5 rounded-full bg-cyan-400 animate-ping" />
                  <span className="text-xs sm:text-sm font-bold text-cyan-300">
                    SAFEST ROUTE ACTIVE
                  </span>
                  <span className="text-xs text-slate-300 hidden sm:inline">
                    • 0 Unverified Hazards on Path
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Key Impact Stats Banner ──────────────────────────────────── */}
      <section className="border-y border-slate-800/80 bg-slate-950/80 py-12 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">14,200+</div>
              <div className="text-xs sm:text-sm font-medium text-slate-400">Hazards Neutralized</div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-extrabold text-cyan-400 tracking-tight">85,000+</div>
              <div className="text-xs sm:text-sm font-medium text-slate-400">Kilometers Scanned</div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-extrabold text-indigo-400 tracking-tight">&lt; 800ms</div>
              <div className="text-xs sm:text-sm font-medium text-slate-400">Gemini Vision AI Speed</div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-extrabold text-emerald-400 tracking-tight">99.4%</div>
              <div className="text-xs sm:text-sm font-medium text-slate-400">Detection Accuracy</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works (3 Steps) ────────────────────────────────────── */}
      <section id="how-it-works" className="py-20 sm:py-28 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
            <Badge variant="purple" className="mb-4">
              3-STEP INTELLIGENCE PIPELINE
            </Badge>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
              How RideBuddy Keeps Every Commute Safe
            </h2>
            <p className="mt-4 text-base sm:text-lg text-slate-400">
              From the instant a pothole is photographed to the second thousands of nearby vehicles avoid it — seamlessly automated.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <Card className="hover:border-cyan-500/50 group overflow-hidden bg-slate-900/80">
              <div className="h-52 relative overflow-hidden bg-slate-950">
                <Image
                  src="https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=600&q=75"
                  alt="Driver reporting road condition"
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-300 opacity-80"
                />
                <span className="absolute top-3 right-3 px-3 py-1 rounded-lg bg-black/80 font-mono text-xs font-bold text-cyan-400 border border-cyan-500/30">
                  STEP 01
                </span>
              </div>
              <CardContent className="p-6">
                <div className="h-10 w-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-4">
                  <Camera className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">1-Tap Camera Capture</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Spot a broken road, flood, or accident? Tap the report button. High-precision GPS coordinates, bearing, and photo evidence are captured in a single tap.
                </p>
              </CardContent>
            </Card>

            {/* Step 2 */}
            <Card className="hover:border-indigo-500/50 group overflow-hidden bg-slate-900/80">
              <div className="h-52 relative overflow-hidden bg-slate-950">
                <Image
                  src="https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=600&q=75"
                  alt="AI neural validation"
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-300 opacity-80"
                />
                <span className="absolute top-3 right-3 px-3 py-1 rounded-lg bg-black/80 font-mono text-xs font-bold text-indigo-400 border border-indigo-500/30">
                  STEP 02
                </span>
              </div>
              <CardContent className="p-6">
                <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-4">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Google Gemini AI Verification</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Our embedded Gemini Vision AI analyzes the photo in real-time, verifying severity, categorizing conditions, and filtering out fake reports or spam.
                </p>
              </CardContent>
            </Card>

            {/* Step 3 */}
            <Card className="hover:border-sky-500/50 group overflow-hidden bg-slate-900/80">
              <div className="h-52 relative overflow-hidden bg-slate-950">
                <Image
                  src="https://images.unsplash.com/photo-1508974239320-0a029497e820?auto=format&fit=crop&w=600&q=75"
                  alt="Safe highway navigation at night"
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-300 opacity-80"
                />
                <span className="absolute top-3 right-3 px-3 py-1 rounded-lg bg-black/80 font-mono text-xs font-bold text-sky-400 border border-sky-500/30">
                  STEP 03
                </span>
              </div>
              <CardContent className="p-6">
                <div className="h-10 w-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center mb-4">
                  <Navigation className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Hazard-Scored Smart Routing</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  The OSRM routing engine recalculates path safety scores. Drivers receive 300m voice proximity alerts and automatic alternative paths that bypass danger.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ── Safety Arsenal (Features Grid) ────────────────────────────── */}
      <section id="features" className="py-20 bg-slate-950/70 border-t border-slate-800/80 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
            <Badge variant="default" className="mb-4">
              SAFETY ARSENAL
            </Badge>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
              Built for Tough Roads & Harsh Commutes
            </h2>
            <p className="mt-4 text-base sm:text-lg text-slate-400">
              Engineered with advanced algorithms to protect your suspension, prevent accidents, and save lives.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            <Card className="hover:border-cyan-500/40 p-6 bg-slate-900/80">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center mb-5">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Pothole & Surface Radar</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Detect hidden potholes and broken tarmac before you hit them. Save thousands on rim, tire, and suspension repairs.
              </p>
            </Card>

            <Card className="hover:border-blue-500/40 p-6 bg-slate-900/80">
              <div className="h-12 w-12 rounded-2xl bg-blue-500/15 text-blue-400 flex items-center justify-center mb-5">
                <Droplets className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Monsoon & Waterlog Alerts</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Monsoon rain floods underpasses without warning. RideBuddy flags flooded streets and guides you via elevated bypasses.
              </p>
            </Card>

            <Card className="hover:border-red-500/40 p-6 bg-slate-900/80">
              <div className="h-12 w-12 rounded-2xl bg-red-500/15 text-red-400 flex items-center justify-center mb-5">
                <Volume2 className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Proximity Voice Warnings</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Audio radar alerts you 300 meters prior to dangerous hazards, sharp turns, or speed breakers so your eyes remain on the road.
              </p>
            </Card>

            <Card className="hover:border-emerald-500/40 p-6 bg-slate-900/80">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center mb-5">
                <CloudUpload className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">UploadThing Cloud Storage</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                High-speed permanent photo storage on UploadThing ensures crisp photo proof is available for municipal authorities.
              </p>
            </Card>

            <Card className="hover:border-purple-500/40 p-6 bg-slate-900/80">
              <div className="h-12 w-12 rounded-2xl bg-purple-500/15 text-purple-400 flex items-center justify-center mb-5">
                <Award className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Driver Milestone Badges</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Earn milestone achievements (50+, 100+, 500+ reports) and climb community safety leaderboards as an elite road guardian.
              </p>
            </Card>

            <Card className="hover:border-amber-500/40 p-6 bg-slate-900/80">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center mb-5">
                <Building2 className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Direct GovOps Pipeline</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Every verified hazard automatically syncs to the Government Operations Portal (`/gov`) for municipal action and repair tracking.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* ── GovOps Showcase ───────────────────────────────────────────── */}
      <section id="govops" className="py-20 sm:py-28 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-cyan-500/30 bg-slate-900 p-8 sm:p-12 lg:p-16 shadow-2xl overflow-hidden relative">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-7 space-y-6">
                <Badge variant="default" className="text-xs">
                  FOR MUNICIPAL & HIGHWAY AUTHORITIES
                </Badge>
                <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
                  GovOps Command Center: Fix Roads 3x Faster
                </h2>
                <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
                  Empower city engineers and public works departments with a centralized operations portal. Track citizen reports, inspect AI confidence ratings, monitor real-time repair progress, and resolve road hazards systematically.
                </p>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-3 text-sm text-slate-200">
                    <CheckCircle2 className="h-5 w-5 text-cyan-400 flex-shrink-0" />
                    <span><strong>Live Geospatial Heatmaps</strong> of active road hazards</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-200">
                    <CheckCircle2 className="h-5 w-5 text-cyan-400 flex-shrink-0" />
                    <span><strong>Status Lifecycle:</strong> Active &rarr; In Progress &rarr; Resolved</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-200">
                    <CheckCircle2 className="h-5 w-5 text-cyan-400 flex-shrink-0" />
                    <span><strong>Proximity Radar</strong> for field repair crews</span>
                  </div>
                </div>

                <div className="pt-4">
                  <Link href="/gov/login">
                    <Button variant="gov" size="lg" className="h-13 px-8 text-base">
                      <span>Access GovOps Operations Portal</span>
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="lg:col-span-5 relative">
                <div className="rounded-2xl border border-slate-700/80 overflow-hidden shadow-2xl relative h-72 sm:h-96 bg-slate-950">
                  <Image
                    src="https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&w=800&q=75"
                    alt="City operations and highway engineering"
                    fill
                    sizes="(max-width: 1024px) 100vw, 40vw"
                    className="object-cover opacity-90"
                  />
                  <div className="absolute bottom-4 right-4 flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-black/80 border border-cyan-500/40 text-cyan-300 text-xs font-bold backdrop-blur-md">
                    <Landmark className="h-3.5 w-3.5 text-cyan-400" />
                    <span>Authorized Officials Only</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ Section ───────────────────────────────────────────────── */}
      <section id="faq" className="py-20 bg-slate-950/80 border-t border-slate-800/80 relative z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">
              COMMON QUESTIONS
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "How does RideBuddy prevent duplicate reports?",
                a: "RideBuddy uses a precise Haversine distance formula with spatial indexing. If a hazard of the same category has already been reported within a 30-meter radius, RideBuddy automatically acknowledges the existing hazard and prevents duplicate entries.",
              },
              {
                q: "How does Google Gemini AI verify the hazard photo?",
                a: "When you capture a photo, Gemini Vision AI analyzes visual features in milliseconds, determining whether it represents genuine road damage, flooding, or an obstruction. Unrelated photos (e.g. selfies or indoor objects) are rejected automatically.",
              },
              {
                q: "Is RideBuddy free for individual drivers and riders?",
                a: "Yes! RideBuddy is 100% free for all citizens, drivers, two-wheeler riders, and delivery partners. Our mission is to make roads safer for everyone.",
              },
              {
                q: "How do Government and Municipal officials use the platform?",
                a: "Government officials log in through the GovOps Portal (/gov). They can view aggregated statistics across their jurisdiction, inspect photo proof and AI scores, dispatch road maintenance crews, and mark hazards as 'In Progress' or 'Resolved'.",
              },
            ].map((faq, idx) => (
              <div
                key={idx}
                onClick={() => toggleFaq(idx)}
                className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6 cursor-pointer hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center justify-between text-base sm:text-lg font-bold text-white">
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`h-5 w-5 text-cyan-400 transition-transform duration-200 ${
                      openFaq === idx ? "rotate-180" : ""
                    }`}
                  />
                </div>
                {openFaq === idx && (
                  <div className="mt-4 pt-4 border-t border-slate-800/80 text-sm sm:text-base text-slate-400 leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────── */}
      <section className="py-20 relative z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="rounded-3xl border border-slate-700/80 bg-slate-900 p-10 sm:p-16 shadow-2xl">
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
              Ready for a Safer, Smoother Commute?
            </h2>
            <p className="mt-4 text-base sm:text-xl text-slate-300 max-w-2xl mx-auto">
              Join thousands of smart drivers who navigate with real-time hazard intelligence every day.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                className="w-full sm:w-auto h-13 px-8 text-base"
                onClick={() => openAuth("signup")}
              >
                <span>Create Free Account</span>
                <ArrowRight className="h-5 w-5" />
              </Button>
              <Link href="/" className="w-full sm:w-auto">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto h-13 px-8 text-base flex items-center gap-2">
                  <span>Launch Live Map</span>
                  <MapIcon className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Auth Modal (In-Place Popup) ────────────────────────────────── */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultMode={authMode}
        onSuccess={() => {
          window.location.href = "/";
        }}
      />

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-16 relative z-10 text-sm text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
            <div className="space-y-4 md:col-span-1">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white">
                  <Shield className="h-4 w-4" />
                </div>
                <span className="text-lg font-bold text-white">RideBuddy</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Community-driven road hazard radar & AI navigation for every commuter and municipal authority.
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Citizen Navigation</h4>
              <ul className="space-y-2 text-xs">
                <li><Link href="/" className="hover:text-cyan-400 transition-colors">Live Hazard Map</Link></li>
                <li><Link href="/login" className="hover:text-cyan-400 transition-colors">Sign In / Register</Link></li>
                <li><Link href="/dashboard" className="hover:text-cyan-400 transition-colors">User Dashboard</Link></li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Government Portal</h4>
              <ul className="space-y-2 text-xs">
                <li><Link href="/gov/login" className="hover:text-cyan-400 transition-colors">GovOps Portal Login</Link></li>
                <li><Link href="/gov" className="hover:text-cyan-400 transition-colors">Executive Dashboard</Link></li>
                <li><Link href="/gov/hazards" className="hover:text-cyan-400 transition-colors">Hazard Records Table</Link></li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Platform Core</h4>
              <ul className="space-y-2 text-xs">
                <li className="text-slate-500">Google Gemini Vision AI</li>
                <li className="text-slate-500">UploadThing Storage</li>
                <li className="text-slate-500">OSRM Safe Routing</li>
                <li className="text-slate-500">MapLibre GL Vectors</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800/80 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <span>© {new Date().getFullYear()} RideBuddy Technologies. All rights reserved.</span>
            <span>Protecting drivers, riders, and city roads nationwide.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
