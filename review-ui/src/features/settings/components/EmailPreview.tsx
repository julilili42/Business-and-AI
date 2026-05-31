interface EmailPreviewProps {
  from: string;
  to: string;
  subject: string;
  body: string;
}

export function EmailPreview({ from, to, subject, body }: EmailPreviewProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-card text-sm">
      <div className="border-b border-border bg-surface-sunk px-4 py-3">
        <dl className="grid grid-cols-[3.5rem_1fr] gap-x-2 gap-y-1 text-xs">
          <dt className="text-muted-foreground">Von:</dt>
          <dd className="font-medium text-foreground truncate">{from || "—"}</dd>
          <dt className="text-muted-foreground">An:</dt>
          <dd className="text-foreground truncate">{to || "—"}</dd>
          <dt className="text-muted-foreground">Betreff:</dt>
          <dd className="font-medium text-foreground truncate">{subject || "—"}</dd>
        </dl>
      </div>
      <div className="bg-surface px-4 py-4 text-sm leading-relaxed text-foreground/90">
        {body
          ? body.split("\n\n").map((para, i) => (
              <p key={i} className="mb-3 last:mb-0">
                {para.split("\n").map((line, j) => (
                  <span key={j}>
                    {j > 0 && <br />}
                    {line}
                  </span>
                ))}
              </p>
            ))
          : <span className="italic text-muted-foreground">Kein Inhalt</span>}
      </div>
    </div>
  );
}
