import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Copy, Download, BookOpen, Lightbulb, ArrowRight, Play, Pause, SkipBack, SkipForward, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// One-line briefs for each step
const stepBriefs = {
  "Step 0: Original Grammar": "Baseline grammar — no transformations applied yet.",
  "Step 1: Removed Useless Symbols": "Non-generating and unreachable symbols were identified and removed.",
  "Step 2: Eliminated ε Productions": "Nullable variables expanded into all combinations; ε-rules removed.",
  "Step 3: Removed Unit Productions": "Chain rules (A → B) replaced with direct non-unit productions.",
};

// Detailed descriptions for each step
const stepDetailedExplanations = {
  "Step 0: Original Grammar": {
    whatWeHave: "This is the original Context-Free Grammar (CFG) exactly as you entered it.",
    whyWeDoIt: "Before simplification, we need to see the starting point. The original grammar may contain useless symbols, ε-productions, and unit productions that need to be cleaned up.",
    howItWorks: "No transformation is applied here. This step serves as the baseline for comparing changes in subsequent steps.",
    keyTerms: [
      { term: "Non-terminal", desc: "Uppercase letters (A, B, S) that can be replaced" },
      { term: "Terminal", desc: "Lowercase letters (a, b) that appear in the final string" },
      { term: "Production", desc: "Rules like S → AB that define how to expand non-terminals" },
    ]
  },
  "Step 1: Removed Useless Symbols": {
    whatWeHave: "Grammar with only useful (generating & reachable) variables remaining.",
    whyWeDoIt: "A useless symbol either cannot generate any terminal string (non-generating) or cannot be reached from the start symbol S (unreachable). Removing them simplifies the grammar without changing the language.",
    howItWorks: "We perform two passes:\n1. Find Generating Symbols: Start from variables that produce terminals directly, then build up.\n2. Find Reachable Symbols: Starting from S, do a BFS/DFS through all productions to find which variables can actually be referenced.",
    keyTerms: [
      { term: "Generating", desc: "A variable that can eventually produce a string of terminals" },
      { term: "Reachable", desc: "A variable that can be reached from the start symbol S" },
      { term: "Useless", desc: "A variable that is either non-generating or unreachable" },
    ]
  },
  "Step 2: Eliminated ε Productions": {
    whatWeHave: "Grammar with no ε (epsilon / null) productions, except possibly for the start symbol.",
    whyWeDoIt: "ε-productions (rules like A → ε) add complexity. By eliminating them, we get an equivalent, cleaner grammar. If the start symbol was nullable, we keep S → ε as a special case.",
    howItWorks: "1. Find Nullable Variables: A variable is nullable if it has A → ε, or all symbols in some production of A are nullable.\n2. Generate New Productions: For each production, create all combinations by optionally removing nullable variables.\n3. Remove all ε-rules: Delete every A → ε production (except for S if needed).",
    keyTerms: [
      { term: "Nullable", desc: "A variable that can derive ε (empty string)" },
      { term: "ε (epsilon)", desc: "The empty string — producing nothing" },
      { term: "Combinations", desc: "All possible ways to keep/remove nullable variables in a production" },
    ]
  },
  "Step 3: Removed Unit Productions": {
    whatWeHave: "Final simplified grammar with no unit productions (A → B chains).",
    whyWeDoIt: "Unit productions like A → B just rename variables without adding terminals. They create unnecessary chains and can be replaced by directly copying B's productions into A.",
    howItWorks: "1. Compute Unit Closures: For each variable A, find all variables B such that A ⇒* B through unit production chains.\n2. Replace Unit Productions: For each variable A, take the union of all non-unit productions from every variable in A's unit closure.\n3. Drop all unit rules: Remove every production of the form A → B where B is a single non-terminal.",
    keyTerms: [
      { term: "Unit Production", desc: "A rule A → B where B is a single non-terminal" },
      { term: "Unit Closure", desc: "All variables reachable from A through unit production chains" },
      { term: "Transitive Closure", desc: "Following chains: if A → B and B → C, then C is in A's closure" },
    ]
  },
};

