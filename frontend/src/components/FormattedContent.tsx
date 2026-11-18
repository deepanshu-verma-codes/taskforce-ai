import React, { useState } from 'react';
import { Copy, Check, Info, AlertTriangle, CheckCircle2, ChevronRight, Terminal } from 'lucide-react';

interface FormattedContentProps {
  content?: string;
  className?: string;
}

interface TableData {
  headers: string[];
  alignments: ('left' | 'center' | 'right')[];
  rows: string[][];
}

interface CodeData {
  language: string;
  code: string;
}

interface Block {
  type: 'heading' | 'table' | 'code' | 'blockquote' | 'list' | 'hr' | 'paragraph' | 'math';
  level?: number;
  content?: string;
  tableData?: TableData;
  codeData?: CodeData;
  listOrdered?: boolean;
  listItems?: string[];
}

export const FormattedContent: React.FC<FormattedContentProps> = ({
  content,
  className = '',
}) => {
  if (!content || !content.trim()) {
    return <div className="text-xs text-[#707a8a] italic">No content provided.</div>;
  }

  // Pre-process and parse markdown into structured blocks
  const blocks = parseMarkdownBlocks(content);

  return (
    <div className={`space-y-4 text-[#181a20] dark:text-[#eaecef] ${className}`}>
      {blocks.map((block, idx) => (
        <BlockRenderer key={idx} block={block} />
      ))}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* LaTeX Math Normalizer & Formatter                                          */
/* -------------------------------------------------------------------------- */

export function formatLatexMath(raw: string): string {
  if (!raw) return '';

  let text = raw;

  // 1. Remove enclosing math delimiters if present
  text = text.replace(/^\\\[\s*/, '').replace(/\s*\\\]$/, '');
  text = text.replace(/^\$\$\s*/, '').replace(/\s*\$\$$/, '');
  text = text.replace(/^\\\(\s*/, '').replace(/\s*\\\)$/, '');
  text = text.replace(/^\$\s*/, '').replace(/\s*\$$/, '');

  // 2. Strip LaTeX environments
  text = text.replace(/\\begin\{(aligned|cases|bmatrix|matrix|pmatrix|array)\}/g, '');
  text = text.replace(/\\end\{(aligned|cases|bmatrix|matrix|pmatrix|array)\}/g, '');

  // 3. LaTeX formatting & sizing
  text = text.replace(/\\(text|mathrm|mathbf|mathit|mathsf|operatorname)\{([^}]+)\}/g, '$2');
  text = text.replace(/\\operatorname\s+([a-zA-Z]+)/g, '$1');
  text = text.replace(/\\(quad|qquad)/g, '    ');
  text = text.replace(/\\[,;:!]/g, ' ');
  text = text.replace(/\\displaystyle/g, '');

  // 4. Fractions: \frac{a}{b} -> (a) / (b)
  for (let round = 0; round < 3; round++) {
    text = text.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1) / ($2)');
  }

  // 5. Roots: \sqrt{x} -> √(x)
  text = text.replace(/\\sqrt\{([^{}]+)\}/g, '√($1)');
  text = text.replace(/\\sqrt\s+([a-zA-Z0-9])/g, '√$1');

  // 6. Number Sets
  text = text.replace(/\\mathbb\{R\}|\\mathbb R/g, 'ℝ');
  text = text.replace(/\\mathbb\{N\}|\\mathbb N/g, 'ℕ');
  text = text.replace(/\\mathbb\{Z\}|\\mathbb Z/g, 'ℤ');
  text = text.replace(/\\mathbb\{C\}|\\mathbb C/g, 'ℂ');
  text = text.replace(/\\mathbb\{Q\}|\\mathbb Q/g, 'ℚ');

  // 7. Greek letters
  const greekMap: Record<string, string> = {
    alpha: 'α', beta: 'β', gamma: 'γ', Gamma: 'Γ', delta: 'δ', Delta: 'Δ',
    epsilon: 'ε', varepsilon: 'ε', zeta: 'ζ', eta: 'η', theta: 'θ', Theta: 'Θ',
    iota: 'ι', kappa: 'κ', lambda: 'λ', Lambda: 'Λ', mu: 'μ', nu: 'ν',
    xi: 'ξ', pi: 'π', Pi: 'Π', rho: 'ρ', sigma: 'σ', Sigma: 'Σ',
    tau: 'τ', phi: 'ϕ', varphi: 'ϕ', Phi: 'Φ', chi: 'χ', psi: 'ψ', Psi: 'Ψ',
    omega: 'ω', Omega: 'Ω'
  };
  for (const [name, sym] of Object.entries(greekMap)) {
    const re = new RegExp(`\\\\${name}(?![a-zA-Z])`, 'g');
    text = text.replace(re, sym);
  }

  // 8. Math Operators & Relations
  text = text.replace(/\\nabla/g, '∇');
  text = text.replace(/\\le0/g, '≤ 0');
  text = text.replace(/\\ge0/g, '≥ 0');
  text = text.replace(/\\(le|leq)(?![a-zA-Z])/g, '≤');
  text = text.replace(/\\(ge|geq)(?![a-zA-Z])/g, '≥');
  text = text.replace(/\\(ne|neq)(?![a-zA-Z])/g, '≠');
  text = text.replace(/\\approx/g, '≈');
  text = text.replace(/\\times/g, '×');
  text = text.replace(/\\cdot/g, '·');
  text = text.replace(/\\pm/g, '±');
  text = text.replace(/\\mp/g, '∓');
  text = text.replace(/\\in(?![a-zA-Z])/g, '∈');
  text = text.replace(/\\notin/g, '∉');
  text = text.replace(/\\subset(?![a-zA-Z])/g, '⊂');
  text = text.replace(/\\subseteq/g, '⊆');
  text = text.replace(/\\cup/g, '∪');
  text = text.replace(/\\cap/g, '∩');
  text = text.replace(/\\sum/g, '∑');
  text = text.replace(/\\prod/g, '∏');
  text = text.replace(/\\int/g, '∫');
  text = text.replace(/\\partial/g, '∂');
  text = text.replace(/\\infty/g, '∞');
  text = text.replace(/\\(to|rightarrow)/g, '→');
  text = text.replace(/\\leftarrow/g, '←');
  text = text.replace(/\\forall/g, '∀');
  text = text.replace(/\\exists/g, '∃');
  text = text.replace(/\\succ(?![a-zA-Z])/g, '≻');
  text = text.replace(/\\prec(?![a-zA-Z])/g, '≺');
  text = text.replace(/\\succeq/g, '⪰');
  text = text.replace(/\\preceq/g, '⪯');

  // 9. Transpose & powers
  text = text.replace(/\^\\top|\^T|\^\{\\top\}|\^\{T\}/g, 'ᵀ');
  text = text.replace(/\^\\ast|\^\{(\\ast|\*)\}|\^\*/g, '*');
  text = text.replace(/\^2/g, '²');
  text = text.replace(/\^3/g, '³');
  text = text.replace(/\^k/g, 'ᵏ');
  text = text.replace(/\^n/g, 'ⁿ');

  // 10. Common Subscripts
  const subscriptMap: Record<string, string> = {
    '_{k+1}': 'ₖ₊₁', '_{xx}': 'ₓₓ', '_{act}': ' act', '_{pd}': ' pd',
    '_0': '₀', '_1': '₁', '_2': '₂', '_3': '₃', '_4': '₄',
    '_5': '₅', '_6': '₆', '_7': '₇', '_8': '₈', '_9': '₉',
    '_i': 'ᵢ', '_j': 'ⱼ', '_k': 'ₖ', '_n': 'ₙ', '_m': 'ₘ', '_p': 'ₚ', '_x': 'ₓ'
  };
  for (const [sub, sym] of Object.entries(subscriptMap)) {
    text = text.split(sub).join(sym);
  }

  // 11. Accents: \tilde{x} -> ~x, \hat{x} -> ^x, \bar{x} -> x̄
  text = text.replace(/\\tilde\{([^}]+)\}/g, '~$1');
  text = text.replace(/\\tilde\s*([a-zA-Z])/g, '~$1');
  text = text.replace(/\\hat\{([^}]+)\}/g, '^$1');
  text = text.replace(/\\hat\s*([a-zA-Z])/g, '^$1');
  text = text.replace(/\\bar\{([^}]+)\}/g, '$1̄');

  // 12. Cleanup linebreaks & alignment ampersands
  text = text.replace(/\\\\/g, '\n');
  text = text.replace(/&/g, ' ');
  text = text.replace(/\\s\.t\./g, 's.t.');

  // 13. Remove leftover backslashes in front of single non-alphanumeric chars or escaped asterisks
  text = text.replace(/\\\*/g, '*');
  text = text.replace(/\\([a-zA-Z0-9]+)/g, '$1');
  text = text.replace(/\\/g, '');

  return text.trim();
}

