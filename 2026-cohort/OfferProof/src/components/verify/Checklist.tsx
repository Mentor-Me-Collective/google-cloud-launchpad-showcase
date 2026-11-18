import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { CHECKLIST } from "@/lib/content";

export function Checklist() {
  const all = CHECKLIST.flatMap((g) => g.items);
  const [done, setDone] = useState<Set<string>>(new Set());
  const toggle = (i: string) =>
    setDone((d) => {
      const n = new Set(d);
      if (n.has(i)) {
        n.delete(i);
      } else {
        n.add(i);
      }
      return n;
    });
  return (
    <div className="rounded-xl border bg-card p-6 print:hidden">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h3 className="text-xl font-semibold">Before-you-Accept Checklist</h3>
        <span className="text-sm text-muted-foreground">
          {done.size} of {all.length} verified
        </span>
      </div>
      <Progress value={(done.size / all.length) * 100} className="mt-4" />
      <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {CHECKLIST.map((g) => (
          <div key={g.group}>
            <p className="eyebrow">{g.group}</p>
            <ul className="mt-3 space-y-3">
              {g.items.map((i) => (
                <li key={i}>
                  <label className="flex cursor-pointer items-start gap-3 text-sm">
                    <Checkbox
                      checked={done.has(i)}
                      onCheckedChange={() => toggle(i)}
                      className="mt-0.5"
                    />
                    <span className={done.has(i) ? "text-muted-foreground line-through" : ""}>
                      {i}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
