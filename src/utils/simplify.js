/**
 * CFG Simplification algorithms.
 * Each function returns the new grammar and metadata about the transformation.
 */

/**
 * Helper: Check if a character is a non-terminal (uppercase letter A-Z).
 * This is the single source of truth for terminal vs non-terminal distinction.
 * Using this instead of checking grammar keys prevents the bug where
 * uppercase letters without productions (e.g., B with no rules) are
 * mistakenly treated as terminals.
 */
function isNonTerminal(char) {
  return /^[A-Z]$/.test(char);
}

/**
 * Step 1 & 4: Remove Useless Symbols
 * 1. Remove non-generating symbols (variables that cannot derive a terminal string).
 * 2. Remove unreachable symbols (variables not reachable from the start symbol).
 */
export function removeUselessSymbols(grammar, startSymbol = 'S') {
  // 1. Identify Generating Symbols
  // A variable is generating if it can derive a string of terminals.
  // Base case: A -> w where w contains only terminals (or is ε).
  // Inductive: A -> X1X2...Xn where each Xi is terminal or generating.
  const generating = new Set();

  let changed = true;
  while (changed) {
    changed = false;
    for (const v in grammar) {
      if (generating.has(v)) continue;
      for (const prod of grammar[v]) {
        // Empty production (ε) is vacuously generating
        const isGen = Array.from(prod).every(char => {
          if (!isNonTerminal(char)) return true; // terminals are always fine
          return generating.has(char);            // non-terminals must be generating
        });
        if (isGen) {
          generating.add(v);
          changed = true;
          break;
        }
      }
    }
  }

  // Remove non-generating variables and any production that references
  // a non-generating non-terminal
  const grammarGenerating = {};
  for (const v in grammar) {
    if (!generating.has(v)) continue;
    const validProds = grammar[v].filter(prod => {
      return Array.from(prod).every(char => {
        if (!isNonTerminal(char)) return true; // terminals are fine
        return generating.has(char);            // non-terminals must be generating
      });
    });
    if (validProds.length > 0) {
      grammarGenerating[v] = validProds;
    }
  }

  // 2. Identify Reachable Symbols from start symbol via BFS
  const reachable = new Set();
  if (grammarGenerating[startSymbol]) {
    reachable.add(startSymbol);
  }
  const queue = [...reachable];

  while (queue.length > 0) {
    const v = queue.shift();
    if (!grammarGenerating[v]) continue;
    for (const prod of grammarGenerating[v]) {
      for (const char of prod) {
        if (isNonTerminal(char) && grammarGenerating[char] && !reachable.has(char)) {
          reachable.add(char);
          queue.push(char);
        }
      }
    }
  }

  // Final Grammar: keep only reachable, generating variables
  const result = {};
  for (const v in grammarGenerating) {
    if (reachable.has(v)) {
      result[v] = grammarGenerating[v];
    }
  }

  return result;
}

/**
 * Step 2: Remove Null (ε) Productions
 * 1. Find all nullable variables.
 * 2. For each production, generate all combinations by optionally omitting nullable symbols.
 * 3. Remove all ε-rules (except possibly for the start symbol).
 */
export function removeNullProductions(grammar, startSymbol = 'S') {
  // 1. Find Nullable Variables (A =>* ε)
  const nullable = new Set();
  let changed = true;
  while (changed) {
    changed = false;
    for (const v in grammar) {
      if (nullable.has(v)) continue;
      for (const prod of grammar[v]) {
        // A variable is nullable if it has ε production OR all symbols in some production are nullable
        if (prod === '' || Array.from(prod).every(char => nullable.has(char))) {
          nullable.add(v);
          changed = true;
          break;
        }
      }
    }
  }

  const result = {};

  // For each production, generate all combinations by removing nullable variables
  for (const v in grammar) {
    const newProds = new Set();
    for (const prod of grammar[v]) {
      if (prod === '') continue; // Skip ε productions

      const combinations = generateNullableCombinations(prod, nullable);
      combinations.forEach(p => {
        if (p !== '') { // Don't add ε yet
          newProds.add(p);
        }
      });
    }
    if (newProds.size > 0) {
      result[v] = Array.from(newProds);
    }
  }

  // If start symbol is nullable, add ε to its productions
  if (nullable.has(startSymbol)) {
    if (result[startSymbol]) {
      result[startSymbol].push('');
    } else {
      result[startSymbol] = [''];
    }
  }

  return result;
}

