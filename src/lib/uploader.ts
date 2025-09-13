export async function uploadShot(sessionId: string, step: string, blob: Blob) {
  try {
    const res = await fetch(
      `/api/upload?sessionId=${encodeURIComponent(sessionId)}&step=${encodeURIComponent(step)}`,
      { method: "PUT", body: blob }
    );
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  } catch (e) {
    const { set } = await import("idb-keyval");
    await set(`queue:${crypto.randomUUID()}`, { sessionId, step, blob });
    throw e;
  }
}
