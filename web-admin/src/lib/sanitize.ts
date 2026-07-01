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