/**
 * Generate all combinations of a production by optionally omitting nullable symbols.
 * E.g., for prod="AB" with A nullable: returns ["AB", "B"]
 */
function generateNullableCombinations(prod, nullableSet) {
  const results = [''];

  for (const char of prod) {
    const count = results.length;
    for (let i = 0; i < count; i++) {
      const current = results[i];
      // Append char to existing combination
      results[i] = current + char;
      // If char is nullable, also keep the combination without this char
      if (nullableSet.has(char)) {
        results.push(current);
      }
    }
  }

  return [...new Set(results)];
}

/**
 * Step 3: Remove Unit Productions (A -> B where B is a single non-terminal)
 * 1. Compute unit closures for each variable.
 * 2. Replace unit productions with the non-unit productions from the closure.
 */
export function removeUnitProductions(grammar) {
  // Collect all variables, including those only on RHS
  const variables = new Set(Object.keys(grammar));
  for (const v in grammar) {
    for (const prod of grammar[v]) {
      for (const char of prod) {
        if (isNonTerminal(char)) {
          variables.add(char);
        }
      }
    }
  }

  const unitClosures = {};
  variables.forEach(v => {
    unitClosures[v] = new Set([v]);
  });

  // Calculate unit closures (Transitive Closure)
  let changed = true;
  while (changed) {
    changed = false;
    for (const v in grammar) {
      for (const prod of grammar[v]) {
        // A unit production is a single non-terminal character
        // Must also exist in grammar (i.e., have its own closure) to follow the chain
        if (prod.length === 1 && isNonTerminal(prod) && unitClosures[prod]) {
          const target = prod;
          const oldSize = unitClosures[v].size;
          unitClosures[target].forEach(u => unitClosures[v].add(u));
          if (unitClosures[v].size > oldSize) {
            changed = true;
          }
        }
      }
    }
  }

  // Build new grammar: for each variable, collect all non-unit productions
  // from every variable in its unit closure
  const result = {};
  for (const v of Object.keys(grammar)) {
    const newProds = new Set();
    unitClosures[v].forEach(u => {
      if (grammar[u]) {
        grammar[u].forEach(prod => {
          // Filter out unit productions (a single non-terminal)
          const isUnit = prod.length === 1 && isNonTerminal(prod);
          if (!isUnit) {
            newProds.add(prod);
          }
        });
      }
    });
    if (newProds.size > 0) {
      result[v] = Array.from(newProds);
    }
  }

  return result;
}

/**
 * Main function: returns all simplification steps for the UI.
 */
export function getSimplificationSteps(initialGrammar) {
  const steps = [];

  // Step 0: Original
  steps.push({
    title: "Step 0: Original Grammar",
    grammar: initialGrammar,
    description: "The initial context-free grammar from input.",
  });

  // Step 1: Remove Useless Symbols (non-generating + unreachable)
  const noUseless = removeUselessSymbols(initialGrammar);
  steps.push({
    title: "Step 1: Removed Useless Symbols",
    grammar: noUseless,
    description: "Eliminated variables that do not generate terminals or are unreachable from the start symbol 'S'.",
  });

  // Step 2: Remove Null (ε) Productions
  const noNull = removeNullProductions(noUseless);
  steps.push({
    title: "Step 2: Eliminated ε Productions",
    grammar: noNull,
    description: "Replaced nullable variables in all productions and removed ε-rules.",
  });

  // Step 3: Remove Unit Productions
  const noUnit = removeUnitProductions(noNull);
  steps.push({
    title: "Step 3: Removed Unit Productions",
    grammar: noUnit,
    description: "Eliminated chain rules of the form A → B using the unit closure.",
  });

  // Step 4: Final Cleanup — remove any symbols that became useless
  // after null/unit removal (e.g., a variable whose only production
  // was removed, or a variable that is no longer reachable)
  const finalGrammar = removeUselessSymbols(noUnit);
  const hasChanges = JSON.stringify(finalGrammar) !== JSON.stringify(noUnit);
  if (hasChanges) {
    steps.push({
      title: "Step 4: Final Cleanup",
      grammar: finalGrammar,
      description: "Removed symbols that became useless after previous transformations.",
    });
  }

  return steps;
}
