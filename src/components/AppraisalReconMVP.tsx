'use client';

import React, { useState } from 'react';
import { Camera, Settings, Car, AlertTriangle, CheckCircle, XCircle, ArrowRight, Edit3, BarChart3, Mail, Clock, Download, DollarSign } from 'lucide-react';
import AdvancedCapture, { CoachSpec } from '@/components/AdvancedCapture';

// === Mock data ===============================================================
const mockFindings = [
  { id: 1, part: 'RF Bumper', damage: 'Crack', severity: 'Medium', decision: 'Replace and paint', cost: { low: 620, high: 920 }, safety: false, confidence: 0.82, category: 'Cosmetic' },
  { id: 2, part: 'LF Tire', damage: 'Sidewall cut', severity: 'High', decision: 'Replace tire', cost: { low: 180, high: 220 }, safety: true, confidence: 0.95, category: 'Safety' },
  { id: 3, part: 'Windshield', damage: 'Chip', severity: 'Low', decision: 'Repair', cost: { low: 45, high: 65 }, safety: false, confidence: 0.78, category: 'Glass' },
  { id: 4, part: 'RR Door', damage: 'Dent', severity: 'Medium', decision: 'PDR', cost: { low: 125, high: 175 }, safety: false, confidence: 0.89, category: 'Cosmetic' },
];

const captureSteps = [
  'Front view', 'LF corner', 'Left side', 'LR corner', 'Rear view',
  'RR corner', 'Right side', 'RF corner', 'Interior front', 'Interior rear',
  'Engine bay', 'Tires LF', 'Tires RF', 'Tires LR', 'Ground shot'
];

// === Coaching spec mapper ====================================================
export const coachSpecFor = (stepName: string) => {
  const s = stepName.toLowerCase();
  if (/(lf|rf|lr|rr).*corner|3\/4|corner/.test(s)) return { overlay: 'trapezoid', tip: 'Keep bumper and rocker aligned in frame' } as const;
  if (/left side|right side|side/.test(s)) return { overlay: 'trapezoid', tip: 'Keep rocker on dashed line for level side shot' } as const;
  if (/tires|tire/.test(s)) return { overlay: 'circle', tip: 'Center wheel in ring • Show tread', coinMode: true } as const;
  if (/windshield|dash|interior/.test(s)) return { overlay: 'rectangle', tip: 'Key on, engine off • Capture dash lights' } as const;
  if (/ground|under|leak/.test(s)) return { overlay: 'oval', tip: 'Kneel for undertray view • Scan for leaks' } as const;
  if (/engine/.test(s)) return { overlay: 'rectangle', tip: 'Fill frame with bay • Avoid glare' } as const;
  return { overlay: 'none', tip: 'Frame the vehicle and hold steady' } as const;
};

