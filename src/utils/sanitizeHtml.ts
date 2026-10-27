// Allow-list sanitizer for rendering stored rich text (blog/product descriptions)
// in CRM previews. Browser-only: it relies on DOMParser.

const ALLOWED_TAGS = new Set([
  "a",
  "b",
  "blockquote",
  "br",
  "code",
  "div",
  "em",
  "figcaption",
  "figure",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "i",
  "img",
  "li",
  "ol",
  "p",
  "pre",
  "s",
  "span",
  "strong",
  "sub",
  "sup",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "u",
  "ul",
]);

// Removed with their content; any other unknown tag is unwrapped (its text kept).
const DROPPED_TAGS = new Set([
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "link",
  "meta",
  "form",
  "input",
  "button",
  "textarea",
  "select",
  "noscript",
  "template",
  "svg",
  "math",
  "frame",
  "frameset",
  "base",
]);

const ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  a: ["href", "title"],
  img: ["src", "alt", "title", "width", "height"],
  td: ["colspan", "rowspan"],
  th: ["colspan", "rowspan", "scope"],
};

const SAFE_HREF = /^(https?:|mailto:|tel:|\/|#)/i;
const SAFE_SRC = /^(https?:|\/|data:image\/(png|jpe?g|gif|webp);)/i;

const clean = (parent: Element) => {
  for (const child of Array.from(parent.children)) {
    const tag = child.tagName.toLowerCase();
    if (DROPPED_TAGS.has(tag)) {
      child.remove();
      continue;
    }
    clean(child);
    if (!ALLOWED_TAGS.has(tag)) {
      child.replaceWith(...Array.from(child.childNodes));
      continue;
    }
    const allowed = ALLOWED_ATTRIBUTES[tag] || [];
    for (const attribute of Array.from(child.attributes)) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim();
      const unsafeUrl =
        (name === "href" && !SAFE_HREF.test(value)) ||
        (name === "src" && !SAFE_SRC.test(value));
      if (!allowed.includes(name) || unsafeUrl)
        child.removeAttribute(attribute.name);
    }
    if (tag === "a") {
      child.setAttribute("target", "_blank");
      child.setAttribute("rel", "noopener noreferrer nofollow");
    }
    if (tag === "img") child.setAttribute("loading", "lazy");
  }
};

export function sanitizeHtml(html: string): string {
  if (!html || typeof DOMParser === "undefined") return "";
  const doc = new DOMParser().parseFromString(
    `<!doctype html><body>${html}</body>`,
    "text/html",
  );
  clean(doc.body);
  return doc.body.innerHTML;
}
