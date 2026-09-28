import { Fragment } from "react";

// Renders WhatsApp formatting (*bold*, _italic_, ~strike~, links) as React
// nodes, never as raw HTML, so message content can't inject markup.

const TOKEN = /(\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~|https?:\/\/[^\s)]+)/g;

export function WhatsAppText({ text }: { text: string }) {
  const parts = text.split(TOKEN);
  return (
    <>
      {parts.map((part, i) => {
        if (!part) return null;
        if (/^https?:\/\//.test(part)) {
          return (
            <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="break-all underline underline-offset-2">
              {part}
            </a>
          );
        }
        const marker = part[0];
        const wrapped = part.length > 2 && part.endsWith(marker);
        if (wrapped && marker === "*") return <strong key={i} className="font-semibold">{part.slice(1, -1)}</strong>;
        if (wrapped && marker === "_") return <em key={i}>{part.slice(1, -1)}</em>;
        if (wrapped && marker === "~") return <s key={i}>{part.slice(1, -1)}</s>;
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}
