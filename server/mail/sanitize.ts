import sanitizeHtml from "sanitize-html";

export function sanitizeInboundHtml(input?: string | null): string | null {
  if (!input) return null;
  return sanitizeHtml(input, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img", "table", "thead", "tbody", "tr", "td", "th"]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      a: ["href", "name", "target", "rel"],
      img: ["src", "alt", "title", "width", "height"],
      td: ["colspan", "rowspan"],
      th: ["colspan", "rowspan"],
      "*": ["style"],
    },
    allowedSchemes: ["http", "https", "mailto", "cid"],
    disallowedTagsMode: "discard",
  });
}
