export type VinDecoded = {
  vin: string;
  year?: string;
  make?: string;
  model?: string;
  trim?: string;
  bodyClass?: string;
  driveType?: string;
  transmission?: string;
  engineCyl?: string;
  displacementL?: string;
  manufacturer?: string;
};

const translit: Record<string, number> = {
  A:1,B:2,C:3,D:4,E:5,F:6,G:7,H:8,
  J:1,K:2,L:3,M:4,N:5,P:7,R:9,
  S:2,T:3,U:4,V:5,W:6,X:7,Y:8,Z:9,
  '0':0,'1':1,'2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9
};
const weights = [8,7,6,5,4,3,2,10,0,9,8,7,6,5,4,3,2];

export function normalizeVIN(raw: string) {
  return (raw || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .replace(/[IOQ]/g, ""); // VIN does not use I,O,Q
}

export function isLikelyVIN(raw: string) {
  return normalizeVIN(raw).length === 17;
}

export function checkDigitOK(vinRaw: string) {
  const vin = normalizeVIN(vinRaw);
  if (vin.length !== 17) return false;
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const c = vin[i];
    const val = translit[c];
    if (val === undefined) return false;
    sum += val * weights[i];
  }
  const mod = sum % 11;
  const expected = mod === 10 ? "X" : String(mod);
  return vin[8] === expected;
}

export async function decodeVIN(vinRaw: string): Promise<VinDecoded> {
  const vin = normalizeVIN(vinRaw);
  // NHTSA vPIC decode
  const url = `https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvaluesextended/${vin}?format=json`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return { vin };
  const data = await res.json().catch(() => null);
  const row = data?.Results?.[0] || {};
  return {
    vin,
    year: row.ModelYear || undefined,
    make: row.Make || undefined,
    model: row.Model || undefined,
    trim: row.Trim || undefined,
    bodyClass: row.BodyClass || undefined,
    driveType: row.DriveType || undefined,
    transmission: row.TransmissionStyle || undefined,
    engineCyl: row.EngineCylinders || undefined,
    displacementL: row.DisplacementL || undefined,
    manufacturer: row.Manufacturer || row.ManufacturerName || undefined,
  };
}
