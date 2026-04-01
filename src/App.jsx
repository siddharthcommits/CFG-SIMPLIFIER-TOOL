import React, { useState, useCallback, useMemo } from 'react';
import { Layers, Network, Terminal, Wand2, Copy, Check, Download, Info, MousePointer2, BookOpen, Sparkles, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import InputBox from './components/InputBox';
import StepViewer from './components/StepViewer';
import GraphView from './components/GraphView';
import { parseGrammar, stringifyGrammar } from './utils/parser';
import { getSimplificationSteps } from './utils/simplify';

function App() {
  const [steps, setSteps] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [copied, setCopied] = useState(false);
  const [originalText, setOriginalText] = useState("");
  const [viewMode, setViewMode] = useState('split');
  const [learningMode, setLearningMode] = useState(false);

  const handleProcessGrammar = useCallback((text) => {
    try {
      const parsed = parseGrammar(text);
      if (Object.keys(parsed).length === 0) {
        alert("Empty grammar! Please follow the format: S -> AB | C");
        return;
      }
      const simplificationSteps = getSimplificationSteps(parsed);
      setOriginalText(text);
      setSteps(simplificationSteps);
      setCurrentStep(0);
    } catch (error) {
      console.error(error);
      alert("Error parsing grammar. Ensure rules are like: S -> a | AB");
    }
  }, []);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleCopy = () => {
    if (steps.length > 0) {
      const text = stringifyGrammar(steps[currentStep].grammar);
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (steps.length > 0) {
      const text = stringifyGrammar(steps[currentStep].grammar);
      const element = document.createElement("a");
      const file = new Blob([text], {type: 'text/plain'});
      element.href = URL.createObjectURL(file);
      element.download = `grammar-step-${currentStep}.txt`;
      document.body.appendChild(element);
      element.click();
    }
  };

  const currentStepData = useMemo(() => steps[currentStep] || null, [steps, currentStep]);

  // Compute removed symbols for current step (compared to previous step)
  const removedSymbols = useMemo(() => {
    if (steps.length === 0 || currentStep === 0) return [];
    const prevGrammar = steps[currentStep - 1].grammar;
    const currGrammar = steps[currentStep].grammar;
    const removed = [];
    for (const v in prevGrammar) {
      if (!currGrammar[v]) {
        removed.push(v);
      }
    }
    return removed;
  }, [steps, currentStep]);

  const handleStepChange = useCallback((stepIndex) => {
    setCurrentStep(stepIndex);
  }, []);

  return (
    <div className="min-h-screen text-slate-800 selection:bg-neutral-200/50 overflow-x-hidden" style={{ background: 'linear-gradient(135deg, #fafbfc 0%, #f5f5f5 30%, #f0f0f0 60%, #fafafa 100%)' }}>
      {/* Subtle Background Accents */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-neutral-100/30 rounded-full blur-[120px] animate-pulse-soft" />
        <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] bg-neutral-100/20 rounded-full blur-[100px] animate-pulse-soft" style={{ animationDelay: '1.5s' }} />
        <div className="absolute bottom-[10%] left-[20%] w-[30%] h-[30%] bg-neutral-100/20 rounded-full blur-[80px] animate-pulse-soft" style={{ animationDelay: '3s' }} />
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-2xl border-b border-neutral-200/60 z-50 px-6 flex justify-between items-center shadow-[0_1px_20px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-3">

          <motion.div 
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="p-2 bg-neutral-900 rounded-xl shadow-lg shadow-neutral-400/30"
          >
             <Wand2 className="w-5 h-5 text-white" />
          </motion.div> 
          <div>
            <h1 className="text-xl font-black italic tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-neutral-900 to-neutral-600">
              CFG SIMPLIFIER
            </h1>
          </div>
        </div>

        <div className="flex gap-2 bg-neutral-100/80 p-1.5 rounded-2xl border border-neutral-200/60 shadow-inner">
          <button 
            onClick={() => setLearningMode(!learningMode)}
             className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all btn-lift ${learningMode ? 'bg-neutral-900 text-white shadow-lg shadow-neutral-400/30' : 'text-neutral-500 hover:text-neutral-700 hover:bg-white/60'}`}
          >
            {learningMode ? <MousePointer2 className="w-3.5 h-3.5" /> : <BookOpen className="w-3.5 h-3.5" />}
            {learningMode ? 'LEARNING: ON' : 'LEARNING: OFF'}
          </button>
          <div className="w-px h-6 bg-neutral-200/60 my-auto mx-1" />
          <button 
            onClick={() => setViewMode('split')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all btn-lift ${viewMode === 'split' ? 'bg-white text-neutral-800 shadow-md ring-1 ring-neutral-200' : 'text-neutral-500 hover:text-neutral-700 hover:bg-white/60'}`}
          >
            <Layers className="w-3.5 h-3.5" />
            SPLIT VIEW
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto pt-24 px-4 md:px-6 pb-32 relative z-10">
        {steps.length === 0 ? (
          <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Input Section */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              <InputBox onProcess={handleProcessGrammar} initialValue={"S -> AB | C\nA -> a | ε\nB -> b\nC -> ε"} />
            </div>

            {/* Instructions Section */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              {/* Info Card */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white/70 backdrop-blur-sm p-8 rounded-2xl border border-neutral-200/60 shadow-sm hover:shadow-md transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-neutral-100 rounded-xl group-hover:scale-105 transition-transform flex-shrink-0">
                    <Info className="w-6 h-6 text-neutral-600" />
                  </div>
                  <div>
                    <h4 className="text-neutral-800 font-bold mb-2 text-base">Simplification Rules</h4>
                    <ul className="text-sm text-neutral-500 leading-relaxed space-y-1.5">
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-neutral-800 mt-1.5 flex-shrink-0" />
                        Remove non-generating & unreachable variables
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-neutral-800 mt-1.5 flex-shrink-0" />
                        Eliminate epsilon (ε) productions
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-neutral-800 mt-1.5 flex-shrink-0" />
                        Solve unit production chains (A → B)
                      </li>
                    </ul>
                  </div>
                </div>
              </motion.div>

              {/* How to Use Guide */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-gradient-to-br from-neutral-50/80 to-stone-50/80 backdrop-blur-sm p-9 rounded-2xl border border-neutral-200/60 shadow-sm"
              >
                <h4 className="text-neutral-800 font-bold mb-3 text-base flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-neutral-800" />
                  How to Use
                </h4>
                <ol className="text-sm text-neutral-600 leading-relaxed space-y-2 list-decimal list-inside">
                  <li>Enter your CFG rules in the input box above</li>
                  <li>Click <strong className="text-neutral-900">"Process Grammar"</strong> to start</li>
                  <li>Navigate through steps using the arrows</li>
                  <li>Toggle <strong className="text-neutral-900">"Learning Mode"</strong> to practice drawing edges</li>
                  <li>Use the graph controls to zoom and pan</li>
                </ol>
              </motion.div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Top Input Grammar Bar */}
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-neutral-200/60 shadow-sm flex flex-col lg:flex-row justify-between lg:items-center gap-4"
            >
              <div className="flex flex-col gap-2">
                <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5" />
                  Input Grammar
                </h3>
                <div className="flex flex-wrap gap-2">
                  {originalText.split('\n').filter(line => line.trim() !== '').map((line, i) => (
                    <span key={i} className="px-2.5 py-1 bg-neutral-100 text-neutral-800 font-mono text-sm font-semibold rounded-lg border border-neutral-200">
                      {line}
                    </span>
                  ))}
                </div>
              </div>
              <button 
                onClick={() => setSteps([])} 
                className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold rounded-xl text-sm transition-all btn-lift whitespace-nowrap self-start lg:self-auto shadow-sm border border-neutral-200"
              >
                ← Edit Grammar
              </button>
            </motion.div>

            {/* Split View: Graph (Left) and Steps (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Graph */}
              <div className="lg:col-span-5 h-[650px] rounded-2xl overflow-hidden border border-neutral-200/60 shadow-lg bg-white/50 sticky top-20">
                <GraphView grammar={steps[currentStep].grammar} learningMode={learningMode} removedSymbols={removedSymbols} />
              </div>
              
              {/* Right Column: Step Viewer */}
              <div className="lg:col-span-7 rounded-2xl overflow-hidden border border-neutral-200/60 shadow-lg bg-white/50" style={{ height: 650 }}>
                <StepViewer 
                  steps={steps} 
                  currentStep={currentStep} 
                  onNext={handleNext} 
                  onPrev={handlePrev}
                  onCopy={handleCopy}
                  onDownload={handleDownload}
                  onStepChange={handleStepChange}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Copy Alert */}
      <AnimatePresence>
        {copied && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 px-5 py-3 bg-neutral-900 text-white text-sm font-bold rounded-2xl shadow-2xl shadow-neutral-400/30 flex items-center gap-2 z-[100]"
          >
            <Check className="w-4 h-4" />
            Grammar copied to clipboard!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
