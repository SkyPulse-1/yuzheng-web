import { createHash, createHmac } from "node:crypto";

type SignInput = {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  service: string;
  host: string;
  path: string;
  body: string;
  now?: Date;
};

function sha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function hmac(key: string | Buffer, value: string) {
  return createHmac("sha256", key).update(value, "utf8").digest();
}

export function signVolcRequest(input: SignInput) {
  const contentType = "application/json";
  const now = input.now ?? new Date();
  const xDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const shortDate = xDate.slice(0, 8);
  const payloadHash = sha256(input.body);
  const signedHeaders = "content-type;host;x-content-sha256;x-date";
  const canonicalHeaders = [
    `content-type:${contentType}`,
    `host:${input.host}`,
    `x-content-sha256:${payloadHash}`,
    `x-date:${xDate}`,
    "",
  ].join("\n");
  const canonicalRequest = ["POST", input.path, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const credentialScope = `${shortDate}/${input.region}/${input.service}/request`;
  const stringToSign = ["HMAC-SHA256", xDate, credentialScope, sha256(canonicalRequest)].join("\n");
  const dateKey = hmac(input.secretAccessKey, shortDate);
  const regionKey = hmac(dateKey, input.region);
  const serviceKey = hmac(regionKey, input.service);
  const signingKey = hmac(serviceKey, "request");
  const signature = createHmac("sha256", signingKey).update(stringToSign, "utf8").digest("hex");

  return {
    "Content-Type": contentType,
    Host: input.host,
    "X-Content-Sha256": payloadHash,
    "X-Date": xDate,
    Authorization: `HMAC-SHA256 Credential=${input.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
}
