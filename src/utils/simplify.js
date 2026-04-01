/**
 * CFG Simplification algorithms.
 * Each function returns the new grammar and metadata about the transformation.
 */

/**
 * Step 1: Remove Useless Symbols
 * 1. Remove non-generating symbols.
 * 2. Remove unreachable symbols.
 */
export function removeUselessSymbols(grammar, startSymbol = 'S') {
  // 1. Identify Generating Symbols
  const generating = new Set();
  
  // Base case: A -> w where w is all terminals
  let changed = true;
  while (changed) {
    changed = false;
    for (const v in grammar) {
      if (generating.has(v)) continue;
      for (const prod of grammar[v]) {
        // A production is generating if all its symbols are terminals or generating variables
        const isGenerating = Array.from(prod).every(char => {
          const isTerminal = !grammar[char]; // If it's not in grammar keys, it's a terminal or epsilon
          return isTerminal || generating.has(char);
        });
        if (isGenerating) {
          generating.add(v);
          changed = true;
          break;
        }
      }
    }
  }

  // Remove non-generating variables and their productions
  let grammarGenerating = {};
  for (const v in grammar) {
    if (generating.has(v)) {
      const validProds = grammar[v].filter(prod => {
        return Array.from(prod).every(char => !grammar[char] || generating.has(char));
      });
      if (validProds.length > 0) {
        grammarGenerating[v] = validProds;
      }
    }
  }

  // 2. Identify Reachable Symbols
  const reachable = new Set([startSymbol]);
  const queue = [startSymbol];
  
  while (queue.length > 0) {
    const v = queue.shift();
    if (!grammarGenerating[v]) continue;
    for (const prod of grammarGenerating[v]) {
      for (const char of prod) {
        if (grammarGenerating[char] && !reachable.has(char)) {
          reachable.add(char);
          queue.push(char);
        }
      }
    }
  }

  // Final Grammar: keep only reachable variables
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
        // A variable is nullable if its production is ε OR all its symbols are nullable
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
      if (prod === '') continue; // Skip ε
      
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

  // Handle case where start symbol becomes nullable
  if (nullable.has(startSymbol)) {
    // If S is nullable, we formally should add S' -> S | ε
    // But for simplification, we just add '' to S if it was original S
    // Wait, the prompt says "Remove ε productions except start symbol (if needed)"
    if (result[startSymbol]) {
      result[startSymbol].push('');
    } else {
      result[startSymbol] = [''];
    }
  }

  return result;
}

function generateNullableCombinations(prod, nullableSet) {
  const results = [''];
  
  for (const char of prod) {
    const count = results.length;
    for (let i = 0; i < count; i++) {
      const current = results[i];
      // Append char to existing combinations
      results[i] = current + char;
      // If char is nullable, we also add the combination without this char
      if (nullableSet.has(char)) {
        results.push(current);
      }
    }
  }
  
  return [...new Set(results)];
}

/**
 * Step 3: Remove Unit Productions (A -> B)
 */
export function removeUnitProductions(grammar) {
  const variables = Object.keys(grammar);
  const unitClosures = {};

  // Initialize closures
  variables.forEach(v => {
    unitClosures[v] = new Set([v]);
  });

  // Calculate unit closures (Transitive Closure)
  let changed = true;
  while (changed) {
    changed = false;
    for (const v in grammar) {
      for (const prod of grammar[v]) {
        // Is it a unit production? (Single non-terminal)
        if (prod.length === 1 && grammar[prod]) {
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

  const result = {};
  for (const v of variables) {
    const newProds = new Set();
    // For each variable in closure of v
    unitClosures[v].forEach(u => {
      // Add all non-unit productions of u to v
      if (grammar[u]) {
        grammar[u].forEach(prod => {
          const isUnit = prod.length === 1 && grammar[prod];
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
 * Main function to get all steps
 */
export function getSimplificationSteps(initialGrammar) {
  const steps = [];

  // Step 0: Original
  steps.push({
    title: "Step 0: Original Grammar",
    grammar: initialGrammar,
    description: "The initial context-free grammar from input."
  });

  // Step 1: No Useless
  const noUseless = removeUselessSymbols(initialGrammar);
  steps.push({
    title: "Step 1: Removed Useless Symbols",
    grammar: noUseless,
    description: "Eliminated variables that do not generate terminals or are unreachable from the start symbol 'S'."
  });

  // Step 2: No Null
  const noNull = removeNullProductions(noUseless);
  steps.push({
    title: "Step 2: Eliminated ε Productions",
    grammar: noNull,
    description: "Replaced nullable variables in all productions and removed ε-rules."
  });

  // Step 3: No Unit
  const noUnit = removeUnitProductions(noNull);
  steps.push({
    title: "Step 3: Removed Unit Productions",
    grammar: noUnit,
    description: "Eliminated chain rules of the form A → B using the unit closure."
  });

  return steps;
}
