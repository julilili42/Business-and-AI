export function DashboardHero() {
  return (
    <header className="mb-8">
      <h1 className="font-display text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
        Quoting-Übersicht<span className="text-brand">.</span>
      </h1>
      <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
        Alle Anfragen, die durch die KI-Pipeline gelaufen sind — inklusive
        Status, Match-Qualität und Bearbeitungsverlauf.
      </p>
    </header>
  );
}
