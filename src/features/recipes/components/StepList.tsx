// src/features/recipes/components/StepList.tsx
import type { RecipeDto, StepDto, StepPhase } from "../shared/recipes";
import { formatMinutes } from "../lib/format";

const PHASES: { phase: StepPhase; label: string }[] = [
  { phase: "prep", label: "Prep" },
  { phase: "cook", label: "Cooking" },
];

export function StepList({ recipe }: { recipe: RecipeDto }) {
  const totalFor = (steps: StepDto[]): number | null => {
    // Each section's time is just its steps' minutes added up.
    const sum = steps.reduce((n, s) => n + (s.minutes ?? 0), 0);
    return sum || null;
  };

  const sections = PHASES.map(({ phase, label }) => {
    const steps = recipe.steps.filter((s) => s.phase === phase);
    return { phase, label, steps, total: totalFor(steps) };
  }).filter((s) => s.steps.length > 0);

  if (sections.length === 0) return <p className="empty">No steps yet.</p>;

  return (
    <div className="rc-steps-wrap">
      {sections.map(({ phase, label, steps, total }) => (
        <section key={phase} className="rc-phase" aria-label={label}>
          <div className="rc-phase-head">
            <h2 className="rc-label">{label}</h2>
            {total !== null && <span className="rc-phase-time">{formatMinutes(total)}</span>}
          </div>
          <ol className="rc-steps">
            {steps.map((s, i) => (
              <li key={i} className="rc-step">
                <p>{s.body}</p>
                {s.minutes ? (
                  <span className="rc-step-time">
                    <span aria-hidden="true">⏱</span> {formatMinutes(s.minutes)}
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
