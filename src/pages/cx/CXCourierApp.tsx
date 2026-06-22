import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MAPBOX_CONFIG } from '@/config/mapbox';
import {
  MapPin, Package, DollarSign, User, Bell, Navigation2,
  Clock, ChevronRight, X, Check, Zap, Phone, Camera,
  Shield, Star, Truck, Settings, LogOut, Wallet,
  CircleDot, PenLine, ScanLine, FileText, AlertTriangle,
  ChevronLeft, Trophy, Activity, BadgeCheck
} from 'lucide-react';

/* =============================================================
 * CRAVE'N EXPRESS — Standalone Courier Driver App (Prototype)
 * Light enterprise theme · Orange primary + Teal secondary
 * route: /cx-courier-app
 * ============================================================= */

// ---------- Brand tokens (Miami-style: orange + teal on white) ----------
const CX = {
  // Brand
  orange: '#F26A21',
  orangeDeep: '#C8521A',
  orangeSoft: '#FFF2EA',
  teal: '#0FA89B',          // Dolphins-ish teal/aqua
  tealDeep: '#0B7E74',
  tealSoft: '#E6F7F5',
  // Surfaces (light/enterprise)
  bg: '#F5F7FA',
  surface: '#FFFFFF',
  surfaceAlt: '#FAFBFD',
  line: '#E4E8EE',
  lineStrong: '#CBD3DD',
  // Text
  ink: '#0E1726',
  text: '#1F2A3A',
  sub: '#6B7787',
  subSoft: '#94A0B0',
  // States
  good: '#16A34A',
  warn: '#D97706',
  bad: '#DC2626',
  shadow: '0 1px 2px rgba(15,23,42,0.04), 0 4px 12px rgba(15,23,42,0.06)',
  shadowLg: '0 8px 28px rgba(15,23,42,0.10)',
};

const MONO = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace';
const SANS = '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif';

// ---------- Mock data ----------
type Job = {
  id: string;
  merchant: string;
  category: 'Retail' | 'Auto Parts' | 'Pharmacy' | 'Floral' | 'B2B';
  payout: number;
  miles: number;
  pickup: { label: string; lat: number; lng: number; contact?: string };
  dropoff: { label: string; lat: number; lng: number; apt?: string; contact?: string; phone?: string; notes?: string };
  windowMins: number;
  vehicle: 'Car' | 'SUV' | 'Van';
  badge?: 'BONUS' | 'PRIORITY' | 'STACKED';
  pieces: number;
  weightLbs: number;
  proofRequired: ('photo' | 'signature' | 'recipient')[];
  cluster?: string;
};

const MOCK_JOBS: Job[] = [
  { id: 'CX-8841', merchant: 'AutoZone #4421', category: 'Auto Parts', payout: 18.50, miles: 4.2, windowMins: 45, vehicle: 'Car', cluster: 'c2',
    pickup: { label: '2410 Reynolds Rd, Toledo OH 43615', lat: 41.6428, lng: -83.6555, contact: 'Mgr · Rick' },
    dropoff: { label: '1980 N Holland Sylvania Rd', apt: 'Suite 204', contact: 'D. Harper', phone: '(419) 555-0142', notes: 'Loading dock on east side', lat: 41.6802, lng: -83.6711 },
    badge: 'BONUS', pieces: 2, weightLbs: 14, proofRequired: ['photo', 'recipient'] },
  { id: 'CX-8852', merchant: 'Walgreens Pharmacy', category: 'Pharmacy', payout: 12.25, miles: 2.1, windowMins: 30, vehicle: 'Car', cluster: 'c2',
    pickup: { label: '3402 W Central Ave', lat: 41.6711, lng: -83.6312 },
    dropoff: { label: '4120 N Detroit Ave', apt: 'Apt 3B', contact: 'M. Alvarez', phone: '(419) 555-0193', notes: 'Hand directly to recipient — Rx', lat: 41.6982, lng: -83.6189 },
    pieces: 1, weightLbs: 1, proofRequired: ['signature', 'recipient'] },
  { id: 'CX-8867', merchant: 'Bloom & Co Floral', category: 'Floral', payout: 22.00, miles: 6.8, windowMins: 60, vehicle: 'SUV', cluster: 'c3',
    pickup: { label: '128 N Erie St', lat: 41.6582, lng: -83.5402 },
    dropoff: { label: '5800 Monroe St', apt: 'Front desk', contact: 'Sienna L.', phone: '(419) 555-0118', notes: 'Keep upright', lat: 41.7012, lng: -83.6892 },
    badge: 'PRIORITY', pieces: 1, weightLbs: 4, proofRequired: ['photo'] },
  { id: 'CX-8871', merchant: 'Office Depot #1182', category: 'B2B', payout: 35.75, miles: 11.4, windowMins: 90, vehicle: 'Van', cluster: 'c4',
    pickup: { label: '5333 Monroe St', lat: 41.6912, lng: -83.6651 },
    dropoff: { label: '1611 N Reynolds Rd', apt: 'Bay 4 — Receiving', contact: 'Warehouse', phone: '(419) 555-0177', notes: 'POD required, BOL #884121', lat: 41.6602, lng: -83.6781 },
    badge: 'STACKED', pieces: 6, weightLbs: 88, proofRequired: ['photo', 'signature'] },
  { id: 'CX-8889', merchant: 'Best Buy #284', category: 'Retail', payout: 16.40, miles: 3.6, windowMins: 40, vehicle: 'Car', cluster: 'c2',
    pickup: { label: '5001 Monroe St', lat: 41.6889, lng: -83.6612 },
    dropoff: { label: '2600 W Sylvania Ave', apt: 'Unit 12', contact: 'J. Kim', phone: '(419) 555-0166', lat: 41.7102, lng: -83.6312 },
    pieces: 1, weightLbs: 6, proofRequired: ['photo', 'recipient'] },
];

const CLUSTERS = [
  { id: 'c2', lat: 41.6912, lng: -83.6651, count: 3, label: 'Monroe Corridor' },
  { id: 'c3', lat: 41.6582, lng: -83.5402, count: 1, label: 'Downtown' },
  { id: 'c4', lat: 41.7012, lng: -83.6892, count: 1, label: 'Sylvania' },
];

// ============================================================
// MAIN APP SHELL
// ============================================================
type Tab = 'jobs' | 'active' | 'earnings' | 'account';

export default function CXCourierApp() {
  const [tab, setTab] = useState<Tab>('jobs');
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [online, setOnline] = useState(true);

  const acceptJob = (j: Job) => {
    setActiveJob(j);
    setTab('active');
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: CX.bg, color: CX.text,
      fontFamily: SANS, display: 'flex', flexDirection: 'column', overflow: 'hidden',
      WebkitFontSmoothing: 'antialiased',
    }}>
      <AppHeader online={online} setOnline={setOnline} />
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {tab === 'jobs' && <JobBoardScreen online={online} onAccept={acceptJob} />}
        {tab === 'active' && <ActiveDeliveryFlow job={activeJob} onComplete={() => { setActiveJob(null); setTab('earnings'); }} onBack={() => setTab('jobs')} />}
        {tab === 'earnings' && <EarningsScreen />}
        {tab === 'account' && <AccountScreen />}
      </div>
      <BottomNav tab={tab} setTab={setTab} hasActive={!!activeJob} />
      <style>{`
        @keyframes cxPulse {0%,100%{opacity:1}50%{opacity:.35}}
        @keyframes cxFade {from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        .cx-fade { animation: cxFade .22s ease-out both; }
        .cx-tap:active { transform: scale(.985); }
      `}</style>
    </div>
  );
}