// === Component ===============================================================
export default function AppraisalReconMVP() {
  const [currentView, setCurrentView] = useState<'start'|'capture'|'safety'|'findings'|'decision'|'export'>('start');
  const [currentStep, setCurrentStep] = useState(0);
  const [capturedPhotos, setCapturedPhotos] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [sessionData, setSessionData] = useState({
    stockNumber: '',
    odometer: '',
    vin: '',
    appraiser: 'John Smith',
    source: 'Trade'
  });
  const [findings, setFindings] = useState<any[]>([]);
  const [safetyStatus, setSafetyStatus] = useState<'pass'|'park'|null>(null);
  const [acvData, setACVData] = useState({
    acv: 8200,
    retailPrice: 13400,
    auctionPrice: 8200,
    retailOther: 800,
    auctionFees: 450,
    targetGross: 1500
  });
  const [approvalStatus, setApprovalStatus] = useState<'pending'|'approved'|'needs_review'>('pending');

  const totalRepairs = findings.reduce((sum, f) => sum + ((f.cost.low + f.cost.high) / 2), 0);
  const retailCost = acvData.acv + totalRepairs + acvData.retailOther;
  const auctionCost = acvData.acv + totalRepairs + acvData.auctionFees;
  const retailPL = acvData.retailPrice - retailCost;
  const auctionPL = acvData.auctionPrice - auctionCost;
  const delta = retailPL - auctionPL;
  const timeToLine = startTime ? ((Date.now() - startTime) / 1000 / 60).toFixed(1) : 0;

  const fmt = (n?: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);

  const handleStartSession = () => {
    if (!sessionData.stockNumber || !sessionData.odometer) return;
    setCurrentView('capture');
    setCurrentStep(0);
    setStartTime(Date.now());
    setCapturedPhotos([]);
  };

  const handleApprove = () => {
    const fastPassLimit = 350;
    const totalLimit = 1500;
    const hasSafety = findings.some(f => f.safety);
    const hasHighCost = findings.some(f => (f.cost.low + f.cost.high) / 2 > fastPassLimit);

    if (hasSafety || hasHighCost || totalRepairs > totalLimit) setApprovalStatus('needs_review');
    else setApprovalStatus('approved');
    setCurrentView('export');
  };

  const handleExport = () => {
    alert(`Exported PDF and CSV for Stock #${sessionData.stockNumber}\nTime to line: ${timeToLine} minutes\nTotal repairs: ${fmt(totalRepairs)}`);
  };

  // === Views =================================================================

  if (currentView === 'start') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-blue-600 text-white p-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">Appraisal Recon</h1>
          <Settings className="w-6 h-6" />
        </div>

        <div className="p-4 space-y-6 max-w-md mx-auto">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <Car className="w-5 h-5 mr-2" />
              Start New Session
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stock Number *</label>
                <input
                  type="text"
                  value={sessionData.stockNumber}
                  onChange={(e) => setSessionData({...sessionData, stockNumber: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg text-lg"
                  placeholder="Enter stock number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Odometer *</label>
                <input
                  type="number"
                  value={sessionData.odometer}
                  onChange={(e) => setSessionData({...sessionData, odometer: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg text-lg"
                  placeholder="Miles"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">VIN (optional)</label>
                <input
                  type="text"
                  value={sessionData.vin}
                  onChange={(e) => setSessionData({...sessionData, vin: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg"
                  placeholder="Scan or enter VIN"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                <select
                  value={sessionData.source}
                  onChange={(e) => setSessionData({...sessionData, source: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg"
                >
                  <option>Trade</option>
                  <option>Auction</option>
                  <option>Lease Return</option>
                </select>
              </div>
            </div>
          </div>

          <button
            onClick={handleStartSession}
            disabled={!sessionData.stockNumber || !sessionData.odometer}
            className="w-full bg-blue-600 text-white p-4 rounded-lg text-lg font-semibold disabled:bg-gray-300 flex items-center justify-center space-x-2"
          >
            <Camera className="w-6 h-6" />
            <span>Start 15-Shot Capture</span>
          </button>
        </div>
      </div>
    );
  }

  if (currentView === 'capture') {
    const spec = coachSpecFor(captureSteps[currentStep]) as CoachSpec;
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="bg-black/80 p-4 flex items-center justify-between">
          <div className="text-sm">
            Step {currentStep + 1} of {captureSteps.length}
          </div>
          <div className="text-sm">Stock: {sessionData.stockNumber}</div>
        </div>

        <div className="px-4 mb-4">
          <div className="w-full bg-gray-800 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{width: `${((currentStep + 1) / captureSteps.length) * 100}%`}}
            />
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <AdvancedCapture
            stepName={captureSteps[currentStep]}
            spec={spec}
            dwellMs={800}
            onCapture={(_, dataUrl) => {
              const newPhoto = {
                step: currentStep,
                name: captureSteps[currentStep],
                timestamp: Date.now(),
                quality: 'good',
                url: dataUrl
              };
              setCapturedPhotos(prev => [...prev, newPhoto]);

              if (currentStep < captureSteps.length - 1) {
                setCurrentStep(currentStep + 1);
              } else {
                setIsProcessing(true);
                setTimeout(() => {
                  setFindings(mockFindings);
                  setSafetyStatus(mockFindings.some(f => f.safety) ? 'park' : 'pass');
                  setIsProcessing(false);
                  setCurrentView('safety');
                }, 800);
              }
            }}
          />

          <div className="mt-4 text-center text-sm text-gray-400">
            Captured: {capturedPhotos.length} / {captureSteps.length}
          </div>
        </div>
      </div>
    );
  }

  if (currentView === 'safety') {
    const safetyIssues = findings.filter(f => f.safety);
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-blue-600 text-white p-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold">Safety Gate</h1>
          <div className="text-sm">Stock: {sessionData.stockNumber}</div>
        </div>

        <div className="p-4 max-w-md mx-auto">
          <div className={`p-6 rounded-lg mb-6 ${safetyStatus === 'pass' ? 'bg-green-50' : 'bg-red-50'}`}>
            <div className="flex items-center justify-center mb-4">
              {safetyStatus === 'pass' ? (
                <CheckCircle className="w-16 h-16 text-green-600" />
              ) : (
                <XCircle className="w-16 h-16 text-red-600" />
              )}
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">
                {safetyStatus === 'pass' ? 'PASS' : 'PARK'}
              </h2>
              <p className="text-gray-600">
                {safetyStatus === 'pass'
                  ? 'No safety issues detected'
                  : `${safetyIssues.length} safety issue${safetyIssues.length > 1 ? 's' : ''} found`
                }
              </p>
            </div>
          </div>

          {safetyIssues.length > 0 && (
            <div className="bg-white rounded-lg p-4 mb-6 shadow-sm">
              <h3 className="font-semibold text-red-600 mb-3 flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2" />
                Safety Issues
              </h3>
              <div className="space-y-2">
                {safetyIssues.map(issue => (
                  <div key={issue.id} className="flex items-center justify-between p-3 bg-red-50 rounded">
                    <div>
                      <div className="font-medium">{issue.part}</div>
                      <div className="text-sm text-gray-600">{issue.damage} - {issue.decision}</div>
                    </div>
                    <div className="text-red-600 font-medium">
                      {fmt((issue.cost.low + issue.cost.high) / 2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg p-4 shadow-sm mb-6">
            <h3 className="font-semibold mb-3">Summary</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-600">Total Findings</div>
                <div className="font-semibold">{findings.length}</div>
              </div>
              <div>
                <div className="text-gray-600">Safety Issues</div>
                <div className="font-semibold">{safetyIssues.length}</div>
              </div>
              <div>
                <div className="text-gray-600">Estimated Repairs</div>
                <div className="font-semibold">{fmt(totalRepairs)}</div>
              </div>
              <div>
                <div className="text-gray-600">Time Elapsed</div>
                <div className="font-semibold">{timeToLine} min</div>
              </div>
            </div>
          </div>

          <button
            onClick={() => setCurrentView('findings')}
            className="w-full bg-blue-600 text-white p-4 rounded-lg font-semibold flex items-center justify-center space-x-2"
          >
            <span>Review All Findings</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  if (currentView === 'findings') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-blue-600 text-white p-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold">Findings Review</h1>
          <div className="text-sm">Stock: {sessionData.stockNumber}</div>
        </div>

        <div className="p-4 space-y-4 max-w-md mx-auto">
          {findings.map((finding) => (
            <div key={finding.id} className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="font-semibold">{finding.part}</h3>
                    {finding.safety && (
                      <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">Safety</span>
                    )}
                    <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">
                      {finding.category}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    {finding.damage} - {finding.severity} severity
                  </div>
                  <div className="font-medium text-blue-600">{finding.decision}</div>
                </div>
                <Edit3 className="w-4 h-4 text-gray-400" />
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <div className="text-gray-600">Cost Range</div>
                  <div className="font-semibold">
                    {fmt(finding.cost.low)} - {fmt(finding.cost.high)}
                  </div>
                </div>
                <div className="text-sm text-right">
                  <div className="text-gray-600">Confidence</div>
                  <div className={`font-semibold ${finding.confidence >= 0.85 ? 'text-green-600' : finding.confidence >= 0.65 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {Math.round(finding.confidence * 100)}%
                  </div>
                </div>
              </div>
            </div>
          ))}

          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-blue-900">Total Repair Cost</div>
                <div className="text-sm text-blue-700">{findings.length} findings</div>
              </div>
              <div className="text-xl font-bold text-blue-900">
                {fmt(totalRepairs)}
              </div>
            </div>
          </div>

          <button
            onClick={() => setCurrentView('decision')}
            className="w-full bg-blue-600 text-white p-4 rounded-lg font-semibold flex items-center justify-center space-x-2"
          >
            <DollarSign className="w-5 h-5" />
            <span>Calculate P&L</span>
          </button>
        </div>
      </div>
    );
  }

  if (currentView === 'decision') {
    const retailOK = retailPL >= 0;
    const auctionOK = auctionPL >= 0;
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-blue-600 text-white p-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold">Decision Helper</h1>
          <div className="text-sm">Stock: {sessionData.stockNumber}</div>
        </div>

        <div className="p-4 space-y-4 max-w-md mx-auto">
          <div className="grid grid-cols-3 gap-3">
            <div className={`rounded-lg p-3 text-center ${retailOK ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className="text-xs text-gray-600 mb-1">Retail P/L</div>
              <div className={`font-bold ${retailOK ? 'text-green-700' : 'text-red-700'}`}>
                {fmt(retailPL)}
              </div>
            </div>
            <div className={`rounded-lg p-3 text-center ${auctionOK ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className="text-xs text-gray-600 mb-1">Auction P/L</div>
              <div className={`font-bold ${auctionOK ? 'text-green-700' : 'text-red-700'}`}>
                {fmt(auctionPL)}
              </div>
            </div>
            <div className={`rounded-lg p-3 text-center ${delta >= 0 ? 'bg-blue-50' : 'bg-yellow-50'}`}>
              <div className="text-xs text-gray-600 mb-1">Difference</div>
              <div className={`font-bold ${delta >= 0 ? 'text-blue-700' : 'text-yellow-700'}`}>
                {delta >= 0 ? '+' : ''}{fmt(delta)}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h3 className="font-semibold mb-4">Adjust Values</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">ACV (what you pay)</label>
                <input
                  type="number"
                  value={acvData.acv}
                  onChange={(e) => setACVData({...acvData, acv: Number(e.target.value)})}
                  className="w-full p-2 border rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Retail Price</label>
                <input
                  type="number"
                  value={acvData.retailPrice}
                  onChange={(e) => setACVData({...acvData, retailPrice: Number(e.target.value)})}
                  className="w-full p-2 border rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Auction Price</label>
                <input
                  type="number"
                  value={acvData.auctionPrice}
                  onChange={(e) => setACVData({...acvData, auctionPrice: Number(e.target.value)})}
                  className="w-full p-2 border rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Retail Other Costs</label>
                <input
                  type="number"
                  value={acvData.retailOther}
                  onChange={(e) => setACVData({...acvData, retailOther: Number(e.target.value)})}
                  className="w-full p-2 border rounded text-sm"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h3 className="font-semibold mb-3">Cost Breakdown</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>ACV (your cost)</span><span>{fmt(acvData.acv)}</span></div>
              <div className="flex justify-between"><span>Repairs (AI calculated)</span><span className="font-medium text-blue-600">{fmt(totalRepairs)}</span></div>
              <div className="flex justify-between"><span>Retail other costs</span><span>{fmt(acvData.retailOther)}</span></div>
              <div className="border-t pt-2 flex justify-between font-semibold"><span>Total retail cost</span><span>{fmt(retailCost)}</span></div>
            </div>
          </div>

          <div className={`rounded-lg p-4 ${retailPL > auctionPL + 500 ? 'bg-green-50' : auctionPL > retailPL + 200 ? 'bg-yellow-50' : 'bg-blue-50'}`}>
            <div className="font-semibold mb-2">
              {retailPL > auctionPL + 500 ? '✅ Recommend Retail' : auctionPL > retailPL + 200 ? '⚠️ Consider Auction' : '🤔 Marginal Decision'}
            </div>
            <div className="text-sm text-gray-700">
              {retailPL > auctionPL + 500
                ? `Retail shows ${fmt(delta)} advantage over auction`
                : auctionPL > retailPL + 200
                ? `Auction may be safer with ${fmt(Math.abs(delta))} better P/L`
                : 'Close call - consider market timing and lot space'}
            </div>
          </div>

          <button
            onClick={handleApprove}
            className="w-full bg-green-600 text-white p-4 rounded-lg font-semibold flex items-center justify-center space-x-2"
          >
            <CheckCircle className="w-5 h-5" />
            <span>Submit for Approval</span>
          </button>
        </div>
      </div>
    );
  }

  if (currentView === 'export') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-green-600 text-white p-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold">
            {approvalStatus === 'approved' ? 'Approved' : 'Needs Review'}
          </h1>
          <div className="text-sm">Stock: {sessionData.stockNumber}</div>
        </div>

        <div className="p-4 space-y-6 max-w-md mx-auto">
          <div className={`rounded-lg p-4 ${approvalStatus === 'approved' ? 'bg-green-50' : 'bg-yellow-50'}`}>
            <div className="flex items-center mb-3">
              {approvalStatus === 'approved' ? (
                <CheckCircle className="w-6 h-6 text-green-600 mr-2" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-yellow-600 mr-2" />
              )}
              <h2 className="font-semibold">
                {approvalStatus === 'approved' ? 'Auto Approved' : 'Manager Review Required'}
              </h2>
            </div>
            <p className="text-sm text-gray-700">
              {approvalStatus === 'approved'
                ? 'Under fast-pass limits. Ready for recon.'
                : 'Safety issues or high costs detected. Manager approval needed.'}
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h3 className="font-semibold mb-4 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              Session Summary
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><div className="text-gray-600">Time to Line</div><div className="font-semibold flex items-center"><Clock className="w-4 h-4 mr-1" />{timeToLine} minutes</div></div>
              <div><div className="text-gray-600">Total Findings</div><div className="font-semibold">{findings.length}</div></div>
              <div><div className="text-gray-600">Safety Issues</div><div className="font-semibold text-red-600">{findings.filter(f => f.safety).length}</div></div>
              <div><div className="text-gray-600">Repair Cost</div><div className="font-semibold">{fmt(totalRepairs)}</div></div>
              <div><div className="text-gray-600">Retail P/L</div><div className={`${(acvData.retailPrice - (acvData.acv + totalRepairs + acvData.retailOther)) >= 0 ? 'text-green-600' : 'text-red-600'} font-semibold`}>{fmt(acvData.retailPrice - (acvData.acv + totalRepairs + acvData.retailOther))}</div></div>
              <div><div className="text-gray-600">Auction P/L</div><div className={`${(acvData.auctionPrice - (acvData.acv + totalRepairs + acvData.auctionFees)) >= 0 ? 'text-green-600' : 'text-red-600'} font-semibold`}>{fmt(acvData.auctionPrice - (acvData.acv + totalRepairs + acvData.auctionFees))}</div></div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h3 className="font-semibold mb-4">Export & Share</h3>
            <div className="space-y-3">
              <button onClick={handleExport} className="w-full bg-blue-600 text-white p-3 rounded-lg font-medium flex items-center justify-center space-x-2">
                <Download className="w-5 h-5" /><span>Download PDF Report</span>
              </button>
              <button onClick={handleExport} className="w-full bg-gray-600 text-white p-3 rounded-lg font-medium flex items-center justify-center space-x-2">
                <Download className="w-5 h-5" /><span>Export CSV Data</span>
              </button>
              <button onClick={() => alert(`Sharing link for Stock #${sessionData.stockNumber}`)} className="w-full border border-blue-600 text-blue-600 p-3 rounded-lg font-medium flex items-center justify-center space-x-2">
                <Mail className="w-5 h-5" /><span>Email to Recon Team</span>
              </button>
            </div>
          </div>

          <button
            onClick={() => {
              setCurrentView('start');
              setFindings([]);
              setSafetyStatus(null);
              setCurrentStep(0);
              setSessionData({...sessionData, stockNumber: '', odometer: '', vin: ''});
              setApprovalStatus('pending');
            }}
            className="w-full bg-green-600 text-white p-4 rounded-lg font-semibold"
          >
            Start New Appraisal
          </button>
        </div>
      </div>
    );
  }

  return null;
}
