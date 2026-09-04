export type AssistantSourceAvailability = {
  source_kind: string;
  status: string;
};

export function isAssistantSourceAvailable(source: AssistantSourceAvailability) {
  return source.source_kind === "TEXT" || source.status === "READY" || source.status === "STORED";
}

export function filterAssistantSources<T extends AssistantSourceAvailability>(sources: T[]) {
  return sources.filter(isAssistantSourceAvailable);
}
