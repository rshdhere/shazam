import { del, put } from "@vercel/blob";
import type { ClipStore } from "./http-extractor";

export const blobClipStore: ClipStore = {
  async put(lookupId, index, audio) {
    const blob = await put(
      `clips/${lookupId}/${index}.mp3`,
      Buffer.from(audio),
      {
        access: "public",
        addRandomSuffix: true,
        contentType: "audio/mpeg",
      },
    );
    return blob.url;
  },
  async remove(urls) {
    if (urls.length) await del(urls);
  },
};

/** Without a Blob store (local dev), Clips travel inline as data: URLs. */
export const inlineClipStore: ClipStore = {
  async put(_lookupId, _index, audio) {
    return `data:audio/mpeg;base64,${Buffer.from(audio).toString("base64")}`;
  },
  async remove() {},
};