/* -------------------------------------------------------------------------- */
/* Block Parser                                                               */
/* -------------------------------------------------------------------------- */

function normalizeCodeTablesAndFences(rawText: string): string {
  if (!rawText) return '';
  const lines = rawText.replace(/\r\n/g, '\n').split('\n');
  const output: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check if table header has code, snippet, diff, or patch column
    const isCodeHeader =
      trimmed.startsWith('|') &&
      trimmed.endsWith('|') &&
      /\b(code|snippet|patch|diff|implementation)\b/i.test(trimmed) &&
      i + 1 < lines.length &&
      lines[i + 1].trim().startsWith('|') &&
      lines[i + 1].includes('-');

    if (isCodeHeader) {
      i += 2; // skip header and separator lines

      while (i < lines.length) {
        const rowLine = lines[i];
        const rTrimmed = rowLine.trim();
        if (!rTrimmed) {
          i++;
          break;
        }
        if (rTrimmed.startsWith('#') || (rTrimmed.startsWith('**') && !rTrimmed.startsWith('|'))) {
          break;
        }
        if (!rTrimmed.startsWith('|')) {
          i++;
          continue;
        }

        const parts = rTrimmed.split('|');
        const cells = parts.slice(1).map(p => p.trim());
        if (cells.length > 0 && cells[cells.length - 1] === '') {
          cells.pop();
        }

        const col1 = cells[0] || '';
        const col2 = cells[1] || '';
        const remainder = cells.slice(2).join(' | ');

        let lang = 'typescript';
        const codeLines: string[] = [];

        // Check if remainder or col2 starts code fence
        const targetCell = remainder || col2;
        const m = targetCell.match(/```([a-zA-Z0-9_\-\+]*)([\s\S]*)/);
        if (m) {
          lang = m[1].trim() || 'typescript';
          let initial = m[2].trim();
          if (initial.endsWith('```')) {
            initial = initial.slice(0, -3).trim();
          }
          if (initial.endsWith('|')) {
            initial = initial.slice(0, -1).trim();
          }
          if (initial) {
            codeLines.push(initial);
          }
        } else if (remainder) {
          codeLines.push(remainder.replace(/^`+|`+$/g, '').trim());
        }

        let rowClosed =
          targetCell.includes('```') &&
          targetCell.lastIndexOf('```') > 2;
        i++;

        while (i < lines.length && !rowClosed) {
          const cline = lines[i];
          const ctrim = cline.trim();
          if (ctrim.includes('```')) {
            const beforeFence = cline.slice(0, cline.lastIndexOf('```')).trimEnd();
            if (beforeFence.trim()) {
              codeLines.push(beforeFence);
            }
            rowClosed = true;
            i++;
            break;
          } else {
            codeLines.push(cline);
            i++;
          }
        }

        const title = col1.replace(/\*\*/g, '').trim();
        const desc = col2.replace(/\*\*/g, '').trim();

        if (title) {
          output.push(`### ${title}`);
        }
        if (desc && !desc.startsWith('```')) {
          output.push(`${desc}\n`);
        }

        let cleanCode = codeLines.join('\n').trim();
        cleanCode = cleanCode.replace(/\|\s*$/, '').trim();
        if (cleanCode) {
          output.push(`\`\`\`${lang}\n${cleanCode}\n\`\`\`\n`);
        }
      }
      continue;
    }

    output.push(line);
    i++;
  }

  return output.join('\n');
}

