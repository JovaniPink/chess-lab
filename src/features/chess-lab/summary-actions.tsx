"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
export type Summary = { title: string; sections: Array<{ heading: string; lines: string[] }> };
export function summaryText(summary: Summary) {
  return [summary.title, ...summary.sections.map((s) => [s.heading, ...s.lines].join("\n"))].join(
    "\n\n",
  );
}
export function SummaryActions({ summary }: { summary: Summary }) {
  const [message, setMessage] = useState("");
  const [fallback, setFallback] = useState(false);
  const [printing, setPrinting] = useState(false);
  useEffect(() => {
    if (!printing) return;
    const restore = () => {
      setPrinting(false);
    };
    window.addEventListener("afterprint", restore);
    document.body.classList.add("printing-summary");
    window.print();
    return () => {
      window.removeEventListener("afterprint", restore);
      document.body.classList.remove("printing-summary");
    };
  }, [printing]);
  async function copy() {
    try {
      await navigator.clipboard.writeText(summaryText(summary));
      setMessage("Summary copied.");
      setFallback(false);
    } catch {
      setFallback(true);
      setMessage("Copy is unavailable. Select the summary below and copy it manually.");
    }
  }
  return (
    <div className="summary-actions">
      <div className="action-row">
        <Button tone="secondary" onClick={copy}>
          Copy summary
        </Button>
        <Button tone="secondary" onClick={() => setPrinting(true)}>
          Print summary
        </Button>
      </div>
      <p role="status">{message}</p>
      {fallback && (
        <label>
          Summary to copy
          <textarea
            readOnly
            rows={10}
            value={summaryText(summary)}
            onFocus={(e) => e.currentTarget.select()}
          />
        </label>
      )}
      {printing && (
        <Button tone="ghost" onClick={() => setPrinting(false)}>
          Return to workspace
        </Button>
      )}
      {printing &&
        createPortal(
          <section className="print-summary" data-print-active="">
            <h1>{summary.title}</h1>
            {summary.sections.map((section, i) => (
              <section key={i}>
                <h2>{section.heading}</h2>
                {section.lines.map((line, j) => (
                  <p key={j}>{line}</p>
                ))}
              </section>
            ))}
          </section>,
          document.body,
        )}
    </div>
  );
}
