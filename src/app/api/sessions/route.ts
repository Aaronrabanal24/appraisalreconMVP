export const runtime = "edge";
import { NextResponse } from "next/server";
import { decodeVIN, normalizeVIN } from "@/lib/vin";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const vin = normalizeVIN(body?.vin || "");
  const mileage = Number(body?.mileage || 0);
  const dealType = String(body?.dealType || "");
  const stock = body?.stock ? String(body.stock) : null;

  // Decode on server for canonical snapshot
  const decoded = vin ? await decodeVIN(vin).catch(() => ({ vin })) : { vin: "" };

  // TODO: insert session row in your DB (D1/Workers/Prisma/etc.)
  const sessionId = crypto.randomUUID();

  // For your AdvancedCapture uploader: you can PUT to /api/upload?sessionId=...&step=...
  const uploadBase = `/api/upload?sessionId=${encodeURIComponent(sessionId)}&step=`;

  return NextResponse.json({
    sessionId,
    vin: decoded,
    stock,
    mileage,
    dealType,
    uploadBase,
    expectedSteps: [
      "LF 3/4","RF 3/4","Left Side","Right Side","Rear","Front",
      "LF Tire","RF Tire","LR Tire","RR Tire",
      "Windshield/Dash","Engine Bay","Undertray/Leaks","VIN Plate","Spare/Trunk"
    ],
  });
}
