export type EvoltScanResult = {
  meta: {
    name?: string;
    date?: string;
    age?: string;
    gender?: string;
    height?: string;
    weight?: string;
  };
  bodyComposition: { label: string; value: string; status?: string }[];
  segmental: { label: string; value: string; status?: string }[];
  nutrition: {
    calories?: string;
    protein?: string;
    carbs?: string;
    fat?: string;
  };
};

function parseStatus(val: string): string | undefined {
  if (val.includes("Optimal")) return "optimal";
  if (val.includes("Under")) return "under";
  if (val.includes("Over")) return "over";
  return undefined;
}

function isJunkLine(line: string): boolean {
  if (line.startsWith("[")) return true;                        // range like [8.6-10.6]
  if (/^\d+\.\s+[A-Z]/.test(line)) return true;               // next section header "8. VISCERAL..."
  if (/^[A-Z][A-Z\s/()]{6,}$/.test(line)) return true;        // ALL CAPS label lines
  if (/^www\.|evolt|EVOLT|DOWNLOAD|EVOLTI/i.test(line)) return true; // junk/urls
  return false;
}

export function parseEvoltText(raw: string): EvoltScanResult {
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const lineAfter = (pattern: RegExp, offset = 1): string | undefined => {
    const idx = lines.findIndex((l) => pattern.test(l));
    return idx !== -1 ? lines[idx + offset] : undefined;
  };

  const meta = {
    name: lineAfter(/^NAME$/i),
    date: lineAfter(/^DATE$/i),
    height: lineAfter(/^HEIGHT$/i),
    weight: (() => {
      const idx = lines.findIndex((l) => /^WEIGHT$/i.test(l));
      if (idx === -1) return undefined;
      for (let i = 1; i <= 4; i++) {
        if (/[\d.]+\s*kg/i.test(lines[idx + i])) return lines[idx + i];
      }
    })(),
    age: (() => {
      const idx = lines.findIndex((l) => /^AGE$/i.test(l));
      if (idx === -1) return undefined;
      for (let i = 1; i <= 4; i++) {
        if (/^\d{2}$/.test(lines[idx + i])) return lines[idx + i];
      }
    })(),
    gender: lineAfter(/^GENDER$/i),
  };

  const bodyComposition = [
    { label: "Lean Body Mass",       pattern: /^1\.\s*LEAN BODY MASS/i },
    { label: "Skeletal Muscle Mass", pattern: /^2\.\s*SKELETAL MUSCLE MASS/i },
    { label: "Protein",              pattern: /^3\.\s*PROTEIN KG/i },
    { label: "Mineral",              pattern: /^4\.\s*MINERAL KG/i },
    { label: "Total Body Water",     pattern: /^5\.\s*TOTAL BODY WATER/i },
    { label: "Body Fat Mass",        pattern: /^6\.\s*BODY FAT MASS/i },
    { label: "Subcutaneous Fat",     pattern: /^7\.\s*SUBCUTANEOUS FAT/i },
    { label: "Visceral Fat Mass",    pattern: /^8\.\s*VISCERAL FAT MASS/i },
    { label: "Visceral Fat Area",    pattern: /^9\.\s*VISCERAL FAT AREA/i },
    { label: "Total Body Fat %",     pattern: /^10\.\s*TOTAL BODY FAT/i },
    { label: "Visceral Fat Level",   pattern: /^11\.\s*VISCERAL FAT LEVEL/i },
    { label: "BMR",                  pattern: /^14\.\s*BMR/i },
    { label: "TEE",                  pattern: /^15\.\s*TEE/i },
    { label: "Bio Age",              pattern: /^16\.\s*BIO AGE/i },
  ]
    .map(({ label, pattern }) => {
      const idx = lines.findIndex((l) => pattern.test(l));
      if (idx === -1) return null;
      for (let i = 1; i <= 5; i++) {
        const candidate = lines[idx + i];
        if (!candidate) continue;
        if (isJunkLine(candidate)) continue;
        if (/[\d]/.test(candidate)) {
          return { label, value: candidate, status: parseStatus(candidate) };
        }
      }
      return null;
    })
    .filter(Boolean) as { label: string; value: string; status?: string }[];

  const segmental = [
    { label: "Left Arm Fat",       pattern: /^LEFT ARM$/i },
    { label: "Right Arm Fat",      pattern: /^RIGHT ARM$/i },
    { label: "Left Leg Fat",       pattern: /^LEFT LEG$/i },
    { label: "Right Leg Fat",      pattern: /^RIGHT LEG$/i },
    { label: "Torso Fat",          pattern: /^TORSO$/i },
    { label: "Abdominal Circ.",    pattern: /^19\.\s*ABDOMINAL/i },
    { label: "Waist to Hip Ratio", pattern: /^20\.\s*WAIST TO HIP/i },
  ]
    .map(({ label, pattern }) => {
      const idx = lines.findIndex((l) => pattern.test(l));
      if (idx === -1) return null;
      for (let i = 1; i <= 5; i++) {
        const candidate = lines[idx + i];
        if (!candidate) continue;
        if (isJunkLine(candidate)) continue;
        if (/[\d.]/.test(candidate)) {
          return { label, value: candidate, status: parseStatus(candidate) };
        }
      }
      return null;
    })
    .filter(Boolean) as { label: string; value: string; status?: string }[];

  const nutrition = {
    calories: (() => {
      const idx = lines.findIndex(
        (l) => /^21\.\s*CALORIES/i.test(l) || /^KCAL\s+\d/.test(l),
      );
      if (idx === -1) return undefined;
      const sameLine = lines[idx].match(/KCAL\s+([\d]+\s+[\d]+)/i);
      if (sameLine) return sameLine[1].replace(" ", "–");
      const next = lines[idx + 1];
      return (
        next?.match(/^KCAL\s+([\d]+\s+[\d]+)/i)?.[1].replace(" ", "–") ?? next
      );
    })(),
    protein: (() => {
      const idx = lines.findIndex((l) => /^22\.\s*PROTEIN/i.test(l));
      return idx !== -1 ? lines[idx + 1] : undefined;
    })(),
    carbs: (() => {
      const idx = lines.findIndex((l) => /^23\.\s*CARBOHYDRATES/i.test(l));
      return idx !== -1 ? lines[idx + 1] : undefined;
    })(),
    fat: (() => {
      const idx = lines.findIndex((l) => /^24\.\s*FAT$/i.test(l));
      if (idx === -1) return undefined;
      for (let i = 1; i <= 3; i++) {
        const c = lines[idx + i];
        if (c && /\d+g/.test(c)) return c;
      }
    })(),
  };

  return { meta, bodyComposition, segmental, nutrition };
}

export function mergeEvoltResults(results: EvoltScanResult[]): EvoltScanResult {
  return {
    meta: {
      name: results.map((r) => r.meta.name).find(Boolean),
      date: results.map((r) => r.meta.date).find(Boolean),
      age: results.map((r) => r.meta.age).find(Boolean),
      gender: results.map((r) => r.meta.gender).find(Boolean),
      height: results.map((r) => r.meta.height).find(Boolean),
      weight: results.map((r) => r.meta.weight).find(Boolean),
    },
    bodyComposition: results
      .flatMap((r) => r.bodyComposition)
      .filter(
        (item, index, self) =>
          index === self.findIndex((x) => x.label === item.label),
      ),
    segmental: results
      .flatMap((r) => r.segmental)
      .filter(
        (item, index, self) =>
          index === self.findIndex((x) => x.label === item.label),
      ),
    nutrition: {
      calories: results.map((r) => r.nutrition.calories).find(Boolean),
      protein: results.map((r) => r.nutrition.protein).find(Boolean),
      carbs: results.map((r) => r.nutrition.carbs).find(Boolean),
      fat: results.map((r) => r.nutrition.fat).find(Boolean),
    },
  };
}