interface UploadSignature {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
}

/**
 * Uploads a file directly to Cloudinary using a signature obtained from
 * our backend (POST /uploads/cloudinary-signature) — the file bytes never
 * pass through our server. Returns the resulting secure_url.
 */
export async function uploadToCloudinary(file: File, signature: UploadSignature): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', signature.apiKey);
  formData.append('timestamp', String(signature.timestamp));
  formData.append('signature', signature.signature);
  formData.append('folder', signature.folder);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    throw new Error(errBody?.error?.message || 'Image upload failed.');
  }

  const data = await res.json();
  return data.secure_url as string;
}

// Per doc: "image messages scanned for size (≤5MB each)".
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
