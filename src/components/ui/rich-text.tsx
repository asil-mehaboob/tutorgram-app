import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// ─── entity decoder ───────────────────────────────────────────────────────────

function decode(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

// ─── tokenizer ────────────────────────────────────────────────────────────────

type Token =
  | { t: 'open'; tag: string }
  | { t: 'close'; tag: string }
  | { t: 'br' }
  | { t: 'text'; value: string };

const OPEN_RE = /^<([a-z][a-z0-9]*)[^>]*>/i;
const CLOSE_RE = /^<\/([a-z][a-z0-9]*)>/i;
const BR_RE = /^<br\s*\/?>/i;
const TEXT_RE = /^[^<]+/;

function tokenize(html: string): Token[] {
  const tokens: Token[] = [];
  let src = html.trim();

  while (src.length > 0) {
    let m: RegExpMatchArray | null;

    if ((m = src.match(BR_RE))) {
      tokens.push({ t: 'br' });
      src = src.slice(m[0].length);
    } else if ((m = src.match(CLOSE_RE))) {
      tokens.push({ t: 'close', tag: m[1].toLowerCase() });
      src = src.slice(m[0].length);
    } else if ((m = src.match(OPEN_RE))) {
      tokens.push({ t: 'open', tag: m[1].toLowerCase() });
      src = src.slice(m[0].length);
    } else if ((m = src.match(TEXT_RE))) {
      tokens.push({ t: 'text', value: decode(m[0]) });
      src = src.slice(m[0].length);
    } else {
      src = src.slice(1); // skip unknown char
    }
  }

  return tokens;
}

// ─── inline renderer ──────────────────────────────────────────────────────────

const BLOCK_TAGS = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'blockquote', 'pre', 'div']);

type InlineStyle = { bold?: boolean; italic?: boolean; code?: boolean };

function renderInline(
  tokens: Token[],
  pos: number,
  closeTag: string | null,
  style: InlineStyle,
  color: string,
  linkColor: string,
  codeBg: string,
): { nodes: React.ReactNode[]; pos: number } {
  const nodes: React.ReactNode[] = [];
  let i = pos;

  while (i < tokens.length) {
    const tok = tokens[i];

    if (tok.t === 'text') {
      const text = tok.value;
      if (text.trim() || text.includes(' ')) {
        nodes.push(
          <Text key={i} style={inlineStyle(style, color, codeBg)}>
            {text}
          </Text>,
        );
      }
      i++;
      continue;
    }

    if (tok.t === 'br') {
      nodes.push(<Text key={i}>{'\n'}</Text>);
      i++;
      continue;
    }

    if (tok.t === 'close') {
      if (tok.tag === closeTag || BLOCK_TAGS.has(tok.tag)) {
        if (tok.tag === closeTag) i++; // consume the close tag
        break;
      }
      i++;
      continue;
    }

    // tok.t === 'open'
    if (BLOCK_TAGS.has(tok.tag)) break;

    // inline open tag — recurse with modified style
    let childStyle = style;
    if (tok.tag === 'strong' || tok.tag === 'b') childStyle = { ...style, bold: true };
    else if (tok.tag === 'em' || tok.tag === 'i') childStyle = { ...style, italic: true };
    else if (tok.tag === 'code') childStyle = { ...style, code: true };
    else if (tok.tag === 'a') {
      const { nodes: inner, pos: next } = renderInline(tokens, i + 1, tok.tag, childStyle, linkColor, linkColor, codeBg);
      nodes.push(<Text key={i} style={{ color: linkColor }}>{inner}</Text>);
      i = next;
      continue;
    }

    const { nodes: inner, pos: next } = renderInline(tokens, i + 1, tok.tag, childStyle, color, linkColor, codeBg);
    nodes.push(<Text key={i} style={inlineStyle(childStyle, color, codeBg)}>{inner}</Text>);
    i = next;
  }

  return { nodes, pos: i };
}

function inlineStyle(s: InlineStyle, color: string, codeBg: string): object {
  if (s.code) {
    return { fontFamily: 'monospace', backgroundColor: codeBg, fontSize: 12, borderRadius: 3, color };
  }
  return {
    fontFamily: s.bold ? Fonts.bold : Fonts.regular,
    fontStyle: s.italic ? ('italic' as const) : ('normal' as const),
    color,
  };
}

// ─── block renderer ───────────────────────────────────────────────────────────

interface RichTextProps {
  html: string;
}

