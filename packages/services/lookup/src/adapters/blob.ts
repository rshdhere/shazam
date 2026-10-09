import { put } from "@vercel/blob";
import type { StoreClip } from "./http-extractor";

export const storeClipInBlob: StoreClip = async (lookupId, index, audio) => {
  const blob = await put(`clips/${lookupId}/${index}.mp3`, Buffer.from(audio), {
    access: "public",
    addRandomSuffix: true,
    contentType: "audio/mpeg",
  });
  return blob.url;
};
