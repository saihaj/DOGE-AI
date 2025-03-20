import peg from 'pegjs';

// Define the PEG.js grammar
const grammar = `
  {
    let valid = [];
    let potential = [];
    function addPotential(text) { potential.push(text); return text; }
    function addValid(text) { valid.push(text); return text; }
    function getResults() { return { allPotential: potential, valid }; }
  }

  // Start rule: process the entire input
  start
    = parts:part* { return getResults(); }

  // Part: either a valid template or potential (invalid) template or other text
  part
    = validTemplate
    / potentialTemplate
    / . { return null; } // Skip any other character

  // Valid template: ""{{identifier}}""
  validTemplate
    = '""' '{{' id:identifier '}}' '""' { return addValid(text()); }

  // Potential template: any { pattern that's not valid
  potentialTemplate
    = quote:[\\'"]? '{' chars:[a-zA-Z0-9_'{}]* quote2:[\\'"]? { return addPotential(text()); }
    / '{{' id:identifier '}}' { return addPotential(text()); } // Explicitly catch {{id}} as invalid

  // Identifier: alphanumeric characters and underscores
  identifier
    = [a-zA-Z0-9_]+ { return text(); }
`;

// Generate the parser
export const checkVariablesParser = peg.generate(grammar);
