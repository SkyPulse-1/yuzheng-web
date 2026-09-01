export type AssistantSourceAvailability = {
  source_kind: string;
  status: string;
};

export function isAssistantSourceAvailable(source: AssistantSourceAvailability) {
  return source.source_kind === "TEXT" || source.status === "READY";
}

export function filterAssistantSources<T extends AssistantSourceAvailability>(sources: T[]) {
  return sources.filter(isAssistantSourceAvailable);
}
