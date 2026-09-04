/**
 * One-off codemod: fix React "Each child in a list should have a unique key prop"
 * warnings on the legal pages (/privacy, /security, /terms).
 *
 * Root cause: the legal pages are Server Components that pass arrays of JSX
 * elements to <LegalList items={[...]}>. Several of those elements are shorthand
 * fragments (<>...</>), which cannot carry a key. The RSC server runtime
 * (react-server-dom-webpack) validates every element of an array model and logs
 * "Each child in a list should have a unique key prop" at Fragment for each one.
 *
 * Fix: give each fragment inside a LegalList items array an explicit key by
 * rewriting <>...</> to <Fragment key="item-N">...</Fragment>. Shorthand
 * fragments cannot take props, so the long form is required.
 *
 * Scope guard: ONLY fragments that are direct elements of an items={[...]}
 * array belonging to <LegalList> are rewritten. Fragments used as section
 * `content: (<>...)` values are single (non-array) nodes and are left alone.
 *
 * Run with: node scripts/fix-legal-fragment-keys.mjs
 */
import fs from "node:fs";

const FILES = [
  "src/app/(marketing)/privacy/page.tsx",
  "src/app/(marketing)/security/page.tsx",
  "src/app/(marketing)/terms/page.tsx",
];

for (const file of FILES) {
  const src = fs.readFileSync(file, "utf8");
  const lines = src.split(/\r?\n/);

  let currentTag = null; // tag name of the JSX element we're inside (e.g. "LegalList")
  let inItems = false; // inside a `items={[ ... ]}` array of the current tag
  let depth = 0; // bracket depth of the items array
  let itemIndex = 0; // running fragment counter for key generation
  let changed = 0;

  const out = lines.map((line) => {
    const trimmed = line.trim();

    // Track the opening tag of a JSX element spanning multiple lines.
    const tagMatch = trimmed.match(/^<([A-Za-z][A-Za-z0-9]*)$/);
    if (tagMatch) currentTag = tagMatch[1];

    // Enter an items array for LegalList only.
    if (currentTag === "LegalList" && !inItems && /^items=\{\[\s*$/.test(trimmed)) {
      inItems = true;
      depth = 1; // the `[` from `items={[`
      itemIndex = 0;
      return line;
    }

    if (inItems) {
      // Keep track of nested brackets so we know when the array ends.
      for (const ch of trimmed) {
        if (ch === "[") depth++;
        else if (ch === "]") depth--;
      }

      // Fragment opening line: `<>`
      if (trimmed === "<>") {
        changed++;
        const indent = line.match(/^\s*/)[0];
        return `${indent}<Fragment key="item-${++itemIndex}">`;
      }

      // Fragment closing line: `</>` (with optional trailing comma)
      if (/^<\/>\s*,?\s*$/.test(trimmed)) {
        changed++;
        const indent = line.match(/^\s*/)[0];
        const comma = trimmed.endsWith(",") ? "," : "";
        return `${indent}</Fragment>${comma}`;
      }

      if (depth <= 0) {
        inItems = false;
        currentTag = null; // the element ends shortly after; reset
      }
    }

    return line;
  });

  // Add the Fragment import (these pages previously had no React import).
  let result = out.join("\n");
  if (changed > 0 && !/^import \{ Fragment \}/m.test(result)) {
    result = `import { Fragment } from "react";\n\n${result}`;
  }

  fs.writeFileSync(file, result, "utf8");
  console.log(`${file}: rewrote ${changed} fragments`);
}
