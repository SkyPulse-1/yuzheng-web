import { createHash, createHmac, randomUUID } from "node:crypto";

const UP_REGION = "cn-north-1";
const UP_SERVICE = "up";
const UP_VERSION = "2022-01-01";
const UP_ACTION = "UploadRaw";
const UP_PATH = "/up";

export type UpConfig = {
  origin: string;
  host: string;
  accessKeyId: string;
  secretAccessKey: string;
};

function normalizeEndpoint(raw: string) {
  const trimmed = raw.trim();
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
  const url = new URL(withScheme);
  return { origin: url.origin, host: url.host };
}

export function getUpConfig(): UpConfig | null {
  const endpoint = process.env.HIAGENT_UP_UPLOAD_ENDPOINT?.trim();
  const accessKeyId = process.env.VOLCENGINE_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.VOLCENGINE_SECRET_ACCESS_KEY?.trim();
  if (!endpoint || !accessKeyId || !secretAccessKey) return null;
  const { origin, host } = normalizeEndpoint(endpoint);
  return { origin, host, accessKeyId, secretAccessKey };
}

export function isUpUploadConfigured() {
  return getUpConfig() !== null;
}

function sha256Hex(value: Buffer | string) {
  return createHash("sha256").update(value).digest("hex");
}

function hmac(key: string | Buffer, value: string) {
  return createHmac("sha256", key).update(value, "utf8").digest();
}

function encode(value: string) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

export type BuildUpUploadRequestInput = {
  config: UpConfig;
  id: string;
  content: Buffer;
  contentType: string;
  expire?: string;
  now?: Date;
};

export function buildUpUploadRequest(input: BuildUpUploadRequestInput) {
  const expire = input.expire ?? "24h";
  const fileSha256 = sha256Hex(input.content);
  const params: Record<string, string> = {
    Action: UP_ACTION,
    Version: UP_VERSION,
    Id: input.id,
    Sha256: fileSha256,
    Expire: expire,
    ContentType: input.contentType,
  };
  const canonicalQuery = Object.keys(params)
    .sort()
    .map((key) => `${encode(key)}=${encode(params[key])}`)
    .join("&");

  const now = input.now ?? new Date();
  const xDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const shortDate = xDate.slice(0, 8);
  const signedHeaders = "content-type;host;x-content-sha256;x-date";
  const canonicalHeaders = [
    `content-type:${input.contentType}`,
    `host:${input.config.host}`,
    `x-content-sha256:${fileSha256}`,
    `x-date:${xDate}`,
    "",
  ].join("\n");
  const canonicalRequest = ["POST", UP_PATH, canonicalQuery, canonicalHeaders, signedHeaders, fileSha256].join("\n");
  const credentialScope = `${shortDate}/${UP_REGION}/${UP_SERVICE}/request`;
  const stringToSign = ["HMAC-SHA256", xDate, credentialScope, sha256Hex(canonicalRequest)].join("\n");

  const kDate = hmac(input.config.secretAccessKey, shortDate);
  const kRegion = hmac(kDate, UP_REGION);
  const kService = hmac(kRegion, UP_SERVICE);
  const kSigning = hmac(kService, "request");
  const signature = createHmac("sha256", kSigning).update(stringToSign, "utf8").digest("hex");
  const authorization =
    `HMAC-SHA256 Credential=${input.config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    url: `${input.config.origin}${UP_PATH}?${canonicalQuery}`,
    headers: {
      Accept: "application/json",
      "Content-Type": input.contentType,
      Host: input.config.host,
      "X-Content-Sha256": fileSha256,
      "X-Date": xDate,
      Authorization: authorization,
    },
    body: input.content,
    sha256: fileSha256,
  };
}

export type UpUploadResult = {
  path: string;
  sha256: string;
  size: number;
  shortLink?: string;
  presignKey?: string;
};

export async function uploadFileToUp(input: {
  content: Buffer;
  contentType: string;
  expire?: string;
}): Promise<UpUploadResult> {
  const config = getUpConfig();
  if (!config) throw new Error("HIAGENT_UP_UPLOAD_NOT_CONFIGURED");
  const id = randomUUID().replaceAll("-", "");
  const request = buildUpUploadRequest({
    config,
    id,
    content: input.content,
    contentType: input.contentType,
    expire: input.expire,
  });

  const response = await fetch(request.url, {
    method: "POST",
    headers: request.headers,
    body: new Uint8Array(input.content),
    signal: AbortSignal.timeout(120000),
    cache: "no-store",
  });
  const text = await response.text();
  if (!response.ok) throw new Error("HIAGENT_UP_UPLOAD_FAILED");

  const payload = JSON.parse(text) as {
    Result?: {
      Path?: string;
      Sha256?: string;
      Size?: number;
      ShortLink?: string;
      PresignKey?: string;
    };
  };
  const result = payload.Result;
  if (!result || typeof result.Path !== "string" || typeof result.Sha256 !== "string") {
    throw new Error("HIAGENT_UP_UPLOAD_INVALID_RESPONSE");
  }
  return {
    path: result.Path,
    sha256: result.Sha256,
    size: typeof result.Size === "number" ? result.Size : 0,
    shortLink: result.ShortLink,
    presignKey: result.PresignKey,
  };
}