function parseMarkdownBlocks(rawText: string): Block[] {
  const normalized = normalizeCodeTablesAndFences(rawText);
  const lines = normalized.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;

  // Check if entire content is a raw unified diff without backticks
  const isRawDiff = lines.some(l => l.startsWith('diff --git') || (l.startsWith('--- a/') && lines.some(l2 => l2.startsWith('+++ b/'))));
  if (isRawDiff && !rawText.includes('```')) {
    return [{
      type: 'code',
      codeData: { language: 'diff', code: rawText.trim() },
    }];
  }

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. Skip completely empty lines
    if (!trimmed) {
      i++;
      continue;
    }

    // 2. Fenced Code Block: ```lang ... ```
    if (trimmed.startsWith('```')) {
      const language = trimmed.slice(3).trim() || 'code';
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // consume closing ```
      blocks.push({
        type: 'code',
        codeData: { language, code: codeLines.join('\n') },
      });
      continue;
    }

    // 2.5 Math Block: \[ ... \] or $$ ... $$ or \begin{aligned/cases/bmatrix}
    if (
      trimmed.startsWith('\\[') ||
      trimmed.startsWith('$$') ||
      /^\\begin\{(aligned|cases|bmatrix|matrix|pmatrix)\}/.test(trimmed)
    ) {
      const isBracket = trimmed.startsWith('\\[');
      const isDollar = trimmed.startsWith('$$');
      const closingTag = isBracket
        ? '\\]'
        : isDollar
        ? '$$'
        : `\\end{${trimmed.match(/^\\begin\{([^}]+)\}/)?.[1] || 'aligned'}}`;

      // Single line math block: e.g. \[ f(x) \le 0 \]
      if ((isBracket || isDollar) && trimmed.length > 2 && trimmed.endsWith(closingTag)) {
        const rawFormula = trimmed.slice(2, -2).trim();
        blocks.push({
          type: 'math',
          content: rawFormula,
        });
        i++;
        continue;
      }

      // Multiline math block
      const mathLines: string[] = [];
      if (isBracket || isDollar) {
        const firstLineInner = trimmed.slice(2).trim();
        if (firstLineInner) mathLines.push(firstLineInner);
      } else {
        mathLines.push(trimmed);
      }
      i++;

      while (i < lines.length && !lines[i].includes(closingTag)) {
        mathLines.push(lines[i]);
        i++;
      }

      if (i < lines.length) {
        const lastLine = lines[i];
        const beforeClosing = lastLine.slice(0, lastLine.indexOf(closingTag)).trim();
        if (beforeClosing) mathLines.push(beforeClosing);
        i++; // consume line with closing tag
      }

      blocks.push({
        type: 'math',
        content: mathLines.join('\n'),
      });
      continue;
    }

    // 3. Table Block: lines starting and containing |
    if (trimmed.startsWith('|') && trimmed.endsWith('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }
      const tableData = parseTable(tableLines);
      if (tableData) {
        blocks.push({ type: 'table', tableData });
        continue;
      }
    }

    // Ignore orphaned or cut-off table fragments
    if (trimmed.startsWith('|')) {
      i++;
      continue;
    }

    // 4. Horizontal Rule: --- or ***
    if (/^(\-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    // 5. Headings: #, ##, ###, ####
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length,
        content: headingMatch[2],
      });
      i++;
      continue;
    }

    // 6. Blockquote: > ...
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      blocks.push({
        type: 'blockquote',
        content: quoteLines.join('\n'),
      });
      continue;
    }

    // 7. Unordered List: - or *
    if (/^[\*\-]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[\*\-]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[\*\-]\s+/, ''));
        i++;
      }
      blocks.push({
        type: 'list',
        listOrdered: false,
        listItems: items,
      });
      continue;
    }

    // 8. Ordered List: 1. or 2.
    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
        i++;
      }
      blocks.push({
        type: 'list',
        listOrdered: true,
        listItems: items,
      });
      continue;
    }

    // 9. Standard Paragraph (consume contiguous non-empty lines)
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith('```') &&
      !lines[i].trim().startsWith('#') &&
      !lines[i].trim().startsWith('>') &&
      !lines[i].trim().startsWith('|') &&
      !/^[\*\-]\s+/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim()) &&
      !/^(\-{3,}|\*{3,}|_{3,})$/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i].trim());
      i++;
    }

    if (paraLines.length > 0) {
      const joined = paraLines.join('\n');
      // If paragraph contains unparsed code fences or code statements ending in backticks/pipes
      if (
        (joined.includes('```') && (joined.endsWith('``` |') || joined.endsWith('```'))) ||
        /^(const|let|var|import|export|function|interface|type|class|def)\s/.test(joined.trim())
      ) {
        const cleanCode = joined
          .replace(/```[a-zA-Z0-9_\-\+]*\s*\|?$/g, '')
          .replace(/```\s*\|?$/g, '')
          .replace(/^```[a-zA-Z0-9_\-\+]*\n?/g, '')
          .replace(/\|\s*$/, '')
          .trim();
        blocks.push({
          type: 'code',
          codeData: { language: 'typescript', code: cleanCode },
        });
      } else {
        blocks.push({
          type: 'paragraph',
          content: paraLines.join(' '),
        });
      }
    }
  }

  return blocks;
}

function isTableSeparator(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) return false;
  const parts = trimmed.split('|').slice(1, -1);
  return parts.length > 0 && parts.every(p => /^[\s\:\-]+$/.test(p) && p.includes('-'));
}

function parseTable(lines: string[]): TableData | null {
  if (lines.length < 2) return null;

  const rawHeaders = lines[0].split('|').slice(1, -1).map(h => h.trim());
  const separatorParts = lines[1].split('|').slice(1, -1).map(s => s.trim());

  const alignments: ('left' | 'center' | 'right')[] = separatorParts.map(part => {
    const starts = part.startsWith(':');
    const ends = part.endsWith(':');
    if (starts && ends) return 'center';
    if (ends) return 'right';
    return 'left';
  });

  const rows: string[][] = [];
  for (let i = 2; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine.startsWith('|') || !rawLine.endsWith('|')) continue;
    const cells = rawLine.split('|').slice(1, -1).map(c => c.trim());
    if (cells.length === 0 || cells.every(c => !c)) continue;
    // Pad row with empty cells if column count is less than headers
    while (cells.length < rawHeaders.length) {
      cells.push('');
    }
    rows.push(cells);
  }

  return {
    headers: rawHeaders,
    alignments,
    rows,
  };
}

/* -------------------------------------------------------------------------- */
/* Block Component Renderers                                                  */
/* -------------------------------------------------------------------------- */

const BlockRenderer: React.FC<{ block: Block }> = ({ block }) => {
  switch (block.type) {
    case 'heading':
      return <HeadingRenderer level={block.level || 2} text={block.content || ''} />;

    case 'table':
      return block.tableData ? <TableRenderer data={block.tableData} /> : null;

    case 'code':
      return block.codeData ? <CodeBlockRenderer data={block.codeData} /> : null;

    case 'blockquote':
      return <BlockquoteRenderer text={block.content || ''} />;

    case 'list':
      return (
        <ListRenderer
          ordered={block.listOrdered || false}
          items={block.listItems || []}
        />
      );

    case 'hr':
      return <hr className="my-6 border-[#eaecef] dark:border-[#2b3139]" />;

    case 'math':
      return <MathBlockRenderer formula={block.content || ''} />;

    case 'paragraph':
    default:
      return (
        <p className="text-xs md:text-sm text-[#181a20] dark:text-[#eaecef] leading-relaxed">
          <InlineMarkdown text={block.content || ''} />
        </p>
      );
  }
};

const HeadingRenderer: React.FC<{ level: number; text: string }> = ({ level, text }) => {
  if (level === 1) {
    return (
      <div className="pt-2 pb-2 border-b border-[#eaecef] dark:border-[#2b3139] my-4">
        <h2 className="text-base md:text-lg font-bold text-[#181a20] dark:text-white flex items-center gap-2">
          <span className="w-1.5 h-4.5 rounded bg-[#FCD535] inline-block" />
          <InlineMarkdown text={text} />
        </h2>
      </div>
    );
  }

  if (level === 2) {
    return (
      <div className="pt-3 pb-1.5 border-b border-[#eaecef] dark:border-[#2b3139] mt-5 mb-2">
        <h3 className="text-sm md:text-base font-bold text-[#181a20] dark:text-white flex items-center gap-2">
          <span className="w-1.5 h-3.5 rounded bg-[#0ecb81] inline-block" />
          <InlineMarkdown text={text} />
        </h3>
      </div>
    );
  }

  if (level === 3) {
    return (
      <h4 className="text-xs md:text-sm font-bold text-[#b8860b] dark:text-[#FCD535] mt-4 mb-1 flex items-center gap-1.5">
        <ChevronRight className="h-3.5 w-3.5" />
        <InlineMarkdown text={text} />
      </h4>
    );
  }

  return (
    <h5 className="text-xs font-semibold text-[#707a8a] dark:text-[#a0aec0] uppercase tracking-wider mt-3 mb-1">
      <InlineMarkdown text={text} />
    </h5>
  );
};

const TableRenderer: React.FC<{ data: TableData }> = ({ data }) => {
  return (
    <div className="my-3 rounded-xl border border-[#eaecef] dark:border-[#2b3139] overflow-hidden bg-white dark:bg-[#181a20] shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs md:text-[13px]">
          <thead>
            <tr className="bg-[#f8f9fa] dark:bg-[#12161c] border-b border-[#eaecef] dark:border-[#2b3139]">
              {data.headers.map((h, i) => (
                <th
                  key={i}
                  className={`px-4 py-2.5 font-semibold text-[#181a20] dark:text-white text-[11px] uppercase tracking-wider ${
                    data.alignments[i] === 'center'
                      ? 'text-center'
                      : data.alignments[i] === 'right'
                      ? 'text-right'
                      : 'text-left'
                  }`}
                >
                  <InlineMarkdown text={h} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#eaecef] dark:divide-[#2b3139]">
            {data.rows.map((row, rIdx) => (
              <tr
                key={rIdx}
                className={`transition-colors hover:bg-[#fcfcfd] dark:hover:bg-[#1e2329]/70 ${
                  rIdx % 2 === 1 ? 'bg-[#fafafa]/50 dark:bg-[#151a21]/50' : 'bg-white dark:bg-[#181a20]'
                }`}
              >
                {row.map((cell, cIdx) => (
                  <td
                    key={cIdx}
                    className={`px-4 py-2.5 text-[#181a20] dark:text-[#eaecef] leading-relaxed align-top ${
                      data.alignments[cIdx] === 'center'
                        ? 'text-center'
                        : data.alignments[cIdx] === 'right'
                        ? 'text-right'
                        : 'text-left'
                    }`}
                  >
                    <InlineMarkdown text={cell} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const MathBlockRenderer: React.FC<{ formula: string }> = ({ formula }) => {
  const [copied, setCopied] = useState(false);
  const clean = formatLatexMath(formula).trim();

  const handleCopy = () => {
    navigator.clipboard.writeText(clean);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3.5 rounded-xl border border-[#eaecef] dark:border-[#2b3139] overflow-hidden bg-white dark:bg-[#12161c] shadow-xs">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#f8f9fa] dark:bg-[#181d24] border-b border-[#eaecef] dark:border-[#2b3139]">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded flex items-center justify-center bg-[#FCD535]/15 text-[#b8860b] dark:text-[#FCD535] font-bold text-xs">
            ∑
          </div>
          <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-[#707a8a] dark:text-[#a0aec0]">
            Formula / System Model
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[11px] text-[#707a8a] hover:text-[#181a20] dark:hover:text-white transition-colors cursor-pointer"
          title="Copy Formula"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-[#0ecb81]" />
              <span className="text-[#0ecb81] text-[10px]">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span className="text-[10px]">Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="p-4 overflow-x-auto text-xs md:text-sm font-mono text-[#181a20] dark:text-[#FCD535] leading-relaxed whitespace-pre-wrap select-all">
        {clean}
      </div>
    </div>
  );
};

const CodeBlockRenderer: React.FC<{ data: CodeData }> = ({ data }) => {
  const [copied, setCopied] = useState(false);

  // Clean any accidental trailing pipes or broken markdown markers from code
  const cleanCode = (data.code || '')
    .replace(/\s*```\s*\|?\s*$/, '')
    .replace(/\|\s*$/, '')
    .trim();

  const isDiff = data.language === 'diff' || cleanCode.includes('--- a/') || cleanCode.startsWith('diff --git');
  const lines = cleanCode.split('\n');

  const handleCopy = () => {
    navigator.clipboard.writeText(cleanCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const langUpper = (data.language || (isDiff ? 'DIFF' : 'CODE')).toUpperCase();

  return (
    <div className="my-4 rounded-xl border border-[#2b3139] overflow-hidden bg-[#0d1117] shadow-md transition-all">
      {/* VS Code Window Top Bar */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-[#161b22] border-b border-[#2b3139] text-[11px] font-mono">
        <div className="flex items-center gap-2.5">
          {/* Traffic light dots */}
          <div className="flex items-center gap-1.5 mr-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f6465d]/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#FCD535]/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#0ecb81]/80 inline-block" />
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#21262d] text-[#eaecef] border border-[#30363d]">
            <Terminal className="h-3.5 w-3.5 text-[#FCD535]" />
            <span className="font-semibold tracking-wider text-[10px]">{langUpper}</span>
          </div>
          <span className="text-[#8b949e] text-[10px] hidden sm:inline">
            {lines.length} {lines.length === 1 ? 'line' : 'lines'}
          </span>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] hover:text-white transition-colors cursor-pointer text-[10px] font-semibold border border-[#30363d]"
          title="Copy code to clipboard"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-[#0ecb81]" />
              <span className="text-[#0ecb81]">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Copy Code</span>
            </>
          )}
        </button>
      </div>

      {/* VS Code Code Body with Line Numbers Gutter */}
      <div className="p-0 overflow-x-auto text-xs font-mono leading-relaxed select-text bg-[#0d1117]">
        {isDiff ? (
          <div className="p-3">
            {lines.map((line, idx) => {
              let lineClass = 'text-[#c9d1d9]';
              let bgClass = '';

              if (line.startsWith('+') && !line.startsWith('+++')) {
                lineClass = 'text-[#0ecb81] font-medium';
                bgClass = 'bg-[#0ecb81]/10 px-1 -mx-1 rounded-xs';
              } else if (line.startsWith('-') && !line.startsWith('---')) {
                lineClass = 'text-[#f6465d] line-through opacity-85';
                bgClass = 'bg-[#f6465d]/10 px-1 -mx-1 rounded-xs';
              } else if (line.startsWith('@@')) {
                lineClass = 'text-[#FCD535] font-semibold';
                bgClass = 'bg-[#21262d] px-1 -mx-1 rounded-xs';
              } else if (line.startsWith('---') || line.startsWith('+++')) {
                lineClass = 'text-[#8b949e] font-semibold';
              }

              return (
                <div key={idx} className={`whitespace-pre ${bgClass} ${lineClass}`}>
                  {line || ' '}
                </div>
              );
            })}
          </div>
        ) : (
          <table className="w-full border-collapse font-mono text-[12px] leading-5">
            <tbody>
              {lines.map((line, idx) => (
                <tr key={idx} className="hover:bg-[#161b22]/70 transition-colors">
                  {/* Line Number Gutter */}
                  <td className="w-10 select-none text-right pr-3.5 pl-3 py-0.5 text-[#484f58] border-r border-[#21262d] font-mono text-[11px] align-top">
                    {idx + 1}
                  </td>
                  {/* Code Line Content */}
                  <td className="pl-4 pr-4 py-0.5 whitespace-pre text-[#c9d1d9] align-top font-mono">
                    <code>{line || ' '}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

const BlockquoteRenderer: React.FC<{ text: string }> = ({ text }) => {
  const isWarning = text.toLowerCase().includes('call 911') || text.toLowerCase().includes('emergency') || text.toLowerCase().includes('danger') || text.toLowerCase().includes('warning');
  const isVerdict = text.toLowerCase().includes('verdict') || text.toLowerCase().includes('overall');

  let borderColor = 'border-[#b8860b] dark:border-[#FCD535]';
  let bgColor = 'bg-[#fdfaf0] dark:bg-[#181e26]';
  let icon = <Info className="h-4 w-4 text-[#b8860b] dark:text-[#FCD535] shrink-0 mt-0.5" />;

  if (isWarning) {
    borderColor = 'border-[#f6465d]';
    bgColor = 'bg-[#fff5f5] dark:bg-[#251518]';
    icon = <AlertTriangle className="h-4 w-4 text-[#f6465d] shrink-0 mt-0.5" />;
  } else if (isVerdict) {
    borderColor = 'border-[#0ecb81]';
    bgColor = 'bg-[#f0fdf4] dark:bg-[#122119]';
    icon = <CheckCircle2 className="h-4 w-4 text-[#0ecb81] shrink-0 mt-0.5" />;
  }

  return (
    <div className={`my-3.5 p-3.5 rounded-xl border-l-4 ${borderColor} ${bgColor} border border-[#eaecef] dark:border-[#2b3139] flex items-start gap-2.5 shadow-xs`}>
      {icon}
      <div className="text-xs md:text-sm text-[#181a20] dark:text-[#eaecef] leading-relaxed flex-1">
        <InlineMarkdown text={text} />
      </div>
    </div>
  );
};

const ListRenderer: React.FC<{ ordered: boolean; items: string[] }> = ({ ordered, items }) => {
  return ordered ? (
    <ol className="my-2.5 space-y-1.5 list-none">
      {items.map((item, idx) => (
        <li key={idx} className="flex items-start gap-2.5 text-xs md:text-sm text-[#181a20] dark:text-[#eaecef] leading-relaxed">
          <span className="w-5 h-5 rounded-full bg-[#f0f2f5] dark:bg-[#2b3139] text-[#181a20] dark:text-[#eaecef] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
            {idx + 1}
          </span>
          <div className="flex-1">
            <InlineMarkdown text={item} />
          </div>
        </li>
      ))}
    </ol>
  ) : (
    <ul className="my-2.5 space-y-1.5 list-none">
      {items.map((item, idx) => (
        <li key={idx} className="flex items-start gap-2.5 text-xs md:text-sm text-[#181a20] dark:text-[#eaecef] leading-relaxed">
          <span className="w-1.5 h-1.5 rounded-full bg-[#FCD535] shrink-0 mt-2" />
          <div className="flex-1">
            <InlineMarkdown text={item} />
          </div>
        </li>
      ))}
    </ul>
  );
};

/* -------------------------------------------------------------------------- */
/* Inline Markdown & Formatting Parser                                        */
/* -------------------------------------------------------------------------- */

export const InlineMarkdown: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null;

  // 1. Handle HTML line breaks <br>, <br/>, <br />
  const lines = text.split(/<br\s*\/?>/gi);

  return (
    <>
      {lines.map((line, lIdx) => (
        <React.Fragment key={lIdx}>
          {lIdx > 0 && <br />}
          {renderLineTokens(line)}
        </React.Fragment>
      ))}
    </>
  );
};

function renderLineTokens(line: string): React.ReactNode {
  // Clean any trailing broken fences or table pipes from inline lines
  const cleanLine = line
    .replace(/```[a-zA-Z0-9_\-\+]*\s*\|?$/g, '')
    .replace(/```\s*\|?$/g, '')
    .replace(/\|\s*$/, '')
    .trimEnd();

  // Tokenize bold **...**, code `...`, italic *...*
  const tokens: React.ReactNode[] = [];
  let remaining = cleanLine;
  let key = 0;

  while (remaining.length > 0) {
    // 1. Bold: **text**
    const boldMatch = remaining.match(/\*\*(.*?)\*\*/);
    // 2. Inline Code: `code`
    const codeMatch = remaining.match(/`([^`]+)`/);
    // 3. Italic: *text* (when not bold)
    const italicMatch = remaining.match(/(?<!\*)\*([^*]+)\*(?!\*)/);
    // 4. Inline LaTeX math: \(... \)
    const parenMathMatch = remaining.match(/\\\((.*?)\\\)/);
    // 5. Inline dollar math: $...$
    const dollarMathMatch = remaining.match(/(?<!\$)\$(?!\$)([^\$\n]{1,160})(?<!\$)\$/);

    // Find the earliest match
    let earliest: { type: 'bold' | 'code' | 'italic' | 'math'; index: number; match: RegExpMatchArray } | null = null;

    if (boldMatch && boldMatch.index !== undefined) {
      earliest = { type: 'bold', index: boldMatch.index, match: boldMatch };
    }
    if (codeMatch && codeMatch.index !== undefined && (!earliest || codeMatch.index < earliest.index)) {
      earliest = { type: 'code', index: codeMatch.index, match: codeMatch };
    }
    if (italicMatch && italicMatch.index !== undefined && (!earliest || italicMatch.index < earliest.index)) {
      earliest = { type: 'italic', index: italicMatch.index, match: italicMatch };
    }
    if (parenMathMatch && parenMathMatch.index !== undefined && (!earliest || parenMathMatch.index < earliest.index)) {
      earliest = { type: 'math', index: parenMathMatch.index, match: parenMathMatch };
    }
    if (dollarMathMatch && dollarMathMatch.index !== undefined && (!earliest || dollarMathMatch.index < earliest.index)) {
      earliest = { type: 'math', index: dollarMathMatch.index, match: dollarMathMatch };
    }

    if (!earliest) {
      // No more formatting matches, push remaining text with keyword badges
      tokens.push(<React.Fragment key={key++}>{renderTextWithBadges(remaining)}</React.Fragment>);
      break;
    }

    // Push preceding plain text
    if (earliest.index > 0) {
      const plainText = remaining.substring(0, earliest.index);
      tokens.push(<React.Fragment key={key++}>{renderTextWithBadges(plainText)}</React.Fragment>);
    }

    // Push formatted element
    const innerText = earliest.match[1];
    if (earliest.type === 'bold') {
      tokens.push(
        <strong key={key++} className="font-bold text-[#181a20] dark:text-white">
          {renderTextWithBadges(innerText)}
        </strong>
      );
    } else if (earliest.type === 'code') {
      tokens.push(
        <code
          key={key++}
          className="px-1.5 py-0.5 mx-0.5 rounded-sm bg-[#f0f2f5] dark:bg-[#2b3139] text-[#b8860b] dark:text-[#FCD535] font-mono text-[11px] font-medium border border-[#eaecef] dark:border-[#38414e]"
        >
          {innerText}
        </code>
      );
    } else if (earliest.type === 'italic') {
      tokens.push(
        <em key={key++} className="italic text-[#707a8a] dark:text-[#a0aec0]">
          {innerText}
        </em>
      );
    } else if (earliest.type === 'math') {
      tokens.push(
        <code
          key={key++}
          className="px-1.5 py-0.5 mx-0.5 rounded bg-[#f0f2f5] dark:bg-[#1e2329] text-[#b8860b] dark:text-[#FCD535] font-mono text-[11px] font-semibold border border-[#eaecef] dark:border-[#38414e] inline-block"
        >
          {formatLatexMath(innerText)}
        </code>
      );
    }

    // Advance remaining
    remaining = remaining.substring(earliest.index + earliest.match[0].length);
  }

  return tokens;
}

function renderTextWithBadges(text: string): React.ReactNode {
  // If the cell/text has raw un-delimited LaTeX macros, sanitize them
  let cleanText = text;
  if (/\\(nabla|lambda|mu|alpha|beta|sigma|rho|phi|le|ge|operatorname|mathbb|begin|end|quad|sum|frac|partial)/.test(cleanText)) {
    cleanText = formatLatexMath(cleanText);
  }

  // If the cell/text is an exact short status keyword like "Yes", "No", "Pass", "Critical"
  const trimmed = cleanText.trim();
  const lower = trimmed.toLowerCase();

  if (lower === 'yes' || lower === 'pass' || lower === 'passed' || lower === 'safe') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-sm bg-[#0ecb81]/15 text-[#0ecb81] font-semibold text-[11px]">
        {trimmed}
      </span>
    );
  }

  if (lower === 'no' || lower === 'fail' || lower === 'failed' || lower === 'danger' || lower === 'critical') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-sm bg-[#f6465d]/15 text-[#f6465d] font-semibold text-[11px]">
        {trimmed}
      </span>
    );
  }

  if (lower === 'warning' || lower === 'medium' || lower === 'moderate') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-sm bg-[#b8860b]/15 dark:bg-[#FCD535]/15 text-[#b8860b] dark:text-[#FCD535] font-semibold text-[11px]">
        {trimmed}
      </span>
    );
  }

  return cleanText;
}