// ============================================================
// HEADER
// ============================================================
function AppHeader({ online, setOnline }: { online: boolean; setOnline: (b: boolean) => void }) {
  return (
    <div style={{
      paddingTop: 'calc(env(safe-area-inset-top, 0px) + 10px)',
      padding: '10px 16px 12px', background: CX.surface,
      borderBottom: `1px solid ${CX.line}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 11,
          background: `linear-gradient(135deg, ${CX.orange}, ${CX.orangeDeep})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(242,106,33,0.30)',
        }}>
          <Truck size={20} color="#fff" strokeWidth={2.4} />
        </div>
        <div style={{ lineHeight: 1.15 }}>
          <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '0.3px', color: CX.ink }}>
            CRAVE'N <span style={{ color: CX.orange }}>EXPRESS</span>
          </div>
          <div style={{ fontSize: 10, color: CX.sub, fontFamily: MONO, letterSpacing: '0.5px' }}>
            COURIER · ID 7741 · ELITE
          </div>
        </div>
      </div>

      <button
        onClick={() => setOnline(!online)}
        className="cx-tap"
        style={{
          background: online ? CX.tealSoft : '#F1F3F7',
          border: `1px solid ${online ? CX.teal : CX.line}`,
          color: online ? CX.tealDeep : CX.sub,
          padding: '7px 12px', borderRadius: 999, fontSize: 11, fontWeight: 800,
          letterSpacing: '0.8px', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
        }}>
        <span style={{
          width: 8, height: 8, borderRadius: 999,
          background: online ? CX.teal : CX.sub,
          boxShadow: online ? `0 0 8px ${CX.teal}` : 'none',
          animation: online ? 'cxPulse 2s infinite' : 'none',
        }} />
        {online ? 'ON DUTY' : 'OFF DUTY'}
      </button>
    </div>
  );
}

// ============================================================
// JOB BOARD SCREEN
// ============================================================
function JobBoardScreen({ online, onAccept }: { online: boolean; onAccept: (j: Job) => void }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<mapboxgl.Map | null>(null);
  const [previewJob, setPreviewJob] = useState<Job | null>(null);
  const [clusterId, setClusterId] = useState<string | null>(null);
  const clusterJobs = useMemo(
    () => {
      if (!clusterId) return [];
      return MOCK_JOBS.filter(j => j.cluster === clusterId);
    },
    [clusterId]
  );
  const activeCluster = CLUSTERS.find(c => c.id === clusterId) || null;

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    mapboxgl.accessToken = MAPBOX_CONFIG.accessToken;
    try {
      const map = new mapboxgl.Map({
        container: mapRef.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [-83.6, 41.67],
        zoom: 10.6,
        attributionControl: false,
      });
      mapInstance.current = map;

      map.on('load', () => {
        CLUSTERS.forEach((c) => {
          const jobCount = MOCK_JOBS.filter(j => j.cluster === c.id).length;
          if (jobCount === 0) return;
          const size = 30 + jobCount * 4;
          const el = document.createElement('div');
          el.style.cssText = `
            width:${size}px;height:${size}px;border-radius:999px;
            background: radial-gradient(circle, ${CX.orange} 0%, ${CX.orangeDeep} 100%);
            box-shadow:0 0 0 6px rgba(242,106,33,0.15), 0 4px 14px rgba(242,106,33,0.35);
            display:flex;align-items:center;justify-content:center;
            color:#fff;font-weight:800;font-size:14px;cursor:pointer;
            border:2px solid #fff;font-family:${MONO};
          `;
          el.textContent = String(jobCount);
          el.addEventListener('click', (ev) => {
            ev.stopPropagation();
            console.log('[CX] cluster clicked', c.id);
            setClusterId(c.id);
          });
          new mapboxgl.Marker(el).setLngLat([c.lng, c.lat]).addTo(map);
        });

        MOCK_JOBS.forEach((j) => {
          const el = document.createElement('div');
          el.style.cssText = `
            width:16px;height:16px;border-radius:999px;
            background:#fff;border:3px solid ${CX.teal};
            box-shadow:0 2px 6px rgba(15,168,155,0.5);cursor:pointer;
          `;
          el.onclick = () => setPreviewJob(j);
          new mapboxgl.Marker(el).setLngLat([j.pickup.lng, j.pickup.lat]).addTo(map);
        });
      });
    } catch (e) { console.error('map init', e); }
    return () => { mapInstance.current?.remove(); mapInstance.current = null; };
  }, []);

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
      {/* KPI strip */}
      <div style={{
        padding: '10px 12px', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8,
        background: CX.surface, borderBottom: `1px solid ${CX.line}`,
      }}>
        <Kpi label="AVAILABLE" value={String(MOCK_JOBS.length)} accent={CX.orange} />
        <Kpi label="AVG PAYOUT" value="$21" accent={CX.teal} />
        <Kpi label="ACCEPT %" value="96" accent={CX.good} />
        <Kpi label="DEMAND" value="HIGH" accent={CX.warn} mono />
      </div>

      {/* Map */}
      <div style={{ position: 'relative', flex: '0 0 42%', minHeight: 200 }}>
        <div ref={mapRef} style={{ position: 'absolute', inset: 0 }} />
        {!online && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(245,247,250,0.92)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8,
          }}>
            <CircleDot size={32} color={CX.sub} />
            <div style={{ fontSize: 13, color: CX.sub, fontWeight: 600 }}>Off duty. Toggle ON DUTY to receive jobs.</div>
          </div>
        )}
        {/* Legend */}
        <div style={{
          position: 'absolute', bottom: 10, left: 10, background: 'rgba(255,255,255,0.95)',
          border: `1px solid ${CX.line}`, borderRadius: 8, padding: '6px 10px',
          fontSize: 10, color: CX.sub, display: 'flex', gap: 12, alignItems: 'center',
          boxShadow: CX.shadow,
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: 999, background: CX.orange }} /> Cluster
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: 999, background: '#fff', border: `2px solid ${CX.teal}` }} /> Job
          </span>
        </div>
      </div>

      {/* Job list area with swipe transition */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: CX.bg }}>
        {/* Nearby jobs panel */}
        <div style={{
          position: 'absolute', inset: 0,
          transform: clusterId ? 'translateX(-100%)' : 'translateX(0)',
          transition: 'transform 0.35s cubic-bezier(0.32,0.72,0,1)',
          overflowY: 'auto',
        }}>
          <div style={{ padding: '14px 16px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.6px', color: CX.ink }}>NEARBY JOBS</div>
            <div style={{ fontSize: 10, color: CX.sub, fontFamily: MONO, letterSpacing: '0.5px' }}>SORT · PAYOUT</div>
          </div>
          {MOCK_JOBS.map((j) => (
            <JobCard key={j.id} job={j} onClick={() => setPreviewJob(j)} />
          ))}
          <div style={{ height: 24 }} />
        </div>

        {/* Cluster carousel panel */}
        {activeCluster && clusterJobs.length > 0 && (
          <div style={{
            position: 'absolute', inset: 0,
            transform: clusterId ? 'translateX(0)' : 'translateX(100%)',
            transition: 'transform 0.35s cubic-bezier(0.32,0.72,0,1)',
            display: 'flex', flexDirection: 'column',
            zIndex: clusterId ? 30 : 0,
          }}>
            <ClusterCarousel
              cluster={activeCluster}
              jobs={clusterJobs}
              onClose={() => setClusterId(null)}
              onSelect={(j) => setPreviewJob(j)}
            />
          </div>
        )}
      </div>

      {previewJob && (
        <JobPreviewSheet job={previewJob} onClose={() => setPreviewJob(null)} onAccept={() => { onAccept(previewJob); setPreviewJob(null); }} />
      )}
    </div>
  );
}

