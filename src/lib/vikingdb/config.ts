export type VikingConfig = {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  resourceId: string;
  project: string;
  host: string;
  service: string;
};

export function getVikingConfig(): VikingConfig | null {
  const accessKeyId = process.env.VOLCENGINE_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.VOLCENGINE_SECRET_ACCESS_KEY?.trim();
  const resourceId = process.env.VOLCENGINE_KB_ID?.trim();
  if (!accessKeyId || !secretAccessKey || !resourceId) return null;

  return {
    accessKeyId,
    secretAccessKey,
    resourceId,
    region: process.env.VOLCENGINE_REGION?.trim() || "cn-beijing",
    project: process.env.VOLCENGINE_KB_PROJECT?.trim() || "default",
    host: process.env.VOLCENGINE_KB_HOST?.trim() || "api-knowledgebase.mlp.cn-beijing.volces.com",
    service: process.env.VOLCENGINE_KB_SERVICE?.trim() || "air",
  };
}

export function isVikingConfigured() {
  return getVikingConfig() !== null;
}
