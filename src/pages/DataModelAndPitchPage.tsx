import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Layers, ShieldCheck, Database, Code, CheckCircle2,
  ChevronRight, ChevronLeft, ArrowRight, Laptop, Award, FileText
} from 'lucide-react';

export default function DataModelAndPitchPage() {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      title: 'Executive Vision: The AI-Native Creative Marketplace',
      tag: 'Challenge Brief Overview & Problem Statement',
      content: (
        <div className="space-y-6">
          <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
            Generative AI tools have given rise to an elite new class of creative professionals: AI filmmakers, generative animators, and prompt visual artists. However, traditional freelance marketplaces fail because they treat content like static stock assets without workflow provenance, tool verification, or model-aware licensing.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
              <span className="text-xs text-indigo-400 font-bold uppercase tracking-wider block mb-1">
                The Problem
              </span>
              <p className="text-xs text-gray-300 leading-relaxed">
                Brands struggle to verify genuine generative capabilities vs low-effort outputs, comprehend complex latent pipelines (ComfyUI, Sora), or secure commercial-use clearance.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
              <span className="text-xs text-purple-400 font-bold uppercase tracking-wider block mb-1">
                KontentX Solution
              </span>
              <p className="text-xs text-gray-300 leading-relaxed">
                An AI-native marketplace with verified tool credentials, generation pipeline inspection, prompt transparency, and structured multi-format brief matching.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
              <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider block mb-1">
                Value Unlocked
              </span>
              <p className="text-xs text-gray-300 leading-relaxed">
                10x faster campaign turnarounds, zero-hallucination trust guarantee, clear legal copyright indemnity, and escrow-governed milestone delivery.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Data Model Architecture: Profiles, Portfolios & Briefs',
      tag: 'Deliverable 2: Complete Data Model Documentation',
      content: (
        <div className="space-y-6">
          <p className="text-gray-300 text-xs sm:text-sm leading-relaxed">
            The platform data model connects brands and creators across four structured entities designed specifically for generative production pipelines.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Creator Profile Data Model */}
            <div className="p-4 rounded-2xl bg-[#0d0d14] border border-indigo-500/30">
              <div className="flex items-center gap-2 mb-2">
                <Database size={15} className="text-indigo-400" />
                <h4 className="font-bold text-white text-sm">CreatorProfile & Portfolio Model</h4>
              </div>
              <ul className="space-y-1.5 text-xs text-gray-300 font-mono">
                <li>• <strong className="text-indigo-300">tools[]:</strong> name, category ('video'|'image'|'3d'), verified, proficiency</li>
                <li>• <strong className="text-indigo-300">portfolioItems[]:</strong> mediaUrl, prompt, workflow pipeline, commercialLicense</li>
                <li>• <strong className="text-indigo-300">verifications[]:</strong> tool/workflow/identity badges, verifiedAt timestamp</li>
                <li>• <strong className="text-indigo-300">skills & specializations:</strong> e.g. 'Motion Graphics', 'Temporal Consistency'</li>
                <li>• <strong className="text-indigo-300">hourlyRate, rating, responseTime, availability</strong></li>
              </ul>
            </div>

            {/* Campaign Brief Data Model */}
            <div className="p-4 rounded-2xl bg-[#0d0d14] border border-purple-500/30">
              <div className="flex items-center gap-2 mb-2">
                <Database size={15} className="text-purple-400" />
                <h4 className="font-bold text-white text-sm">Creative Brief & Licensing Model</h4>
              </div>
              <ul className="space-y-1.5 text-xs text-gray-300 font-mono">
                <li>• <strong className="text-purple-300">format[]:</strong> aspectRatio ('9:16'|'16:9'|'1:1'), resolution, duration</li>
                <li>• <strong className="text-purple-300">commercialUse:</strong> allowed, exclusivity, duration, territory, platforms</li>
                <li>• <strong className="text-purple-300">deliverables[]:</strong> verified checklist with milestone handoffs</li>
                <li>• <strong className="text-purple-300">budget:</strong> min, max, currency, type ('fixed'|'hourly')</li>
                <li>• <strong className="text-purple-300">aiGenerated & rawIdea:</strong> prompt lineage for AI Brief Builder</li>
              </ul>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Bonus Feature 1: Creator Verification Signals Engine',
      tag: 'Visible Trust Indicators For Tools, Workflows & Work',
      content: (
        <div className="space-y-6">
          <p className="text-gray-300 text-xs sm:text-sm leading-relaxed">
            To prevent generative fraud and skill exaggeration, KontentX implements a three-tier Trust Protocol:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-emerald-500/30">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-2.5 font-bold">
                1
              </div>
              <h4 className="font-bold text-white text-sm">Tool API Benchmark</h4>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                Verification of direct API/Pro access to models (Sora, Runway Gen-3, Midjourney) via prompt consistency test suites.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-indigo-500/30">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-2.5 font-bold">
                2
              </div>
              <h4 className="font-bold text-white text-sm">Workflow Audit</h4>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                Creators submit repeatable ComfyUI JSON node trees, ControlNet seeds, or DaVinci grading LUTs to prove non-fluke mastery.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-purple-500/30">
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-2.5 font-bold">
                3
              </div>
              <h4 className="font-bold text-white text-sm">Client Work Attestation</h4>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                Completed brand deliverables undergo client signoff and on-chain / hash timestamping for verifiable portfolio provenance.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Bonus Feature 2: AI-Assisted Brief Builder',
      tag: 'From Rough Idea to Structured Campaign Specification',
      content: (
        <div className="space-y-6">
          <p className="text-gray-300 text-xs sm:text-sm leading-relaxed">
            Brands frequently lack knowledge of aspect ratios (16:9 vs 9:16), model suitability (Sora vs Stable Diffusion), or commercial legal terminology. The AI Brief Builder bridges this gap automatically.
          </p>

          <div className="p-5 rounded-2xl bg-purple-950/20 border border-purple-500/30 flex flex-col sm:flex-row items-center gap-4">
            <div className="p-3 rounded-2xl bg-purple-500/20 text-purple-300 shrink-0">
              <Sparkles size={24} />
            </div>
            <div className="text-xs sm:text-sm text-purple-200">
              <strong className="text-white block mb-1">Interactive Demonstration in App:</strong>
              Navigate to "Post Brief" and try typing: <em>"We want summer vibes for our beauty brand targeting young women"</em>. Watch the AI auto-synthesize aspect ratios, deliverables, model suggestions, and 2-year commercial buyout terms in 1 second!
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Full Engagement Lifecycle & Governance',
      tag: 'From Discovery Through Delivery',
      content: (
        <div className="space-y-6">
          <p className="text-gray-300 text-xs sm:text-sm leading-relaxed">
            KontentX manages engagements through an end-to-end milestone pipeline:
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
              <span className="text-lg font-bold text-indigo-400">1. Discovery</span>
              <p className="text-[11px] text-gray-400 mt-1">Multi-tool filtering, verified credentials & portfolio review.</p>
            </div>
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
              <span className="text-lg font-bold text-purple-400">2. Brief & Offer</span>
              <p className="text-[11px] text-gray-400 mt-1">AI-assisted structured briefs & creator proposal quotes.</p>
            </div>
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
              <span className="text-lg font-bold text-sky-400">3. Production</span>
              <p className="text-[11px] text-gray-400 mt-1">Temporal consistency passes, upscaling, and seed tracking.</p>
            </div>
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
              <span className="text-lg font-bold text-emerald-400">4. Escrow & Release</span>
              <p className="text-[11px] text-gray-400 mt-1">Milestone delivery approval & copyright license transfer.</p>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen py-10 px-4 pb-24">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
            <FileText size={13} /> Deliverable 2 & 3 Presentation
          </div>
          <span className="text-xs text-gray-500 font-mono">
            Slide {currentSlide + 1} of {slides.length}
          </span>
        </div>

        {/* Slide Canvas */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="glass rounded-3xl p-6 sm:p-10 border border-white/10 shadow-2xl min-h-[460px] flex flex-col justify-between"
          >
            <div>
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider block mb-1">
                {slides[currentSlide].tag}
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-6">
                {slides[currentSlide].title}
              </h2>
              {slides[currentSlide].content}
            </div>

            {/* Slide Navigation Controls */}
            <div className="flex items-center justify-between pt-8 border-t border-white/8 mt-8">
              <button
                disabled={currentSlide === 0}
                onClick={() => setCurrentSlide((prev) => Math.max(0, prev - 1))}
                className="flex items-center gap-1 px-4 py-2 rounded-xl bg-white/5 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed text-xs font-semibold transition-all"
              >
                <ChevronLeft size={16} /> Previous
              </button>

              <div className="flex items-center gap-1.5">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentSlide(i)}
                    className={`h-2 rounded-full transition-all ${
                      currentSlide === i ? 'w-6 bg-indigo-500' : 'w-2 bg-white/20'
                    }`}
                  />
                ))}
              </div>

              <button
                disabled={currentSlide === slides.length - 1}
                onClick={() => setCurrentSlide((prev) => Math.min(slides.length - 1, prev + 1))}
                className="flex items-center gap-1 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold transition-all shadow-md shadow-indigo-500/25"
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