// ============================================================
// CLUSTER CAROUSEL — Roadie-style swipeable cards at bottom
// ============================================================
function ClusterCarousel({
  cluster, jobs, onClose, onSelect,
}: {
  cluster: { id: string; label: string; count: number };
  jobs: Job[];
  onClose: () => void;
  onSelect: (j: Job) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);

  const onScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.clientWidth - 24;
    setIdx(Math.round(el.scrollLeft / card));
  };

  return (
    <div className="cx-fade" style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 8px)',
      overflow: 'hidden',
    }}>
      {/* Header pill */}
      <div style={{
        margin: '0 12px 8px', background: CX.ink, color: '#fff',
        borderTopLeftRadius: 12, borderTopRightRadius: 12,
        padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        boxShadow: CX.shadowLg,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 22, height: 22, borderRadius: 999, background: CX.orange,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 900, fontFamily: MONO,
          }}>{jobs.length}</div>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.6px' }}>
            AVAILABLE GIGS · {cluster.label.toUpperCase()}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontFamily: MONO }}>
            {idx + 1} OF {jobs.length}
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff',
            width: 26, height: 26, borderRadius: 999, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Horizontal carousel */}
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        style={{
          display: 'flex', overflowX: 'auto', overflowY: 'hidden',
          scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch',
          gap: 12, padding: '0 12px 4px', scrollbarWidth: 'none',
        }}
      >
        {jobs.map((j) => (
          <button
            key={j.id}
            onClick={() => onSelect(j)}
            className="cx-tap"
            style={{
              flex: '0 0 calc(100% - 24px)', scrollSnapAlign: 'center',
              background: CX.surface, border: `1px solid ${CX.line}`, borderRadius: 14,
              borderTop: `3px solid ${CX.orange}`,
              padding: '14px', textAlign: 'left', cursor: 'pointer',
              boxShadow: CX.shadowLg, color: CX.text,
              display: 'flex', flexDirection: 'column', gap: 8,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 10, fontFamily: MONO, color: CX.sub, letterSpacing: '0.5px' }}>
                  {j.id} · {j.category.toUpperCase()}
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: CX.ink, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {j.merchant}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: CX.orange, fontFamily: MONO, lineHeight: 1 }}>
                  ${j.payout.toFixed(2)}
                </div>
                <div style={{ fontSize: 10, color: CX.sub, marginTop: 3, fontFamily: MONO }}>
                  {j.miles} MI · {j.windowMins}M
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8, background: CX.tealSoft,
                border: `1px solid ${CX.teal}55`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Truck size={16} color={CX.tealDeep} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: CX.sub, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {j.pickup.label}
                </div>
                <div style={{ fontSize: 10, color: CX.subSoft, marginTop: 1 }}>
                  {j.vehicle} · {j.pieces} pc · {j.weightLbs} lb
                </div>
              </div>
              <ChevronRight size={16} color={CX.subSoft} />
            </div>
          </button>
        ))}
      </div>

      {/* Dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 5, padding: '6px 0 2px' }}>
        {jobs.map((_, i) => (
          <span key={i} style={{
            width: i === idx ? 18 : 6, height: 6, borderRadius: 999,
            background: i === idx ? CX.orange : CX.lineStrong,
            transition: 'all .2s',
          }} />
        ))}
      </div>
    </div>
  );
}

function Kpi({ label, value, accent, mono }: { label: string; value: string; accent: string; mono?: boolean }) {
  return (
    <div style={{
      background: CX.surfaceAlt, border: `1px solid ${CX.line}`, borderRadius: 10, padding: '8px 10px',
    }}>
      <div style={{ fontSize: 9, color: CX.sub, letterSpacing: '0.8px', fontWeight: 800 }}>{label}</div>
      <div style={{
        fontSize: 18, fontWeight: 800, color: accent, marginTop: 2,
        fontFamily: mono ? MONO : 'inherit', letterSpacing: mono ? '0.5px' : 0,
      }}>{value}</div>
    </div>
  );
}

function JobCard({ job, onClick }: { job: Job; onClick: () => void }) {
  const badgeColor = job.badge === 'BONUS' ? CX.orange : job.badge === 'PRIORITY' ? CX.warn : CX.teal;
  return (
    <button onClick={onClick} className="cx-tap" style={{
      width: 'calc(100% - 24px)', margin: '0 12px 8px', textAlign: 'left',
      background: CX.surface, border: `1px solid ${CX.line}`, borderRadius: 12,
      padding: 0, display: 'block', cursor: 'pointer', color: CX.text,
      boxShadow: CX.shadow, overflow: 'hidden',
    }}>
      <div style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: MONO, fontSize: 10, color: CX.sub, letterSpacing: '0.4px' }}>{job.id}</span>
            {job.badge && (
              <span style={{
                fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4,
                background: `${badgeColor}1A`, color: badgeColor, letterSpacing: '0.7px',
              }}>{job.badge}</span>
            )}
          </div>
          <div style={{ fontSize: 14.5, fontWeight: 800, marginTop: 3, color: CX.ink }}>{job.merchant}</div>
          <div style={{ fontSize: 11, color: CX.sub, marginTop: 1 }}>{job.category} · {job.vehicle} · {job.pieces} pc · {job.weightLbs} lb</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: CX.orange, fontFamily: MONO, lineHeight: 1 }}>
            ${job.payout.toFixed(2)}
          </div>
          <div style={{ fontSize: 10, color: CX.sub, marginTop: 4 }}>{job.miles} mi</div>
        </div>
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
        borderTop: `1px solid ${CX.line}`, background: CX.surfaceAlt,
      }}>
        <Clock size={12} color={CX.sub} />
        <span style={{ fontSize: 11, color: CX.sub, fontWeight: 600 }}>Deliver within {job.windowMins} min</span>
        <ChevronRight size={14} color={CX.subSoft} style={{ marginLeft: 'auto' }} />
      </div>
    </button>
  );
}

// ============================================================
// JOB PREVIEW SHEET
// ============================================================
function JobPreviewSheet({ job, onClose, onAccept }: { job: Job; onClose: () => void; onAccept: () => void }) {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(14,23,38,0.45)' }} />
      <div className="cx-fade" style={{
        position: 'relative', width: '100%', background: CX.surface,
        borderTopLeftRadius: 20, borderTopRightRadius: 20,
        borderTop: `3px solid ${CX.orange}`, padding: '16px 16px calc(env(safe-area-inset-bottom,0px) + 16px)',
        maxHeight: '92%', overflowY: 'auto', boxShadow: CX.shadowLg,
      }}>
        <div style={{ width: 40, height: 4, background: CX.line, borderRadius: 2, margin: '0 auto 12px' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 10, fontFamily: MONO, color: CX.sub, letterSpacing: '0.6px' }}>
              {job.id} · {job.category.toUpperCase()}
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, marginTop: 2, color: CX.ink }}>{job.merchant}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: CX.sub, cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Payout banner */}
        <div style={{
          background: `linear-gradient(135deg, ${CX.orange}, ${CX.orangeDeep})`,
          borderRadius: 14, padding: '14px 16px', marginBottom: 14,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          boxShadow: '0 6px 18px rgba(242,106,33,0.30)',
        }}>
          <div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.9)', letterSpacing: '0.8px', fontWeight: 800 }}>GUARANTEED PAYOUT</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: '#fff', fontFamily: MONO, lineHeight: 1, marginTop: 2 }}>
              ${job.payout.toFixed(2)}
            </div>
          </div>
          <div style={{ textAlign: 'right', color: '#fff' }}>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{job.miles} mi</div>
            <div style={{ fontSize: 11, opacity: 0.9 }}>{job.windowMins} min window</div>
          </div>
        </div>

        {/* Manifest */}
        <div style={{
          background: CX.tealSoft, border: `1px solid ${CX.teal}55`, borderRadius: 12, padding: 12,
          display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 12,
        }}>
          <Manifest label="Pieces" value={String(job.pieces)} />
          <Manifest label="Weight" value={`${job.weightLbs} lb`} />
          <Manifest label="Vehicle" value={job.vehicle} />
        </div>

        {/* Route */}
        <div style={{ background: CX.surfaceAlt, borderRadius: 12, padding: 14, border: `1px solid ${CX.line}` }}>
          <RoutePoint label="PICKUP" address={job.pickup.label} sub={job.pickup.contact} color={CX.orange} />
          <div style={{ height: 22, marginLeft: 11, borderLeft: `2px dashed ${CX.lineStrong}` }} />
          <RoutePoint
            label="DROPOFF"
            address={job.dropoff.label}
            sub={[job.dropoff.apt, job.dropoff.contact].filter(Boolean).join(' · ')}
            notes={job.dropoff.notes}
            color={CX.teal}
          />
        </div>

        {/* Proof required */}
        <div style={{
          marginTop: 12, padding: '10px 12px', background: '#FFF8EC',
          border: `1px solid #F2C26B`, borderRadius: 10,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <AlertTriangle size={14} color={CX.warn} />
          <span style={{ fontSize: 11, color: '#8A5A00', fontWeight: 700, letterSpacing: '0.3px' }}>
            PROOF REQUIRED: {job.proofRequired.map(p => p.toUpperCase()).join(' + ')}
          </span>
        </div>

        {/* Actions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10, marginTop: 16 }}>
          <button onClick={onClose} className="cx-tap" style={{
            background: CX.surface, color: CX.text, border: `1px solid ${CX.line}`, borderRadius: 12,
            padding: '14px', fontWeight: 700, fontSize: 14, cursor: 'pointer',
          }}>Decline</button>
          <button onClick={onAccept} className="cx-tap" style={{
            background: `linear-gradient(135deg, ${CX.orange}, ${CX.orangeDeep})`,
            color: '#fff', border: 'none', borderRadius: 12, padding: '14px',
            fontWeight: 800, fontSize: 14, cursor: 'pointer',
            boxShadow: '0 8px 22px rgba(242,106,33,0.35)', letterSpacing: '0.5px',
          }}>ACCEPT JOB</button>
        </div>
      </div>
    </div>
  );
}

function Manifest({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 9, color: CX.tealDeep, fontWeight: 800, letterSpacing: '0.7px' }}>{label.toUpperCase()}</div>
      <div style={{ fontSize: 14, fontWeight: 800, color: CX.ink, fontFamily: MONO, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function RoutePoint({ label, address, sub, notes, color }: { label: string; address: string; sub?: string; notes?: string; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
      <div style={{
        width: 22, height: 22, borderRadius: 999, border: `3px solid ${color}`,
        background: '#fff', flexShrink: 0, marginTop: 2,
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, color: CX.sub, letterSpacing: '0.8px', fontWeight: 800 }}>{label}</div>
        <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2, color: CX.ink }}>{address}</div>
        {sub && <div style={{ fontSize: 11, color: CX.sub, marginTop: 2 }}>{sub}</div>}
        {notes && (
          <div style={{
            marginTop: 6, padding: '6px 8px', background: CX.surface,
            border: `1px dashed ${CX.lineStrong}`, borderRadius: 6,
            fontSize: 11, color: CX.text, fontStyle: 'italic',
          }}>“{notes}”</div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// ACTIVE DELIVERY FLOW — full enterprise pipeline
// Stages: en_route_pickup → arrive_pickup → scan → en_route_dropoff
//         → arrive_dropoff → proof → review → complete
// ============================================================
type Stage = 'en_route_pickup' | 'arrive_pickup' | 'scan' | 'en_route_dropoff' | 'arrive_dropoff' | 'proof' | 'review' | 'complete';

const STAGE_LABEL: Record<Stage, string> = {
  en_route_pickup: 'En route to pickup',
  arrive_pickup: 'Arrived at pickup',
  scan: 'Scan & verify',
  en_route_dropoff: 'En route to customer',
  arrive_dropoff: 'Arrived at customer',
  proof: 'Capture proof of delivery',
  review: 'Review & submit',
  complete: 'Complete',
};

const STAGE_ORDER: Stage[] = ['en_route_pickup','arrive_pickup','scan','en_route_dropoff','arrive_dropoff','proof','review','complete'];

type ProofData = {
  photo: string | null;     // dataURL placeholder
  signature: string | null; // dataURL
  recipientName: string;
  notes: string;
  barcode: string;
};

function ActiveDeliveryFlow({ job, onComplete, onBack }: { job: Job | null; onComplete: () => void; onBack: () => void }) {
  const [stage, setStage] = useState<Stage>('en_route_pickup');
  const [proof, setProof] = useState<ProofData>({ photo: null, signature: null, recipientName: '', notes: '', barcode: '' });

  if (!job) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12, background: CX.bg }}>
        <div style={{ width: 64, height: 64, borderRadius: 16, background: CX.surface, border: `1px solid ${CX.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Package size={28} color={CX.sub} />
        </div>
        <div style={{ fontSize: 16, fontWeight: 800, color: CX.ink }}>No active delivery</div>
        <div style={{ fontSize: 13, color: CX.sub, textAlign: 'center', maxWidth: 280 }}>
          Accept a job from the board to begin your delivery flow.
        </div>
        <button onClick={onBack} className="cx-tap" style={{
          marginTop: 8, background: CX.orange, color: '#fff', border: 'none', borderRadius: 10,
          padding: '10px 18px', fontWeight: 800, fontSize: 13, cursor: 'pointer',
        }}>Browse Jobs</button>
      </div>
    );
  }

  const advance = (next?: Stage) => {
    if (next) { setStage(next); return; }
    const i = STAGE_ORDER.indexOf(stage);
    const nx = STAGE_ORDER[i + 1];
    if (!nx) onComplete();
    else if (nx === 'complete') { onComplete(); }
    else setStage(nx);
  };

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: CX.bg }}>
      <StageHeader job={job} stage={stage} />

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {(stage === 'en_route_pickup' || stage === 'en_route_dropoff') && (
          <NavigateStep job={job} stage={stage} onArrive={advance} />
        )}
        {stage === 'arrive_pickup' && (
          <ArrivePickupStep job={job} onNext={() => advance('scan')} />
        )}
        {stage === 'scan' && (
          <ScanStep job={job} proof={proof} setProof={setProof} onNext={() => advance('en_route_dropoff')} />
        )}
        {stage === 'arrive_dropoff' && (
          <ArriveDropoffStep job={job} onNext={() => advance('proof')} />
        )}
        {stage === 'proof' && (
          <ProofStep job={job} proof={proof} setProof={setProof} onNext={() => advance('review')} />
        )}
        {stage === 'review' && (
          <ReviewStep job={job} proof={proof} onSubmit={onComplete} />
        )}
      </div>
    </div>
  );
}

function StageHeader({ job, stage }: { job: Job; stage: Stage }) {
  const idx = STAGE_ORDER.indexOf(stage);
  const pct = Math.round((idx / (STAGE_ORDER.length - 1)) * 100);
  const label = (STAGE_LABEL[stage] || String(stage || '')).toUpperCase();
  return (
    <div style={{ background: CX.surface, borderBottom: `1px solid ${CX.line}` }}>
      <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 8, height: 8, borderRadius: 999, background: CX.orange,
          animation: 'cxPulse 1.5s infinite',
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, color: CX.sub, letterSpacing: '0.7px', fontWeight: 800 }}>
            STAGE {Math.max(idx, 0) + 1} OF {STAGE_ORDER.length - 1} · {label}
          </div>
          <div style={{ fontSize: 13, fontWeight: 800, color: CX.ink, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {job.merchant} · <span style={{ fontFamily: MONO, color: CX.orange }}>${job.payout.toFixed(2)}</span>
          </div>
        </div>
        <a href={`tel:${job.dropoff.phone || ''}`} style={{
          width: 36, height: 36, borderRadius: 999, background: CX.tealSoft, border: `1px solid ${CX.teal}55`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Phone size={16} color={CX.tealDeep} />
        </a>
      </div>
      <div style={{ height: 3, background: CX.line, position: 'relative' }}>
        <div style={{
          position: 'absolute', inset: 0, width: `${pct}%`,
          background: `linear-gradient(90deg, ${CX.orange}, ${CX.teal})`,
          transition: 'width .35s ease',
        }} />
      </div>
    </div>
  );
}

// ----- Step: Navigation (pickup or dropoff) -----
function NavigateStep({ job, stage, onArrive }: { job: Job; stage: Stage; onArrive: () => void }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const toPickup = stage === 'en_route_pickup';
  const target = toPickup ? job.pickup : job.dropoff;

  useEffect(() => {
    if (!mapRef.current) return;
    mapboxgl.accessToken = MAPBOX_CONFIG.accessToken;
    const map = new mapboxgl.Map({
      container: mapRef.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [(job.pickup.lng + job.dropoff.lng) / 2, (job.pickup.lat + job.dropoff.lat) / 2],
      zoom: 12, attributionControl: false,
    });
    map.on('load', async () => {
      // Route from pickup to dropoff (always show full leg, but highlight active segment)
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${job.pickup.lng},${job.pickup.lat};${job.dropoff.lng},${job.dropoff.lat}?geometries=geojson&access_token=${MAPBOX_CONFIG.accessToken}`;
      try {
        const r = await fetch(url); const d = await r.json();
        const route = d.routes?.[0]?.geometry;
        if (route) {
          map.addSource('rt', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: route } });
          map.addLayer({ id: 'rt-c', type: 'line', source: 'rt',
            paint: { 'line-color': CX.lineStrong, 'line-width': 6, 'line-opacity': 0.6 } });
          map.addLayer({ id: 'rt-l', type: 'line', source: 'rt',
            paint: { 'line-color': toPickup ? CX.orange : CX.teal, 'line-width': 4 } });
          const b = new mapboxgl.LngLatBounds();
          route.coordinates.forEach((c: [number, number]) => b.extend(c));
          map.fitBounds(b, { padding: 70 });
        }
      } catch (e) { console.error(e); }

      const mkPin = (color: string, txt: string) => {
        const el = document.createElement('div');
        el.style.cssText = `width:48px;height:48px;border-radius:999px;background:${color};color:#fff;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;border:3px solid #fff;box-shadow:0 4px 14px rgba(0,0,0,0.25);letter-spacing:0.4px;font-family:${MONO}`;
        el.textContent = txt; return el;
      };
      new mapboxgl.Marker(mkPin(CX.orange, 'PICKUP')).setLngLat([job.pickup.lng, job.pickup.lat]).addTo(map);
      new mapboxgl.Marker(mkPin(CX.teal, 'DROP')).setLngLat([job.dropoff.lng, job.dropoff.lat]).addTo(map);
    });
    return () => map.remove();
  }, [job, stage, toPickup]);

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, position: 'relative' }}>
        <div ref={mapRef} style={{ position: 'absolute', inset: 0 }} />
        {/* Floating ETA */}
        <div style={{
          position: 'absolute', top: 12, left: 12, right: 12,
          background: 'rgba(255,255,255,0.96)', border: `1px solid ${CX.line}`,
          borderRadius: 12, padding: '10px 14px', boxShadow: CX.shadow,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: toPickup ? CX.orangeSoft : CX.tealSoft,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Navigation2 size={18} color={toPickup ? CX.orange : CX.tealDeep} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, color: CX.sub, fontWeight: 800, letterSpacing: '0.5px' }}>
              {toPickup ? 'PICKUP IN' : 'DROPOFF IN'}
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: CX.ink, fontFamily: MONO }}>
              {toPickup ? '8 min · 2.1 mi' : '14 min · 4.8 mi'}
            </div>
          </div>
        </div>
      </div>

      <div style={{
        padding: '14px 14px calc(env(safe-area-inset-bottom,0px) + 14px)',
        background: CX.surface, borderTop: `1px solid ${CX.line}`,
      }}>
        <div style={{
          background: CX.surfaceAlt, borderRadius: 10, padding: 12, marginBottom: 12,
          border: `1px solid ${CX.line}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <MapPin size={14} color={toPickup ? CX.orange : CX.tealDeep} />
            <div style={{ fontSize: 10, color: CX.sub, letterSpacing: '0.7px', fontWeight: 800 }}>
              {toPickup ? 'PICKUP ADDRESS' : 'CUSTOMER ADDRESS'}
            </div>
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, color: CX.ink }}>{target.label}</div>
          {!toPickup && (
            <>
              {job.dropoff.apt && <div style={{ fontSize: 13, color: CX.text, fontWeight: 700, marginTop: 2 }}>{job.dropoff.apt}</div>}
              {job.dropoff.contact && <div style={{ fontSize: 12, color: CX.sub, marginTop: 4 }}>Recipient: <b style={{ color: CX.text }}>{job.dropoff.contact}</b></div>}
              {job.dropoff.notes && (
                <div style={{ marginTop: 8, padding: '6px 8px', background: '#FFF8EC', border: '1px solid #F2C26B', borderRadius: 6, fontSize: 11, color: '#8A5A00' }}>
                  Note: {job.dropoff.notes}
                </div>
              )}
            </>
          )}
        </div>
        <button onClick={onArrive} className="cx-tap" style={{
          width: '100%', background: `linear-gradient(135deg, ${CX.orange}, ${CX.orangeDeep})`,
          color: '#fff', border: 'none', borderRadius: 14, padding: '16px',
          fontWeight: 800, fontSize: 15, letterSpacing: '0.5px', cursor: 'pointer',
          boxShadow: '0 8px 22px rgba(242,106,33,0.30)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <Check size={18} />
          {toPickup ? 'I\'VE ARRIVED AT PICKUP' : 'I\'VE ARRIVED AT CUSTOMER'}
        </button>
      </div>
    </div>
  );
}

// ----- Step: Arrive at pickup -----
function ArrivePickupStep({ job, onNext }: { job: Job; onNext: () => void }) {
  const [items, setItems] = useState<boolean[]>(Array(job.pieces).fill(false));
  const allChecked = items.every(Boolean);
  return (
    <div className="cx-fade" style={{ padding: 16, paddingBottom: 100 }}>
      <StepTitle icon={Package} title="Pickup Checklist" sub={`At ${job.merchant}`} />
      <Card>
        <div style={{ fontSize: 12, fontWeight: 800, color: CX.sub, letterSpacing: '0.5px', marginBottom: 10 }}>
          VERIFY {job.pieces} {job.pieces === 1 ? 'PIECE' : 'PIECES'}
        </div>
        {items.map((checked, i) => (
          <label key={i} className="cx-tap" style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px', background: checked ? CX.tealSoft : CX.surfaceAlt,
            border: `1px solid ${checked ? CX.teal : CX.line}`,
            borderRadius: 10, marginBottom: 8, cursor: 'pointer',
          }}>
            <input
              type="checkbox" checked={checked}
              onChange={(e) => setItems(items.map((v, idx) => idx === i ? e.target.checked : v))}
              style={{ width: 18, height: 18, accentColor: CX.teal }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: CX.ink }}>Piece {i + 1} of {job.pieces}</div>
              <div style={{ fontSize: 11, color: CX.sub, fontFamily: MONO }}>SKU-{job.id.slice(-4)}-{String(i + 1).padStart(2, '0')}</div>
            </div>
            {checked && <BadgeCheck size={18} color={CX.teal} />}
          </label>
        ))}
      </Card>

      <Card>
        <div style={{ fontSize: 12, fontWeight: 800, color: CX.sub, letterSpacing: '0.5px', marginBottom: 8 }}>
          PICKUP CONTACT
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: CX.ink }}>{job.pickup.contact || 'Store staff'}</div>
        <div style={{ fontSize: 12, color: CX.sub, marginTop: 2 }}>{job.pickup.label}</div>
      </Card>

      <StickyAction>
        <button onClick={onNext} disabled={!allChecked} className="cx-tap" style={{
          width: '100%', background: allChecked ? `linear-gradient(135deg, ${CX.orange}, ${CX.orangeDeep})` : CX.line,
          color: allChecked ? '#fff' : CX.subSoft, border: 'none', borderRadius: 14,
          padding: '16px', fontWeight: 800, fontSize: 15, cursor: allChecked ? 'pointer' : 'not-allowed',
          boxShadow: allChecked ? '0 8px 22px rgba(242,106,33,0.30)' : 'none',
        }}>{allChecked ? 'CONTINUE TO SCAN' : `Check all ${job.pieces} pieces`}</button>
      </StickyAction>
    </div>
  );
}

// ----- Step: Scan / verify barcode -----
function ScanStep({ job, proof, setProof, onNext }: { job: Job; proof: ProofData; setProof: (p: ProofData) => void; onNext: () => void }) {
  return (
    <div className="cx-fade" style={{ padding: 16, paddingBottom: 100 }}>
      <StepTitle icon={ScanLine} title="Scan & Verify" sub="Scan label or enter manually" />

      <div style={{
        background: '#fff', borderRadius: 16, border: `1px solid ${CX.line}`,
        padding: 0, overflow: 'hidden', boxShadow: CX.shadow, marginBottom: 12,
      }}>
        <div style={{
          aspectRatio: '1.6', background: '#0E1726', position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            position: 'absolute', inset: '15% 12%',
            border: `2px solid ${CX.orange}`, borderRadius: 12,
            boxShadow: `0 0 0 9999px rgba(0,0,0,0.4)`,
          }} />
          <div style={{
            position: 'absolute', left: '12%', right: '12%', top: '50%',
            height: 2, background: CX.orange, boxShadow: `0 0 12px ${CX.orange}`,
            animation: 'cxPulse 1.4s infinite',
          }} />
          <div style={{ position: 'absolute', top: 10, left: 12, fontSize: 10, color: '#fff', fontFamily: MONO, letterSpacing: '0.5px', opacity: 0.85 }}>
            CAMERA · SCANNING
          </div>
        </div>
        <div style={{ padding: 12 }}>
          <label style={{ fontSize: 11, color: CX.sub, fontWeight: 800, letterSpacing: '0.5px' }}>BARCODE / TRACKING #</label>
          <input
            value={proof.barcode}
            onChange={(e) => setProof({ ...proof, barcode: e.target.value })}
            placeholder={`CX-${job.id.slice(-4)}-PKG`}
            style={{
              width: '100%', marginTop: 6, padding: '10px 12px',
              border: `1px solid ${CX.line}`, borderRadius: 8,
              fontFamily: MONO, fontSize: 14, color: CX.ink, background: CX.surfaceAlt,
            }}
          />
        </div>
      </div>

      <StickyAction>
        <button onClick={onNext} className="cx-tap" style={{
          width: '100%', background: `linear-gradient(135deg, ${CX.orange}, ${CX.orangeDeep})`,
          color: '#fff', border: 'none', borderRadius: 14, padding: '16px',
          fontWeight: 800, fontSize: 15, cursor: 'pointer',
          boxShadow: '0 8px 22px rgba(242,106,33,0.30)',
        }}>START NAVIGATION TO CUSTOMER</button>
      </StickyAction>
    </div>
  );
}

// ----- Step: Arrive at dropoff -----
function ArriveDropoffStep({ job, onNext }: { job: Job; onNext: () => void }) {
  return (
    <div className="cx-fade" style={{ padding: 16, paddingBottom: 100 }}>
      <StepTitle icon={MapPin} title="Arrived at Customer" sub="Confirm dropoff details" />
      <Card>
        <div style={{ fontSize: 11, color: CX.tealDeep, fontWeight: 800, letterSpacing: '0.6px' }}>DELIVER TO</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: CX.ink, marginTop: 4 }}>{job.dropoff.contact || 'Recipient'}</div>
        <div style={{ fontSize: 14, color: CX.text, marginTop: 6 }}>{job.dropoff.label}</div>
        {job.dropoff.apt && (
          <div style={{
            marginTop: 6, display: 'inline-block', padding: '4px 10px',
            background: CX.tealSoft, color: CX.tealDeep, fontWeight: 800,
            fontSize: 12, borderRadius: 999, letterSpacing: '0.3px',
          }}>{job.dropoff.apt}</div>
        )}
        {job.dropoff.phone && (
          <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
            <a href={`tel:${job.dropoff.phone}`} style={{
              flex: 1, padding: '10px', borderRadius: 10, background: CX.tealSoft,
              border: `1px solid ${CX.teal}55`, color: CX.tealDeep, fontWeight: 800,
              fontSize: 13, textAlign: 'center', textDecoration: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}><Phone size={14} /> Call</a>
            <a href={`sms:${job.dropoff.phone}`} style={{
              flex: 1, padding: '10px', borderRadius: 10, background: CX.orangeSoft,
              border: `1px solid ${CX.orange}55`, color: CX.orangeDeep, fontWeight: 800,
              fontSize: 13, textAlign: 'center', textDecoration: 'none',
            }}>Text</a>
          </div>
        )}
        {job.dropoff.notes && (
          <div style={{
            marginTop: 10, padding: '8px 10px', background: '#FFF8EC',
            border: '1px solid #F2C26B', borderRadius: 8, fontSize: 12, color: '#8A5A00',
          }}>
            <b>Delivery note:</b> {job.dropoff.notes}
          </div>
        )}
      </Card>

      <StickyAction>
        <button onClick={onNext} className="cx-tap" style={{
          width: '100%', background: `linear-gradient(135deg, ${CX.orange}, ${CX.orangeDeep})`,
          color: '#fff', border: 'none', borderRadius: 14, padding: '16px',
          fontWeight: 800, fontSize: 15, cursor: 'pointer',
          boxShadow: '0 8px 22px rgba(242,106,33,0.30)',
        }}>CAPTURE PROOF OF DELIVERY</button>
      </StickyAction>
    </div>
  );
}

// ----- Step: Proof of delivery -----
function ProofStep({ job, proof, setProof, onNext }: { job: Job; proof: ProofData; setProof: (p: ProofData) => void; onNext: () => void }) {
  const needsPhoto = job.proofRequired.includes('photo');
  const needsSig = job.proofRequired.includes('signature');
  const needsRecipient = job.proofRequired.includes('recipient');

  const canSubmit =
    (!needsPhoto || !!proof.photo) &&
    (!needsSig || !!proof.signature) &&
    (!needsRecipient || proof.recipientName.trim().length > 1);

  return (
    <div className="cx-fade" style={{ padding: 16, paddingBottom: 100 }}>
      <StepTitle icon={Shield} title="Proof of Delivery" sub="Required by merchant SLA" />

      {needsPhoto && (
        <Card>
          <ProofLabel icon={Camera} text="Package photo" required done={!!proof.photo} />
          <PhotoCapture value={proof.photo} onChange={(v) => setProof({ ...proof, photo: v })} />
        </Card>
      )}

      {needsSig && (
        <Card>
          <ProofLabel icon={PenLine} text="Recipient signature" required done={!!proof.signature} />
          <SignaturePad value={proof.signature} onChange={(v) => setProof({ ...proof, signature: v })} />
        </Card>
      )}

      {needsRecipient && (
        <Card>
          <ProofLabel icon={User} text="Recipient name" required done={proof.recipientName.trim().length > 1} />
          <input
            value={proof.recipientName}
            onChange={(e) => setProof({ ...proof, recipientName: e.target.value })}
            placeholder="First & last name"
            style={{
              width: '100%', padding: '12px', borderRadius: 10,
              border: `1px solid ${CX.line}`, fontSize: 14, color: CX.ink, background: CX.surfaceAlt,
            }}
          />
        </Card>
      )}

      <Card>
        <ProofLabel icon={FileText} text="Delivery notes (optional)" />
        <textarea
          value={proof.notes}
          onChange={(e) => setProof({ ...proof, notes: e.target.value })}
          placeholder="Left with front desk, gate code used, etc."
          rows={3}
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 10,
            border: `1px solid ${CX.line}`, fontSize: 13, color: CX.ink,
            background: CX.surfaceAlt, resize: 'vertical', fontFamily: SANS,
          }}
        />
      </Card>

      <StickyAction>
        <button onClick={onNext} disabled={!canSubmit} className="cx-tap" style={{
          width: '100%',
          background: canSubmit ? `linear-gradient(135deg, ${CX.orange}, ${CX.orangeDeep})` : CX.line,
          color: canSubmit ? '#fff' : CX.subSoft, border: 'none', borderRadius: 14,
          padding: '16px', fontWeight: 800, fontSize: 15, cursor: canSubmit ? 'pointer' : 'not-allowed',
          boxShadow: canSubmit ? '0 8px 22px rgba(242,106,33,0.30)' : 'none',
        }}>{canSubmit ? 'REVIEW & SUBMIT' : 'Complete required proof'}</button>
      </StickyAction>
    </div>
  );
}

function ProofLabel({ icon: Icon, text, required, done }: { icon: any; text: string; required?: boolean; done?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      <Icon size={16} color={done ? CX.teal : CX.sub} />
      <span style={{ fontSize: 12, fontWeight: 800, color: CX.ink, letterSpacing: '0.3px' }}>
        {text} {required && <span style={{ color: CX.bad }}>*</span>}
      </span>
      {done && <BadgeCheck size={14} color={CX.teal} style={{ marginLeft: 'auto' }} />}
    </div>
  );
}

// ----- Photo capture (file input) -----
function PhotoCapture({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const onFile = (f: File | null) => {
    if (!f) return;
    const r = new FileReader();
    r.onload = () => onChange(String(r.result));
    r.readAsDataURL(f);
  };
  return (
    <div>
      <input
        ref={inputRef} type="file" accept="image/*" capture="environment"
        style={{ display: 'none' }}
        onChange={(e) => onFile(e.target.files?.[0] || null)}
      />
      {value ? (
        <div style={{ position: 'relative' }}>
          <img src={value} alt="Proof" style={{ width: '100%', borderRadius: 10, border: `1px solid ${CX.line}` }} />
          <button onClick={() => onChange(null)} style={{
            position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)',
            color: '#fff', border: 'none', borderRadius: 999, width: 28, height: 28, cursor: 'pointer',
          }}><X size={14} /></button>
        </div>
      ) : (
        <button onClick={() => inputRef.current?.click()} className="cx-tap" style={{
          width: '100%', padding: '28px 12px', background: CX.surfaceAlt,
          border: `2px dashed ${CX.lineStrong}`, borderRadius: 12, cursor: 'pointer',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: CX.sub,
        }}>
          <Camera size={28} color={CX.orange} />
          <span style={{ fontSize: 13, fontWeight: 700, color: CX.ink }}>Tap to take photo</span>
          <span style={{ fontSize: 11, color: CX.sub }}>Show package at delivery location</span>
        </button>
      )}
    </div>
  );
}

// ----- Signature pad -----
function SignaturePad({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
  }, []);

  const pos = (e: React.PointerEvent) => {
    const c = canvasRef.current!; const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * c.width, y: ((e.clientY - r.top) / r.height) * c.height };
  };
  const start = (e: React.PointerEvent) => { drawing.current = true; last.current = pos(e); };
  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const c = canvasRef.current!; const ctx = c.getContext('2d')!;
    const p = pos(e);
    ctx.strokeStyle = CX.ink; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(last.current!.x, last.current!.y);
    ctx.lineTo(p.x, p.y); ctx.stroke();
    last.current = p;
  };
  const end = () => {
    drawing.current = false; last.current = null;
    const c = canvasRef.current!;
    onChange(c.toDataURL('image/png'));
  };
  const clear = () => {
    const c = canvasRef.current!; const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    onChange(null);
  };

  return (
    <div>
      <div style={{
        background: '#fff', border: `1px solid ${CX.line}`, borderRadius: 10, overflow: 'hidden',
        position: 'relative',
      }}>
        <canvas
          ref={canvasRef} width={600} height={200}
          style={{ width: '100%', height: 160, touchAction: 'none', display: 'block' }}
          onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerLeave={end}
        />
        <div style={{
          position: 'absolute', left: 12, right: 12, bottom: 8,
          borderTop: `1px dashed ${CX.lineStrong}`, paddingTop: 4,
          fontSize: 10, color: CX.subSoft, letterSpacing: '0.5px',
        }}>X · SIGN ABOVE</div>
      </div>
      <button onClick={clear} style={{
        marginTop: 6, background: 'none', border: 'none', color: CX.sub,
        fontSize: 12, cursor: 'pointer', fontWeight: 700,
      }}>Clear signature</button>
    </div>
  );
}

// ----- Step: Review & submit -----
function ReviewStep({ job, proof, onSubmit }: { job: Job; proof: ProofData; onSubmit: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const submit = () => {
    setSubmitting(true);
    setTimeout(onSubmit, 900);
  };
  return (
    <div className="cx-fade" style={{ padding: 16, paddingBottom: 100 }}>
      <StepTitle icon={FileText} title="Review & Submit" sub="Confirm before closing the delivery" />

      <Card>
        <Row k="Job" v={`${job.id} · ${job.merchant}`} />
        <Row k="Payout" v={`$${job.payout.toFixed(2)}`} accent />
        <Row k="Distance" v={`${job.miles} mi`} />
        <Row k="Recipient" v={proof.recipientName || job.dropoff.contact || '—'} />
        <Row k="Dropoff" v={`${job.dropoff.label}${job.dropoff.apt ? ` · ${job.dropoff.apt}` : ''}`} />
        <Row k="Barcode" v={proof.barcode || '—'} mono />
      </Card>

      <Card>
        <div style={{ fontSize: 12, fontWeight: 800, color: CX.sub, letterSpacing: '0.5px', marginBottom: 10 }}>
          PROOF ATTACHED
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {proof.photo && (
            <div>
              <div style={{ fontSize: 10, color: CX.sub, fontWeight: 800, marginBottom: 4 }}>PHOTO</div>
              <img src={proof.photo} alt="" style={{ width: '100%', borderRadius: 8, border: `1px solid ${CX.line}` }} />
            </div>
          )}
          {proof.signature && (
            <div>
              <div style={{ fontSize: 10, color: CX.sub, fontWeight: 800, marginBottom: 4 }}>SIGNATURE</div>
              <img src={proof.signature} alt="" style={{ width: '100%', borderRadius: 8, border: `1px solid ${CX.line}`, background: '#fff' }} />
            </div>
          )}
        </div>
        {proof.notes && (
          <div style={{ marginTop: 10, padding: '8px 10px', background: CX.surfaceAlt, border: `1px solid ${CX.line}`, borderRadius: 8, fontSize: 12, color: CX.text }}>
            <b>Notes:</b> {proof.notes}
          </div>
        )}
      </Card>

      <StickyAction>
        <button onClick={submit} disabled={submitting} className="cx-tap" style={{
          width: '100%', background: submitting ? CX.teal : `linear-gradient(135deg, ${CX.teal}, ${CX.tealDeep})`,
          color: '#fff', border: 'none', borderRadius: 14, padding: '16px',
          fontWeight: 800, fontSize: 15, cursor: submitting ? 'wait' : 'pointer', letterSpacing: '0.5px',
          boxShadow: '0 8px 22px rgba(15,168,155,0.30)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <Check size={18} />
          {submitting ? 'SUBMITTING…' : 'SUBMIT DELIVERY'}
        </button>
      </StickyAction>
    </div>
  );
}

function Row({ k, v, accent, mono }: { k: string; v: string; accent?: boolean; mono?: boolean }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
      padding: '8px 0', borderBottom: `1px solid ${CX.line}`,
    }}>
      <div style={{ fontSize: 12, color: CX.sub, fontWeight: 700, letterSpacing: '0.3px' }}>{k}</div>
      <div style={{
        fontSize: 13, fontWeight: 800, color: accent ? CX.orange : CX.ink,
        fontFamily: mono ? MONO : 'inherit', textAlign: 'right', maxWidth: '65%',
      }}>{v}</div>
    </div>
  );
}

// ----- Shared building blocks -----
function StepTitle({ icon: Icon, title, sub }: { icon: any; title: string; sub: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
      <div style={{
        width: 38, height: 38, borderRadius: 10, background: CX.orangeSoft,
        display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${CX.orange}33`,
      }}>
        <Icon size={18} color={CX.orange} />
      </div>
      <div>
        <div style={{ fontSize: 16, fontWeight: 800, color: CX.ink, lineHeight: 1.1 }}>{title}</div>
        <div style={{ fontSize: 12, color: CX.sub, marginTop: 2 }}>{sub}</div>
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: CX.surface, border: `1px solid ${CX.line}`, borderRadius: 14,
      padding: 14, marginBottom: 12, boxShadow: CX.shadow,
    }}>{children}</div>
  );
}