const StepViewer = ({ steps, currentStep, onNext, onPrev, onCopy, onDownload, onStepChange }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(2500); // ms per step
  const intervalRef = useRef(null);
  const contentRef = useRef(null);
  const activeRowRef = useRef(null);

  // Auto-play logic
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        onNext();
      }, playSpeed);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, playSpeed, onNext]);

  // Stop playing when we reach the last step
  useEffect(() => {
    if (currentStep === steps.length - 1 && isPlaying) {
      setIsPlaying(false);
    }
  }, [currentStep, steps.length, isPlaying]);

  // Scroll active row into view when step changes
  useEffect(() => {
    if (activeRowRef.current) {
      activeRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [currentStep]);

  if (steps.length === 0) return null;

  const step = steps[currentStep];
  const grammar = step.grammar;

  const getTransitions = (prevS, s) => {
    if (!prevS) return { removedSymbols: [], removedRules: [], addedRules: [] };
    const prevG = prevS.grammar;
    const currG = s.grammar;
    const removedSymbols = [];
    const removedRules = [];
    const addedRules = [];
    
    for (const v in prevG) {
      if (!currG[v]) {
        removedSymbols.push(v);
        prevG[v].forEach(rule => removedRules.push({ v, rule }));
      } else {
        prevG[v].forEach(rule => {
          if (!currG[v].includes(rule)) removedRules.push({ v, rule });
        });
      }
    }
    for (const v in currG) {
      currG[v].forEach(rule => {
        if (!prevG[v] || !prevG[v].includes(rule)) addedRules.push({ v, rule });
      });
    }
    return { removedSymbols, removedRules, addedRules };
  };

  const explanation = stepDetailedExplanations[step.title] || null;
  const brief = stepBriefs[step.title] || step.description;
  const progress = ((currentStep + 1) / steps.length) * 100;

  const handlePlayPause = () => {
    if (currentStep === steps.length - 1) {
      // If at end, restart from beginning
      if (onStepChange) {
        onStepChange(0);
      } else {
        for (let i = currentStep; i > 0; i--) {
          onPrev();
        }
      }
      setTimeout(() => setIsPlaying(true), 100);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handleRestart = () => {
    setIsPlaying(false);
    if (onStepChange) {
      onStepChange(0);
    } else {
      for (let i = currentStep; i > 0; i--) {
        onPrev();
      }
    }
  };

  const handleGoToStep = (i) => {
    setIsPlaying(false);
    if (onStepChange) {
      onStepChange(i);
    } else {
      const diff = i - currentStep;
      if (diff > 0) for (let j = 0; j < diff; j++) onNext();
      else for (let j = 0; j < -diff; j++) onPrev();
    }
  };

  const speedOptions = [
    { label: '0.5x', value: 5000 },
    { label: '1x', value: 2500 },
    { label: '1.5x', value: 1600 },
    { label: '2x', value: 1200 },
  ];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'rgba(255,255,255,0.85)',
      backdropFilter: 'blur(8px)',
      borderRadius: 16,
      border: '1px solid rgba(0,0,0,0.08)',
      boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
      overflow: 'hidden',
      transition: 'box-shadow 0.2s',
    }}>
      {/* Progress Bar */}
      <div style={{ height: 3, background: '#f5f5f5', position: 'relative', flexShrink: 0 }}>
        <motion.div 
          style={{ height: '100%', background: '#111', borderRadius: '0 4px 4px 0' }}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      {/* Video Player Controls */}
      <div style={{
        padding: '12px 20px',
        background: '#111',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        flexShrink: 0,
      }}>
        {/* Left: Player buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button 
            onClick={handleRestart}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ccc',
              cursor: 'pointer',
              padding: 6,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#fff'}
            onMouseLeave={e => e.currentTarget.style.color = '#ccc'}
            title="Restart"
          >
            <RotateCcw size={16} />
          </button>
          <button 
            onClick={onPrev}
            disabled={currentStep === 0}
            style={{
              background: 'transparent',
              border: 'none',
              color: currentStep === 0 ? '#555' : '#ccc',
              cursor: currentStep === 0 ? 'not-allowed' : 'pointer',
              padding: 6,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
            }}
            title="Previous step"
          >
            <SkipBack size={16} />
          </button>
          <button 
            onClick={handlePlayPause}
            style={{
              background: '#fff',
              border: 'none',
              color: '#111',
              cursor: 'pointer',
              padding: 8,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              boxShadow: '0 2px 8px rgba(255,255,255,0.2)',
              transition: 'transform 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} style={{ marginLeft: 2 }} />}
          </button>
          <button 
            onClick={onNext}
            disabled={currentStep === steps.length - 1}
            style={{
              background: 'transparent',
              border: 'none',
              color: currentStep === steps.length - 1 ? '#555' : '#ccc',
              cursor: currentStep === steps.length - 1 ? 'not-allowed' : 'pointer',
              padding: 6,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
            }}
            title="Next step"
          >
            <SkipForward size={16} />
          </button>
        </div>

        {/* Center: Step info */}
        <div style={{ flex: 1, textAlign: 'center' }}>
          <span style={{ color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: 'Inter, sans-serif' }}>
            Step {currentStep + 1} / {steps.length}
          </span>
          {isPlaying && (
            <span style={{
              marginLeft: 8,
              display: 'inline-block',
              width: 8, height: 8,
              borderRadius: '50%',
              background: '#ef4444',
              animation: 'pulse 1s ease-in-out infinite',
            }} />
          )}
        </div>

        {/* Right: Speed control */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {speedOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => setPlaySpeed(opt.value)}
              style={{
                background: playSpeed === opt.value ? '#fff' : 'transparent',
                color: playSpeed === opt.value ? '#111' : '#888',
                border: 'none',
                padding: '3px 8px',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline dots */}
      <div style={{
        padding: '10px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 0,
        background: '#fafafa',
        borderBottom: '1px solid #f0f0f0',
        flexShrink: 0,
      }}>
        {steps.map((s, i) => (
          <React.Fragment key={i}>
            <div
              onClick={() => handleGoToStep(i)}
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: i <= currentStep ? '#111' : '#e5e5e5',
                color: i <= currentStep ? '#fff' : '#999',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: i === currentStep ? '0 0 0 3px rgba(0,0,0,0.15)' : 'none',
                flexShrink: 0,
              }}
            >
              {i + 1}
            </div>
            {i < steps.length - 1 && (
              <div style={{
                flex: 1,
                height: 2,
                background: i < currentStep ? '#111' : '#e5e5e5',
                transition: 'background 0.3s ease',
              }} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Scrollable content area */}
      <div 
        ref={contentRef}
        style={{ 
          flex: 1, 
          overflowY: 'auto', 
          minHeight: 0,
        }} 
        className="custom-scrollbar"
      >
        {/* Header with step title and brief */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f0f0' }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: '#111', margin: '0 0 4px 0', fontFamily: 'Inter, sans-serif' }}>
            {step.title}
          </h3>
          <p style={{ fontSize: 14, color: '#666', margin: '0 0 8px 0', lineHeight: 1.5 }}>
            {step.description}
          </p>
          {/* One-line brief badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            background: 'linear-gradient(135deg, #111 0%, #333 100%)',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 600,
            color: '#fff',
            letterSpacing: '0.01em',
          }}>
            <span style={{ fontSize: 14 }}>💡</span>
            {brief}
          </div>
        </div>

        {/* Detailed Explanation Card */}
        {explanation && (
          <div style={{ margin: '12px 16px 0' }} className="step-description-card">
            <div style={{
              background: '#fafafa',
              borderRadius: 12,
              border: '1px solid #eee',
              overflow: 'hidden',
            }}>
              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* What's happening */}
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ padding: 5, background: '#f0f0f0', borderRadius: 8, flexShrink: 0 }}>
                    <BookOpen size={13} color="#333" />
                  </div>
                  <div>
                    <h5 style={{ fontSize: 14, fontWeight: 700, color: '#111', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 3px 0' }}>
                      What's happening
                    </h5>
                    <p style={{ fontSize: 14, color: '#a80d0d', margin: 0, lineHeight: 1.5 }}>{explanation.whatWeHave}</p>
                  </div>
                </div>
                
                {/* Why we do this */}
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ padding: 5, background: '#f0f0f0', borderRadius: 8, flexShrink: 0 }}>
                    <Lightbulb size={13} color="#333" />
                  </div>
                  <div>
                    <h5 style={{ fontSize: 14, fontWeight: 700, color: '#111', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 3px 0' }}>
                      Why we do this
                    </h5>
                    <p style={{ fontSize: 14, color: '#a80d0d', margin: 0, lineHeight: 1.5 }}>{explanation.whyWeDoIt}</p>
                  </div>
                </div>

                {/* How it works */}
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ padding: 5, background: '#f0f0f0', borderRadius: 8, flexShrink: 0 }}>
                    <ArrowRight size={13} color="#333" />
                  </div>
                  <div>
                    <h5 style={{ fontSize: 14, fontWeight: 700, color: '#111', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 3px 0' }}>
                      How it works
                    </h5>
                    <p style={{ fontSize: 14, color: '#a80d0d', margin: 0, lineHeight: 1.5, whiteSpace: 'pre-line' }}>
                      {explanation.howItWorks}
                    </p>
                  </div>
                </div>
              </div>

              {/* Key Terms */}
              <div style={{ borderTop: '1px solid #eee', padding: 14, background: 'rgba(255,255,255,0.5)' }}>
                <h5 style={{ fontSize: 13, fontWeight: 700, color: '#0d0c0c', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 8px 0' }}>
                  Key Terms
                </h5>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {explanation.keyTerms.map((kt, i) => (
                    <div key={i} style={{ position: 'relative' }}>
                      <span 
                        style={{
                          padding: '3px 8px',
                          background: '#fff',
                          borderRadius: 6,
                          border: '1px solid #e5e5e5',
                          fontSize: 12,
                          fontWeight: 600,
                          color: '#7d0404ff',
                          cursor: 'help',
                          display: 'inline-block',
                          transition: 'all 0.15s',
                        }}
                        title={kt.desc}
                      >
                        {kt.term}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Transition Table */}
        <div style={{ padding: '16px 16px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: '#111', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Transition Table
            </span>
            <div style={{ flex: 1, height: 1, background: '#f0f0f0' }} />
          </div>

          <div style={{ 
            border: '1px solid #e5e5e5', 
            borderRadius: 10, 
            overflow: 'hidden',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8f8f8', borderBottom: '2px solid #e5e5e5' }}>
                  <th style={{ padding: '10px 12px', color: '#111', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', width: '20%' }}>Step</th>
                  <th style={{ padding: '10px 12px', color: '#111', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', width: '25%' }}>Removed</th>
                  <th style={{ padding: '10px 12px', color: '#111', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', width: '25%' }}>Added</th>
                  <th style={{ padding: '10px 12px', color: '#111', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', width: '30%' }}>Result</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {steps.slice(0, currentStep + 1).map((stepItem, i) => {
                    const prevStepItem = i > 0 ? steps[i - 1] : null;
                    const { removedSymbols, removedRules, addedRules } = getTransitions(prevStepItem, stepItem);
                    const isActive = i === currentStep;
                    const stepBrief = stepBriefs[stepItem.title] || stepItem.description;

                    return (
                      <motion.tr 
                        key={i}
                        ref={isActive ? activeRowRef : null}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ 
                          opacity: 1, 
                          y: 0,
                          backgroundColor: isActive ? '#fffbeb' : 'transparent',
                        }}
                        transition={{ duration: 0.35 }}
                        style={{ 
                          borderBottom: '1px solid #f0f0f0', 
                          verticalAlign: 'top',
                          cursor: 'pointer',
                        }}
                        onClick={() => handleGoToStep(i)}
                      >
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 6, 
                            marginBottom: 4 
                          }}>
                            <div style={{
                              width: 22,
                              height: 22,
                              borderRadius: '50%',
                              background: isActive ? '#111' : '#e5e5e5',
                              color: isActive ? '#fff' : '#999',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 10,
                              fontWeight: 800,
                              flexShrink: 0,
                              transition: 'all 0.3s',
                            }}>
                              {i}
                            </div>
                            <span style={{ 
                              fontWeight: isActive ? 700 : 500, 
                              color: '#111', 
                              fontSize: 14,
                              lineHeight: 1.3,
                            }}>
                              {stepItem.title.replace(/Step \d+: /, '')}
                            </span>
                          </div>
                          {/* Brief */}
                          <div style={{ 
                            fontSize: 16, 
                            color: isActive ? '#92400e' : '#888', 
                            fontWeight: 500, 
                            lineHeight: 1.4,
                            fontStyle: 'italic',
                            paddingLeft: 28,
                          }}>
                            {stepBrief}
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          {removedSymbols.length > 0 && (
                            <div style={{ marginBottom: 4 }}>
                              <div style={{ 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: 4, 
                                padding: '2px 6px', 
                                background: '#fef2f2', 
                                borderRadius: 4, 
                                border: '1px solid #fecaca',
                                marginBottom: 4,
                              }}>
                                <span style={{ fontSize: 10, fontWeight: 700, color: '#991b1b' }}>SYMBOLS:</span>
                                {removedSymbols.map((sym, idx) => (
                                  <span key={idx} style={{
                                    padding: '1px 5px',
                                    background: '#dc2626',
                                    color: '#fff',
                                    borderRadius: 3,
                                    fontSize: 14,
                                    fontWeight: 700,
                                    fontFamily: 'monospace',
                                    animation: isActive ? 'flash-red 1s ease-in-out 2' : 'none',
                                  }}>
                                    {sym}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {removedRules.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                              {removedRules.map((r, idx) => (
                                <code key={idx} style={{ 
                                  background: isActive ? '#fef2f2' : '#fafafa', 
                                  padding: '2px 5px', 
                                  borderRadius: 4, 
                                  fontFamily: 'monospace', 
                                  fontSize: 16, 
                                  border: `1px solid ${isActive ? '#fecaca' : '#eee'}`, 
                                  whiteSpace: 'nowrap',
                                  color: '#dc2626',
                                  //textDecoration: isActive ? 'line-through' : 'none',
                                  transition: 'all 0.3s',
                                }}>
                                  {r.v} → {r.rule === '' ? 'ε' : r.rule}
                                </code>
                              ))}
                            </div>
                          ) : (
                            <span style={{ color: '#ccc', fontStyle: 'italic', fontSize: 12 }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          {addedRules.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                              {addedRules.map((r, idx) => (
                                <code key={idx} style={{ 
                                  background: isActive ? '#f0fdf4' : '#fafafa', 
                                  padding: '2px 5px', 
                                  borderRadius: 4, 
                                  fontFamily: 'monospace', 
                                  fontSize: 16, 
                                  border: `1px solid ${isActive ? '#bbf7d0' : '#eee'}`, 
                                  whiteSpace: 'nowrap',
                                  color: '#16a34a',
                                  fontWeight: isActive ? 600 : 400,
                                  transition: 'all 0.3s',
                                }}>
                                  {r.v} → {r.rule === '' ? 'ε' : r.rule}
                                </code>
                              ))}
                            </div>
                          ) : (
                            <span style={{ color: '#ccc', fontStyle: 'italic', fontSize: 12 }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          {Object.keys(stepItem.grammar).length === 0 ? (
                            <span style={{ color: '#aaa', fontStyle: 'italic', fontSize: 12 }}>Empty Grammar</span>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                              {Object.keys(stepItem.grammar).map(v => (
                                <div key={v} style={{ display: 'flex', gap: 6, alignItems: 'baseline', fontFamily: 'monospace', fontSize: 16 }}>
                                  <strong style={{ color: '#111' }}>{v}</strong>
                                  <span style={{ color: '#bbb' }}>→</span>
                                  <span style={{ color: '#333', lineHeight: 1.4 }}>
                                    {stepItem.grammar[v].length > 0 
                                      ? stepItem.grammar[v].map(r => r === '' ? 'ε' : r).join(' | ') 
                                      : 'Ø'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: '10px 16px',
        background: 'rgba(0,0,0,0.02)',
        borderTop: '1px solid #320404ff',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {/* <button 
            onClick={onCopy}
            className="btn-lift"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 10px',
              borderRadius: 8,
              fontSize: 11,
              fontWeight: 700,
              background: '#fff',
              color: '#555',
              border: '1px solid #e5e5e5',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <Copy size={13} />
            COPY
          </button> */}
          {/* <button 
            onClick={onDownload}
            className="btn-lift"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 10px',
              borderRadius: 8,
              fontSize: 11,
              fontWeight: 700,
              background: '#fff',
              color: '#555',
              border: '1px solid #e5e5e5',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <Download size={13} />
            DOWNLOAD
          </button> */}
        </div>
        <div style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#4d0909ff', fontWeight: 600 }}>
          Step-by-step Transformation
        </div>
      </div>
    </div>
  );
};

export default StepViewer;
