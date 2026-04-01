/**
 * Parses CFG text input into a structured JSON format.
 * Format: S -> AB | C
 * @param {string} text 
 * @returns {Object} { S: ["AB", "C"], ... }
 */
export function parseGrammar(text) {
  const grammar = {};
  
  // Handle both literal "\n" strings and actual newlines
  const normalizedText = text.replace(/\\n/g, '\n');
  const lines = normalizedText.split('\n').map(l => l.trim()).filter(l => l !== '');

  for (const line of lines) {
    // Support "->", "=>", ":", "=", or "→" as separator
    // Improved regex to better capture variable and RHS
    const parts = line.split(/\s*(-?>(?:\s*\n)?|=>|:|==?|→)\s*/);
    if (parts.length >= 3) {
      const variable = parts[0].trim();
      const rhsPart = parts.slice(2).join('').trim();
      
      if (/^[A-Z]$/.test(variable)) {
        let rhs = rhsPart.split('|').map(p => p.trim());
        
        // Replace epsilon symbols
        rhs = rhs.map(p => (p === 'ε' || p.toLowerCase() === 'epsilon' || p === 'e') ? '' : p);

        if (!grammar[variable]) {
          grammar[variable] = [];
        }
        grammar[variable].push(...rhs);
      }
    }
  }

  // Deduplicate
  for (const v in grammar) {
    grammar[v] = [...new Set(grammar[v])];
  }

  return grammar;
}

/**
 * Converts grammar object back to string representation.
 */
export function stringifyGrammar(grammar) {
  return Object.entries(grammar)
    .map(([v, rhs]) => `${v} -> ${rhs.map(p => p === '' ? 'ε' : p).join(' | ')}`)
    .join('\n');
}

/**
 * Extracts all unique terminal and non-terminal symbols.
 */
export function getSymbols(grammar) {
  const nonTerminals = new Set(Object.keys(grammar));
  const terminals = new Set();
  
  for (const v in grammar) {
    for (const rule of grammar[v]) {
      for (const char of rule) {
        if (!nonTerminals.has(char)) {
          terminals.add(char);
        }
      }
    }
  }
  
  return { 
    nonTerminals: Array.from(nonTerminals), 
    terminals: Array.from(terminals) 
  };
}
