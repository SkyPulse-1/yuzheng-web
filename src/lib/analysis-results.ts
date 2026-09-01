export const ANALYSIS_SECTION_KEYS = [
  "content_summary",
  "key_points",
  "source_evidence",
  "uncertainties",
] as const;

export type AnalysisSectionKey = (typeof ANALYSIS_SECTION_KEYS)[number];

export type SourceExcerpt = {
  quote: string;
  context_before?: string;
  context_after?: string;
};

export type AnalysisItem = {
  text: string;
  sources: SourceExcerpt[];
  basis?: "综合判断";
};

export type TextAnalysisResult = Record<AnalysisSectionKey, AnalysisItem[]>;

export function createEmptyAnalysisResult(): TextAnalysisResult {
  return {
    content_summary: [],
    key_points: [],
    source_evidence: [],
    uncertainties: [],
  };
}

function unwrapJson(value: string) {
  const trimmed = value.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const candidate = fenced?.[1] ?? trimmed;
  try {
    return JSON.parse(candidate) as unknown;
  } catch {
    const start = candidate.indexOf("{");
    if (start < 0) return null;
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let index = start; index < candidate.length; index += 1) {
      const character = candidate[index];
      if (inString) {
        if (escaped) escaped = false;
        else if (character === "\\") escaped = true;
        else if (character === '"') inString = false;
        continue;
      }
      if (character === '"') inString = true;
      else if (character === "{") depth += 1;
      else if (character === "}") {
        depth -= 1;
        if (depth === 0) {
          try { return JSON.parse(candidate.slice(start, index + 1)) as unknown; }
          catch { return null; }
        }
      }
    }
    return null;
  }
}

function readExcerpt(value: unknown, source: string): SourceExcerpt | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const quote = typeof record.quote === "string" ? record.quote.trim() : "";
  if (!quote || !source.includes(quote)) return null;
  const contextBefore = typeof record.context_before === "string" ? record.context_before.trim() : "";
  const contextAfter = typeof record.context_after === "string" ? record.context_after.trim() : "";
  return {
    quote,
    ...(contextBefore ? { context_before: contextBefore } : {}),
    ...(contextAfter ? { context_after: contextAfter } : {}),
  };
}

function readItems(value: unknown, source: string, allowSynthesis: boolean): AnalysisItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const record = item as Record<string, unknown>;
    const text = typeof record.text === "string" ? record.text.trim() : "";
    if (!text) return [];
    const sources = Array.isArray(record.sources)
      ? record.sources.flatMap((entry) => {
          const excerpt = readExcerpt(entry, source);
          return excerpt ? [excerpt] : [];
        })
      : [];
    if (!sources.length && !allowSynthesis) return [];
    return [{ text, sources, ...(sources.length ? {} : { basis: "综合判断" as const }) }];
  });
}

export function parseTextAnalysisResult(value: unknown, source: string): TextAnalysisResult {
  const parsed = typeof value === "string" ? unwrapJson(value) : value;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return createEmptyAnalysisResult();
  const record = parsed as Record<string, unknown>;
  return {
    content_summary: readItems(record.content_summary, source, false),
    key_points: readItems(record.key_points, source, false),
    source_evidence: readItems(record.source_evidence, source, false),
    uncertainties: readItems(record.uncertainties, source, true),
  };
}

export function hasReliableAnalysis(result: TextAnalysisResult) {
  return ANALYSIS_SECTION_KEYS.some((key) => result[key].length > 0);
}

export function mergeAnalysisResults(results: TextAnalysisResult[]): TextAnalysisResult {
  const merged = createEmptyAnalysisResult();
  for (const key of ANALYSIS_SECTION_KEYS) {
    const seen = new Set<string>();
    for (const result of results) {
      for (const item of result[key]) {
        const identity = `${item.text}\u0000${item.sources.map((source) => source.quote).join("\u0001")}`;
        if (seen.has(identity)) continue;
        seen.add(identity);
        merged[key].push(item);
      }
    }
  }
  return merged;
}
