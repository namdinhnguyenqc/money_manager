// Lightweight server-side HTML sanitizer for admin-authored article content.
// Admin content is already trusted (requireAdmin), this is defence-in-depth:
// strips <script>/<style>/<iframe>, event handlers and javascript: URLs.
// NOTE: For untrusted input, replace with DOMPurify (isomorphic-dompurify).
export function sanitizeHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<\s*(script|style|iframe|object|embed|link|meta)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<\s*(script|style|iframe|object|embed|link|meta)[^>]*\/?>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src)\s*=\s*(["']?)\s*javascript:[^"'>\s]*/gi, "$1=$2#");
}

const BLOCK_TAG_RE = /<(p|h[1-6]|ul|ol|blockquote|table|div)[\s>]/i;

const escapeText = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Content pasted as plain text (no <p>/<h2>/<ul>... tags, just newline breaks)
// collapses into one unreadable wall of text once injected as HTML, since
// bare newlines are not paragraph breaks. If the content has no real block
// structure yet, auto-wrap each chunk of text into its own <p>, pulling any
// <img> tags out onto their own line even when glued directly to text (a
// common paste artifact). Content that already uses proper block tags is
// left untouched.
export function autoFormatContent(html: string): string {
  if (!html) return "";
  if (BLOCK_TAG_RE.test(html)) return html;

  // Ensure every <img> tag is on its own line so it becomes its own block.
  const withImgBreaks = html.replace(/<img[^>]*>/gi, (m) => `\n${m}\n`);

  const lines = withImgBreaks.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const blocks = lines.map((line) => {
    if (/^<img[^>]*>$/i.test(line)) return line;
    return `<p>${escapeText(line)}</p>`;
  });

  return blocks.join("\n");
}
