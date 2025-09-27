export type AppraisalInput = {
  acv: number;      // market value before recon
  recon: number;    // total recon estimate
};

export type AppraisalOutput = {
  maxOffer: number;
};

export function calcAppraisal({ acv, recon }: AppraisalInput): AppraisalOutput {
  const safe = (v: number) => (Number.isFinite(v) && v >= 0 ? v : 0);
  const A = safe(acv);
  const R = safe(recon);
  return { maxOffer: Math.max(0, A - R) };
}
