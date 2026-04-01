import React, { useState } from 'react';
import { Play, RotateCcw, FileText, ArrowRight, HelpCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const InputBox = ({ onProcess, initialValue = "" }) => {
  const [text, setText] = useState(initialValue);
  const [isFocused, setIsFocused] = useState(false);

  const handleProcess = () => {
    onProcess(text);
  };

  const handleReset = () => {
    setText("");
  };

  const handleExample = () => {
    setText("S -> AB | C\nA -> a | ε\nB -> b\nC -> ε");
  };

  const insertText = (char) => {
    const el = document.getElementById('cfg-input-textarea');
    if (el) {
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const newText = text.substring(0, start) + char + text.substring(end);
      setText(newText);
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(start + char.length, start + char.length);
      }, 0);
    } else {
      setText(prev => prev + char);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/80 backdrop-blur-sm rounded-2xl border border-neutral-200/60 shadow-sm hover:shadow-md transition-all overflow-hidden"
    >
      {/* Header */}
      <div className="px-6 pt-5 pb-3 flex justify-between items-center">
        <h2 className="text-lg font-bold text-neutral-800 flex items-center gap-2.5">
          <div className="p-1.5 bg-neutral-100 rounded-lg">
            <FileText className="w-4 h-4 text-neutral-600" />
          </div>
          Input CFG
        </h2>
        <div className="flex gap-1.5">
          <button 
            onClick={handleExample}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-all btn-lift"
          >
            <FileText className="w-3 h-3" />
            Load Example
          </button>
          <button 
            onClick={handleReset}
            className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg transition-all"
            title="Reset"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      
      {/* Input Format Guide */}
      <div className="mx-6 mb-3 p-3 bg-neutral-100 rounded-xl border border-neutral-200">
        <div className="flex items-start gap-2">
          <HelpCircle className="w-3.5 h-3.5 text-neutral-500 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-neutral-600 leading-relaxed">
            <span className="font-semibold text-neutral-800">Format:</span> Each rule on a new line. Use <code className="px-1 py-0.5 bg-neutral-100 rounded text-neutral-800 font-mono text-[11px]">→</code> or <code className="px-1 py-0.5 bg-neutral-100 rounded text-neutral-800 font-mono text-[11px]">-&gt;</code> as separator. Separate alternatives with <code className="px-1 py-0.5 bg-neutral-100 rounded text-neutral-800 font-mono text-[11px]">|</code>
          </div>
        </div>
      </div>

      {/* Textarea */}
      <div className="px-6 pb-3">
        <div className={`relative rounded-xl transition-all ${isFocused ? 'ring-2 ring-neutral-300 shadow-sm' : ''}`}>
          {/* Line numbers gutter */}
          <div className="absolute left-0 top-0 bottom-0 w-10 bg-neutral-80 rounded-l-xl border-r border-neutral-100 flex flex-col pt-4 pointer-events-none">
            {text.split('\n').map((_, i) => (
              <span key={i} className="text-[15px] text-neutral-900 font-mono text-center leading-[28px]">{i + 1}</span>
            ))}
          </div>
          <textarea
            id="cfg-input-textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={"Enter CFG rules here...\nS -> AB | C\nA -> a | ε"}
            className="w-full h-52 bg-neutral-50/50 text-neutral-800 pl-12 pr-4 py-4 font-mono text-base rounded-xl border border-neutral-200 focus:outline-none resize-none transition-all leading-7 placeholder:text-neutral-300"
            spellCheck={false}
          />
        </div>
      </div>
      
      {/* Process Button and Quick Keys */}
      <div className="px-6 pb-5 flex flex-col gap-3">
        <div className="flex gap-10 justify-center mb-1">
          <button 
            onClick={() => insertText('ε')}
            className="px-4 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-mono text-sm font-bold rounded-lg border border-neutral-200 transition-colors shadow-sm"
            title="Insert Epsilon"
          >
            ε
          </button>
          <button 
            onClick={() => insertText('→')}
            className="px-4 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-mono text-sm font-bold rounded-lg border border-neutral-200 transition-colors shadow-sm"
            title="Insert Arrow"
          >
            →
          </button>
        </div>
        <button
          onClick={handleProcess}
          className="w-full flex items-center justify-center gap-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-neutral-300/40 active:scale-[0.98] transition-all btn-lift group"
        >
          <Play className="w-5 h-5 group-hover:scale-110 transition-transform" />
          Process Grammar
          <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
        </button>

        <div className="mt-3 flex items-center gap-2 text-xs text-neutral-600">
          <span className="w-1 h-1 rounded-full bg-neutral-600" />
          Use <span className="px-1.5 py-0.5 bg-neutral-100 rounded font-medium text-neutral-600">ε</span> or <span className="px-1.5 py-0.5 bg-neutral-100 rounded font-medium text-neutral-600">epsilon</span> for null productions
        </div>
      </div>
    </motion.div>
  );
};

export default InputBox;