export function RichText({ html }: RichTextProps) {
  const theme = useTheme();
  const tokens = tokenize(html);
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let listIndex = 0; // tracks ordered list item number

  while (i < tokens.length) {
    const tok = tokens[i];

    if (tok.t !== 'open') { i++; continue; }

    const tag = tok.tag;

    // ── headings ──────────────────────────────────────────────────────────────
    if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
      const { nodes, pos } = renderInline(tokens, i + 1, tag, {}, theme.text, theme.primary, theme.surfaceEl);
      blocks.push(
        <Text key={i} style={[styles.heading, headingStyle(tag), { color: theme.text }]}>
          {nodes}
        </Text>,
      );
      i = pos;
      listIndex = 0;
      continue;
    }

    // ── paragraph ─────────────────────────────────────────────────────────────
    if (tag === 'p') {
      const { nodes, pos } = renderInline(tokens, i + 1, 'p', {}, theme.text, theme.primary, theme.surfaceEl);
      const content = nodes.filter((n) => n !== null && n !== undefined);
      if (content.length > 0) {
        blocks.push(
          <Text key={i} style={[styles.paragraph, { color: theme.text }]}>
            {content}
          </Text>,
        );
      }
      i = pos;
      listIndex = 0;
      continue;
    }

    // ── list containers: scan for <li> inside ─────────────────────────────────
    if (tag === 'ul' || tag === 'ol') {
      const ordered = tag === 'ol';
      let itemNum = 1;
      i++;
      while (i < tokens.length) {
        const inner = tokens[i];
        if (inner.t === 'close' && inner.tag === tag) { i++; break; }
        if (inner.t === 'open' && inner.tag === 'li') {
          // Tiptap wraps li content in <p> — collect inline nodes across all
          // child <p> blocks so "<li><p>text</p></li>" works correctly.
          const liKey = i;
          i++;
          const allNodes: React.ReactNode[] = [];
          while (i < tokens.length) {
            const liTok = tokens[i];
            if (liTok.t === 'close' && liTok.tag === 'li') { i++; break; }
            if (liTok.t === 'open' && liTok.tag === 'p') {
              const { nodes, pos } = renderInline(tokens, i + 1, 'p', {}, theme.text, theme.primary, theme.surfaceEl);
              allNodes.push(...nodes);
              i = pos;
            } else if (liTok.t === 'text' || liTok.t === 'br' || liTok.t === 'open') {
              const { nodes, pos } = renderInline(tokens, i, 'li', {}, theme.text, theme.primary, theme.surfaceEl);
              allNodes.push(...nodes);
              i = pos;
              break;
            } else {
              i++;
            }
          }
          const bullet = ordered ? `${itemNum}.` : '•';
          blocks.push(
            <View key={liKey} style={styles.listRow}>
              <Text style={[styles.bullet, { color: theme.textSecondary }]}>{bullet}</Text>
              <Text style={[styles.listText, { color: theme.text }]}>{allNodes}</Text>
            </View>,
          );
          itemNum++;
        } else {
          i++;
        }
      }
      listIndex = 0;
      continue;
    }

    // ── blockquote ────────────────────────────────────────────────────────────
    if (tag === 'blockquote') {
      const { nodes, pos } = renderInline(tokens, i + 1, 'blockquote', { italic: true }, theme.textSecondary, theme.primary, theme.surfaceEl);
      blocks.push(
        <View key={i} style={[styles.blockquote, { borderLeftColor: theme.border }]}>
          <Text style={[styles.blockquoteText, { color: theme.textSecondary }]}>{nodes}</Text>
        </View>,
      );
      i = pos;
      listIndex = 0;
      continue;
    }

    i++;
  }

  return <View style={styles.root}>{blocks}</View>;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function headingStyle(tag: string): object {
  if (tag === 'h1') return styles.h1;
  if (tag === 'h2') return styles.h2;
  return styles.h3;
}

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { gap: 6 },

  paragraph: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    lineHeight: 22,
  },

  heading: { lineHeight: 28, marginTop: 4 },
  h1: { fontFamily: Fonts.extraBold, fontSize: 20 },
  h2: { fontFamily: Fonts.bold, fontSize: 17 },
  h3: { fontFamily: Fonts.semiBold, fontSize: 15 },

  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bullet: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    lineHeight: 22,
    minWidth: 16,
  },
  listText: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: 14,
    lineHeight: 22,
  },

  blockquote: {
    borderLeftWidth: 3,
    paddingLeft: 12,
    marginVertical: 2,
  },
  blockquoteText: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 22,
  },
});