function StickyAction({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      position: 'fixed', left: 0, right: 0, bottom: 0,
      padding: '12px 16px calc(env(safe-area-inset-bottom,0px) + 76px)',
      background: `linear-gradient(180deg, transparent, ${CX.bg} 30%)`,
      pointerEvents: 'none',
    }}>
      <div style={{ pointerEvents: 'auto' }}>{children}</div>
    </div>
  );
}

// ============================================================
// EARNINGS SCREEN
// ============================================================
function EarningsScreen() {
  const weekly = [42, 78, 65, 110, 95, 142, 88];
  const max = Math.max(...weekly);
  return (
    <div style={{ height: '100%', overflowY: 'auto', background: CX.bg, padding: 16, paddingBottom: 90 }}>
      <div style={{
        background: CX.surface, border: `1px solid ${CX.line}`, borderRadius: 16, padding: 16,
        boxShadow: CX.shadow,
      }}>
        <div style={{ fontSize: 11, color: CX.sub, letterSpacing: '0.8px', fontWeight: 800 }}>TODAY · MON JUN 22</div>
        <div style={{ fontSize: 40, fontWeight: 900, color: CX.orange, fontFamily: MONO, lineHeight: 1, marginTop: 4 }}>
          $142.80
        </div>
        <div style={{ display: 'flex', gap: 14, marginTop: 8, color: CX.sub, fontSize: 12 }}>
          <span><b style={{ color: CX.ink }}>7</b> deliveries</span>
          <span><b style={{ color: CX.ink }}>6.2h</b> online</span>
          <span><b style={{ color: CX.teal }}>+$18</b> tips</span>
        </div>
      </div>

      <div style={{
        marginTop: 14, background: CX.surface, border: `1px solid ${CX.line}`, borderRadius: 14, padding: 16,
        boxShadow: CX.shadow,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: CX.ink }}>This Week</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: CX.orange, fontFamily: MONO }}>$620.40</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120 }}>
          {weekly.map((v, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: '100%', height: `${(v / max) * 100}%`,
                background: i === 5 ? `linear-gradient(180deg, ${CX.orange}, ${CX.orangeDeep})` : CX.tealSoft,
                borderRadius: 4, border: i === 5 ? 'none' : `1px solid ${CX.teal}55`,
              }} />
              <div style={{ fontSize: 10, color: CX.sub, fontWeight: 700 }}>{['M','T','W','T','F','S','S'][i]}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{
        marginTop: 14, background: CX.surface, border: `1px solid ${CX.line}`, borderRadius: 14, padding: 16,
        boxShadow: CX.shadow,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: CX.sub, letterSpacing: '0.7px', fontWeight: 800 }}>AVAILABLE TO CASH OUT</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: CX.ink, fontFamily: MONO, marginTop: 4 }}>$142.80</div>
          </div>
          <Wallet size={28} color={CX.orange} />
        </div>
        <button className="cx-tap" style={{
          marginTop: 12, width: '100%', background: CX.orange, color: '#fff', border: 'none',
          borderRadius: 12, padding: '13px', fontWeight: 800, fontSize: 14, cursor: 'pointer',
          boxShadow: '0 6px 16px rgba(242,106,33,0.30)', letterSpacing: '0.5px',
        }}>INSTANT CASH OUT · $0.50 FEE</button>
        <div style={{ marginTop: 10, fontSize: 11, color: CX.sub }}>
          Next weekly deposit: Friday · ABA •••4421
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.5px', color: CX.sub, marginBottom: 8 }}>RECENT DELIVERIES</div>
        {[
          { id: 'CX-8801', m: 'AutoZone #4421', p: 18.50, t: '2h ago' },
          { id: 'CX-8794', m: 'Walgreens', p: 12.25, t: '3h ago' },
          { id: 'CX-8788', m: 'Office Depot', p: 35.75, t: '4h ago' },
        ].map(r => (
          <div key={r.id} style={{
            background: CX.surface, border: `1px solid ${CX.line}`, borderRadius: 10,
            padding: '12px 14px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            boxShadow: CX.shadow,
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: CX.ink }}>{r.m}</div>
              <div style={{ fontSize: 10, color: CX.sub, fontFamily: MONO }}>{r.id} · {r.t}</div>
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: CX.teal, fontFamily: MONO }}>+${r.p.toFixed(2)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// ACCOUNT SCREEN
// ============================================================
function AccountScreen() {
  return (
    <div style={{ height: '100%', overflowY: 'auto', background: CX.bg, padding: 16, paddingBottom: 90 }}>
      <div style={{
        background: CX.surface, borderRadius: 16, padding: 18, border: `1px solid ${CX.line}`, boxShadow: CX.shadow,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 999,
            background: `linear-gradient(135deg, ${CX.orange}, ${CX.orangeDeep})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 800, color: '#fff', boxShadow: '0 4px 12px rgba(242,106,33,0.30)',
          }}>JD</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: CX.ink }}>Jordan Davis</div>
            <div style={{ fontSize: 11, color: CX.sub, fontFamily: MONO }}>COURIER ID · 7741</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <Star size={12} color={CX.warn} fill={CX.warn} />
              <span style={{ fontSize: 12, fontWeight: 800, color: CX.ink }}>4.92</span>
              <span style={{ fontSize: 11, color: CX.sub }}>· 284 deliveries</span>
            </div>
          </div>
        </div>
        <div style={{
          marginTop: 14, padding: '8px 12px', background: CX.tealSoft,
          borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8,
          border: `1px solid ${CX.teal}55`,
        }}>
          <Trophy size={14} color={CX.tealDeep} />
          <span style={{ fontSize: 12, fontWeight: 800, color: CX.tealDeep, letterSpacing: '0.5px' }}>ELITE TIER · PRIORITY DISPATCH</span>
        </div>
      </div>

      {([
        { icon: Shield, label: 'Background Check', val: 'Cleared' },
        { icon: Truck, label: 'Vehicle', val: '2021 Honda Civic' },
        { icon: Wallet, label: 'Payout Method', val: 'Stripe Connect' },
        { icon: Activity, label: 'Performance', val: '98% on-time' },
        { icon: Bell, label: 'Notifications', val: 'On' },
        { icon: Settings, label: 'App Settings', val: '' },
        { icon: LogOut, label: 'Sign Out', val: '' },
      ] as { icon: any; label: string; val: string }[]).map((r, i) => (
        <div key={i} style={{
          marginTop: 8, background: CX.surface, border: `1px solid ${CX.line}`, borderRadius: 10,
          padding: '14px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', boxShadow: CX.shadow,
        }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: CX.orangeSoft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <r.icon size={16} color={CX.orange} />
          </div>
          <div style={{ flex: 1, fontSize: 14, fontWeight: 700, color: CX.ink }}>{r.label}</div>
          {r.val && <div style={{ fontSize: 12, color: CX.sub, fontWeight: 600 }}>{r.val}</div>}
          <ChevronRight size={16} color={CX.subSoft} />
        </div>
      ))}

      <div style={{ marginTop: 24, textAlign: 'center', fontSize: 10, color: CX.sub, letterSpacing: '0.5px' }}>
        CRAVE'N EXPRESS COURIER · v1.0.0 (Prototype)
      </div>
      <div style={{ marginTop: 8, textAlign: 'center' }}>
        <Link to="/" style={{ fontSize: 11, color: CX.sub, textDecoration: 'underline' }}>Exit prototype</Link>
      </div>
    </div>
  );
}

// ============================================================
// BOTTOM NAV
// ============================================================
function BottomNav({ tab, setTab, hasActive }: { tab: Tab; setTab: (t: Tab) => void; hasActive: boolean }) {
  const items: { id: Tab; label: string; icon: any; dot?: boolean }[] = [
    { id: 'jobs', label: 'Jobs', icon: MapPin },
    { id: 'active', label: 'Active', icon: Navigation2, dot: hasActive },
    { id: 'earnings', label: 'Earnings', icon: DollarSign },
    { id: 'account', label: 'Account', icon: User },
  ];
  return (
    <div style={{
      background: CX.surface,
      borderTop: `1px solid ${CX.line}`,
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      display: 'flex', justifyContent: 'space-around',
      boxShadow: '0 -4px 16px rgba(15,23,42,0.06)',
    }}>
      {items.map((it) => {
        const active = tab === it.id;
        return (
          <button key={it.id} onClick={() => setTab(it.id)} className="cx-tap" style={{
            flex: 1, background: 'none', border: 'none', padding: '10px 0 8px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer',
            color: active ? CX.orange : CX.sub, position: 'relative',
          }}>
            {active && <div style={{
              position: 'absolute', top: 0, left: '25%', right: '25%', height: 2,
              background: CX.orange, borderRadius: 2,
            }} />}
            <div style={{ position: 'relative' }}>
              <it.icon size={20} strokeWidth={active ? 2.4 : 2} />
              {it.dot && (
                <span style={{
                  position: 'absolute', top: -2, right: -4, width: 8, height: 8,
                  background: CX.teal, borderRadius: 999, boxShadow: `0 0 8px ${CX.teal}`,
                }} />
              )}
            </div>
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.3px' }}>{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}