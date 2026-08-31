import { Upload } from "tus-js-client";

import { getResumableStorageEndpoint } from "@/lib/uploads/paths";

export async function uploadDocumentResumably(input: {
  file: File;
  supabaseUrl: string;
  accessToken: string;
  storagePath: string;
  onProgress: (percent: number) => void;
}) {
  await new Promise<void>((resolve, reject) => {
    const upload = new Upload(input.file, {
      endpoint: getResumableStorageEndpoint(input.supabaseUrl),
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        authorization: `Bearer ${input.accessToken}`,
        "x-upsert": "false",
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      chunkSize: 6 * 1024 * 1024,
      metadata: {
        bucketName: "documents",
        objectName: input.storagePath,
        contentType: input.file.type,
        cacheControl: "3600",
      },
      onError(error) {
        reject(error);
      },
      onProgress(bytesSent, bytesTotal) {
        input.onProgress(bytesTotal ? Math.round((bytesSent / bytesTotal) * 100) : 0);
      },
      onSuccess() {
        input.onProgress(100);
        resolve();
      },
    });

    void upload.findPreviousUploads().then((previousUploads) => {
      if (previousUploads.length) upload.resumeFromPreviousUpload(previousUploads[0]);
      upload.start();
    }).catch(reject);
  });
}
