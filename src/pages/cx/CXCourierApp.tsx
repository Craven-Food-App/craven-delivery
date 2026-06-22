import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MAPBOX_CONFIG } from '@/config/mapbox';
import {
  MapPin, Package, DollarSign, User, Bell, Navigation2,
  Clock, ChevronRight, X, Check, Zap, TrendingUp, Phone,
  Shield, Star, ArrowLeft, Truck, Settings, LogOut, Wallet,
  CircleDot, ArrowUpRight
} from 'lucide-react';

/* =============================================================
 * CRAVE'N EXPRESS — Standalone Courier Driver App (Prototype)
 * Distinct CX identity: Crave'N Orange (#F26A21) + Steel/Charcoal
 * route: /cx-courier-app
 * ============================================================= */

// ---------- Brand tokens (scoped via inline styles) ----------
const CX = {
  orange: '#F26A21',
  orangeDeep: '#C8521A',
  orangeGlow: 'rgba(242,106,33,0.35)',
  ink: '#0B1118',
  panel: '#121922',
  panel2: '#1A222D',
  steel: '#2A3340',
  line: 'rgba(255,255,255,0.08)',
  text: '#E7ECF2',
  sub: '#8A95A5',
  good: '#3CCB7F',
  warn: '#F2B842',
};

// ---------- Mock data ----------
type Job = {
  id: string;
  merchant: string;
  category: 'Retail' | 'Auto Parts' | 'Pharmacy' | 'Floral' | 'B2B';
  payout: number;
  miles: number;
  pickup: { label: string; lat: number; lng: number };
  dropoff: { label: string; lat: number; lng: number };
  windowMins: number;
  vehicle: 'Car' | 'SUV' | 'Van';
  badge?: 'BONUS' | 'PRIORITY' | 'STACKED';
};

const MOCK_JOBS: Job[] = [
  { id: 'CX-8841', merchant: 'AutoZone #4421', category: 'Auto Parts', payout: 18.50, miles: 4.2, windowMins: 45, vehicle: 'Car',
    pickup: { label: '2410 Reynolds Rd, Toledo OH', lat: 41.6428, lng: -83.6555 },
    dropoff: { label: '1980 N Holland Sylvania Rd', lat: 41.6802, lng: -83.6711 },
    badge: 'BONUS' },
  { id: 'CX-8852', merchant: 'Walgreens Pharmacy', category: 'Pharmacy', payout: 12.25, miles: 2.1, windowMins: 30, vehicle: 'Car',
    pickup: { label: '3402 W Central Ave', lat: 41.6711, lng: -83.6312 },
    dropoff: { label: '4120 N Detroit Ave', lat: 41.6982, lng: -83.6189 } },
  { id: 'CX-8867', merchant: 'Bloom & Co Floral', category: 'Floral', payout: 22.00, miles: 6.8, windowMins: 60, vehicle: 'SUV',
    pickup: { label: '128 N Erie St', lat: 41.6582, lng: -83.5402 },
    dropoff: { label: '5800 Monroe St', lat: 41.7012, lng: -83.6892 },
    badge: 'PRIORITY' },
  { id: 'CX-8871', merchant: 'Office Depot #1182', category: 'B2B', payout: 35.75, miles: 11.4, windowMins: 90, vehicle: 'Van',
    pickup: { label: '5333 Monroe St', lat: 41.6912, lng: -83.6651 },
    dropoff: { label: '1611 N Reynolds Rd', lat: 41.6602, lng: -83.6781 },
    badge: 'STACKED' },
  { id: 'CX-8889', merchant: 'Best Buy #284', category: 'Retail', payout: 16.40, miles: 3.6, windowMins: 40, vehicle: 'Car',
    pickup: { label: '5001 Monroe St', lat: 41.6889, lng: -83.6612 },
    dropoff: { label: '2600 W Sylvania Ave', lat: 41.7102, lng: -83.6312 } },
];

// Cluster groups (Roadie-style "X jobs from this spot")
const CLUSTERS = [
  { id: 'c1', lat: 41.6512, lng: -83.6481, count: 3, label: 'West Toledo' },
  { id: 'c2', lat: 41.6912, lng: -83.6651, count: 5, label: 'Monroe Corridor' },
  { id: 'c3', lat: 41.6582, lng: -83.5402, count: 2, label: 'Downtown' },
  { id: 'c4', lat: 41.7012, lng: -83.6892, count: 4, label: 'Sylvania' },
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
      position: 'fixed', inset: 0, background: CX.ink, color: CX.text,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", sans-serif',
      display: 'flex', flexDirection: 'column', overflow: 'hidden'
    }}>
      <AppHeader online={online} setOnline={setOnline} />

      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {tab === 'jobs' && <JobBoardScreen online={online} onAccept={acceptJob} />}
        {tab === 'active' && <ActiveRouteScreen job={activeJob} onComplete={() => { setActiveJob(null); setTab('earnings'); }} />}
        {tab === 'earnings' && <EarningsScreen />}
        {tab === 'account' && <AccountScreen />}
      </div>

      <BottomNav tab={tab} setTab={setTab} hasActive={!!activeJob} />
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
      padding: '10px 16px 12px',
      background: `linear-gradient(180deg, ${CX.panel} 0%, ${CX.ink} 100%)`,
      borderBottom: `1px solid ${CX.line}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: `linear-gradient(135deg, ${CX.orange}, ${CX.orangeDeep})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 4px 14px ${CX.orangeGlow}`,
        }}>
          <Truck size={20} color="#fff" strokeWidth={2.4} />
        </div>
        <div style={{ lineHeight: 1.1 }}>
          <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '0.5px' }}>
            CRAVE'N <span style={{ color: CX.orange }}>EXPRESS</span>
          </div>
          <div style={{ fontSize: 10, color: CX.sub, fontFamily: 'ui-monospace, monospace', letterSpacing: '0.5px' }}>
            COURIER · ID 7741
          </div>
        </div>
      </div>

      <button
        onClick={() => setOnline(!online)}
        style={{
          background: online ? `${CX.good}22` : `${CX.steel}`,
          border: `1px solid ${online ? CX.good : CX.line}`,
          color: online ? CX.good : CX.sub,
          padding: '6px 12px', borderRadius: 999, fontSize: 11, fontWeight: 700,
          letterSpacing: '0.8px', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
        }}>
        <span style={{
          width: 8, height: 8, borderRadius: 999,
          background: online ? CX.good : CX.sub,
          boxShadow: online ? `0 0 8px ${CX.good}` : 'none',
          animation: online ? 'cxPulse 2s infinite' : 'none',
        }} />
        {online ? 'ONLINE' : 'OFFLINE'}
      </button>

      <style>{`@keyframes cxPulse {0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  );
}

// ============================================================
// JOB BOARD SCREEN — Roadie-style map + clusters + job list
// ============================================================
function JobBoardScreen({ online, onAccept }: { online: boolean; onAccept: (j: Job) => void }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<mapboxgl.Map | null>(null);
  const [previewJob, setPreviewJob] = useState<Job | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    mapboxgl.accessToken = MAPBOX_CONFIG.accessToken;
    try {
      const map = new mapboxgl.Map({
        container: mapRef.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [-83.6, 41.67],
        zoom: 10.6,
        attributionControl: false,
      });
      mapInstance.current = map;

      map.on('load', () => {
        // Cluster pins (large orange circles with counts)
        CLUSTERS.forEach((c) => {
          const el = document.createElement('div');
          el.style.cssText = `
            width: ${28 + c.count * 4}px; height: ${28 + c.count * 4}px;
            border-radius: 999px;
            background: radial-gradient(circle, ${CX.orange} 0%, ${CX.orangeDeep} 100%);
            box-shadow: 0 0 0 4px rgba(242,106,33,0.18), 0 0 24px ${CX.orangeGlow};
            display:flex;align-items:center;justify-content:center;
            color:#fff;font-weight:800;font-size:14px;cursor:pointer;
            border: 2px solid rgba(255,255,255,0.9);
          `;
          el.textContent = String(c.count);
          new mapboxgl.Marker(el).setLngLat([c.lng, c.lat]).addTo(map);
        });

        // Individual job pins (small)
        MOCK_JOBS.forEach((j) => {
          const el = document.createElement('div');
          el.style.cssText = `
            width:14px;height:14px;border-radius:999px;
            background:#fff;border:3px solid ${CX.orange};
            box-shadow:0 0 10px ${CX.orangeGlow};cursor:pointer;
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
        padding: '10px 12px', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8,
        background: CX.ink, borderBottom: `1px solid ${CX.line}`,
      }}>
        <Kpi label="AVAILABLE" value={String(MOCK_JOBS.length)} accent={CX.orange} />
        <Kpi label="AVG PAYOUT" value="$21" accent={CX.good} />
        <Kpi label="ZONE DEMAND" value="HIGH" accent={CX.warn} mono />
      </div>

      {/* Map (50% height) */}
      <div style={{ position: 'relative', flex: '0 0 44%', minHeight: 200 }}>
        <div ref={mapRef} style={{ position: 'absolute', inset: 0 }} />
        {!online && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(11,17,24,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8,
          }}>
            <CircleDot size={32} color={CX.sub} />
            <div style={{ fontSize: 13, color: CX.sub }}>You're offline. Toggle ONLINE to receive jobs.</div>
          </div>
        )}
      </div>

      {/* Job list */}
      <div style={{ flex: 1, overflowY: 'auto', background: CX.ink }}>
        <div style={{ padding: '14px 16px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.5px' }}>NEARBY JOBS</div>
          <div style={{ fontSize: 11, color: CX.sub, fontFamily: 'ui-monospace, monospace' }}>SORT · PAYOUT</div>
        </div>
        {MOCK_JOBS.map((j) => (
          <JobCard key={j.id} job={j} onClick={() => setPreviewJob(j)} />
        ))}
        <div style={{ height: 24 }} />
      </div>

      {previewJob && (
        <JobPreviewSheet job={previewJob} onClose={() => setPreviewJob(null)} onAccept={() => { onAccept(previewJob); setPreviewJob(null); }} />
      )}
    </div>
  );
}

function Kpi({ label, value, accent, mono }: { label: string; value: string; accent: string; mono?: boolean }) {
  return (
    <div style={{
      background: CX.panel, border: `1px solid ${CX.line}`, borderRadius: 10, padding: '8px 10px',
    }}>
      <div style={{ fontSize: 9, color: CX.sub, letterSpacing: '0.8px', fontWeight: 700 }}>{label}</div>
      <div style={{
        fontSize: 18, fontWeight: 800, color: accent, marginTop: 2,
        fontFamily: mono ? 'ui-monospace, monospace' : 'inherit',
      }}>{value}</div>
    </div>
  );
}

function JobCard({ job, onClick }: { job: Job; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      width: 'calc(100% - 24px)', margin: '0 12px 8px', textAlign: 'left',
      background: CX.panel, border: `1px solid ${CX.line}`, borderRadius: 12,
      padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8, cursor: 'pointer',
      color: CX.text,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, color: CX.sub }}>{job.id}</span>
            {job.badge && (
              <span style={{
                fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4,
                background: job.badge === 'BONUS' ? `${CX.orange}22` : job.badge === 'PRIORITY' ? `${CX.warn}22` : `${CX.good}22`,
                color: job.badge === 'BONUS' ? CX.orange : job.badge === 'PRIORITY' ? CX.warn : CX.good,
                letterSpacing: '0.6px',
              }}>{job.badge}</span>
            )}
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{job.merchant}</div>
          <div style={{ fontSize: 11, color: CX.sub, marginTop: 1 }}>{job.category} · {job.vehicle}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: CX.orange, fontFamily: 'ui-monospace, monospace' }}>
            ${job.payout.toFixed(2)}
          </div>
          <div style={{ fontSize: 10, color: CX.sub }}>{job.miles} mi</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 8, borderTop: `1px solid ${CX.line}` }}>
        <Clock size={12} color={CX.sub} />
        <span style={{ fontSize: 11, color: CX.sub }}>Deliver within {job.windowMins} min</span>
        <ChevronRight size={14} color={CX.sub} style={{ marginLeft: 'auto' }} />
      </div>
    </button>
  );
}

// ============================================================
// JOB PREVIEW SHEET (accept/decline)
// ============================================================
function JobPreviewSheet({ job, onClose, onAccept }: { job: Job; onClose: () => void; onAccept: () => void }) {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)' }} />
      <div style={{
        position: 'relative', width: '100%', background: CX.panel,
        borderTopLeftRadius: 18, borderTopRightRadius: 18,
        borderTop: `2px solid ${CX.orange}`, padding: '16px 16px calc(env(safe-area-inset-bottom,0px) + 16px)',
        maxHeight: '88%', overflowY: 'auto',
      }}>
        <div style={{ width: 40, height: 4, background: CX.steel, borderRadius: 2, margin: '0 auto 12px' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 10, fontFamily: 'ui-monospace, monospace', color: CX.sub, letterSpacing: '0.6px' }}>
              {job.id} · {job.category.toUpperCase()}
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, marginTop: 2 }}>{job.merchant}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: CX.sub, cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Payout banner */}
        <div style={{
          background: `linear-gradient(135deg, ${CX.orange}, ${CX.orangeDeep})`,
          borderRadius: 12, padding: '14px 16px', marginBottom: 14,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.85)', letterSpacing: '0.8px', fontWeight: 700 }}>GUARANTEED PAYOUT</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: '#fff', fontFamily: 'ui-monospace, monospace', lineHeight: 1 }}>
              ${job.payout.toFixed(2)}
            </div>
          </div>
          <div style={{ textAlign: 'right', color: '#fff' }}>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{job.miles} mi</div>
            <div style={{ fontSize: 11, opacity: 0.85 }}>{job.windowMins} min window</div>
          </div>
        </div>

        {/* Route */}
        <div style={{ background: CX.panel2, borderRadius: 12, padding: 14, border: `1px solid ${CX.line}` }}>
          <RoutePoint label="PICKUP" address={job.pickup.label} color={CX.orange} />
          <div style={{ height: 18, marginLeft: 11, borderLeft: `2px dashed ${CX.steel}` }} />
          <RoutePoint label="DROPOFF" address={job.dropoff.label} color={CX.good} />
        </div>

        {/* Actions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10, marginTop: 16 }}>
          <button onClick={onClose} style={{
            background: CX.steel, color: CX.text, border: 'none', borderRadius: 12,
            padding: '14px', fontWeight: 700, fontSize: 14, cursor: 'pointer',
          }}>Decline</button>
          <button onClick={onAccept} style={{
            background: `linear-gradient(135deg, ${CX.orange}, ${CX.orangeDeep})`,
            color: '#fff', border: 'none', borderRadius: 12, padding: '14px',
            fontWeight: 800, fontSize: 14, cursor: 'pointer',
            boxShadow: `0 6px 18px ${CX.orangeGlow}`, letterSpacing: '0.5px',
          }}>ACCEPT JOB</button>
        </div>
      </div>
    </div>
  );
}

function RoutePoint({ label, address, color }: { label: string; address: string; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
      <div style={{
        width: 22, height: 22, borderRadius: 999, border: `3px solid ${color}`,
        background: CX.panel, flexShrink: 0, marginTop: 2,
      }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 10, color: CX.sub, letterSpacing: '0.8px', fontWeight: 700 }}>{label}</div>
        <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{address}</div>
      </div>
    </div>
  );
}

// ============================================================
// ACTIVE ROUTE SCREEN
// ============================================================
function ActiveRouteScreen({ job, onComplete }: { job: Job | null; onComplete: () => void }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState<'to_pickup' | 'at_pickup' | 'to_dropoff' | 'at_dropoff'>('to_pickup');

  useEffect(() => {
    if (!job || !mapRef.current) return;
    mapboxgl.accessToken = MAPBOX_CONFIG.accessToken;
    const map = new mapboxgl.Map({
      container: mapRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [(job.pickup.lng + job.dropoff.lng) / 2, (job.pickup.lat + job.dropoff.lat) / 2],
      zoom: 12, attributionControl: false,
    });

    map.on('load', async () => {
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${job.pickup.lng},${job.pickup.lat};${job.dropoff.lng},${job.dropoff.lat}?geometries=geojson&access_token=${MAPBOX_CONFIG.accessToken}`;
      try {
        const r = await fetch(url); const d = await r.json();
        const route = d.routes?.[0]?.geometry;
        if (route) {
          map.addSource('rt', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: route } });
          map.addLayer({ id: 'rt-l', type: 'line', source: 'rt',
            paint: { 'line-color': CX.orange, 'line-width': 5, 'line-opacity': 0.9 } });
          const b = new mapboxgl.LngLatBounds();
          route.coordinates.forEach((c: [number, number]) => b.extend(c));
          map.fitBounds(b, { padding: 60 });
        }
      } catch (e) { console.error(e); }

      const mkPin = (color: string, txt: string) => {
        const el = document.createElement('div');
        el.style.cssText = `width:46px;height:46px;border-radius:999px;background:${color};color:#fff;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;border:3px solid #fff;box-shadow:0 4px 14px rgba(0,0,0,0.4);letter-spacing:0.4px`;
        el.textContent = txt; return el;
      };
      new mapboxgl.Marker(mkPin(CX.orange, 'PICKUP')).setLngLat([job.pickup.lng, job.pickup.lat]).addTo(map);
      new mapboxgl.Marker(mkPin(CX.good, 'DROP')).setLngLat([job.dropoff.lng, job.dropoff.lat]).addTo(map);
    });

    return () => map.remove();
  }, [job]);

  if (!job) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }}>
        <Package size={48} color={CX.sub} />
        <div style={{ fontSize: 16, fontWeight: 700 }}>No active route</div>
        <div style={{ fontSize: 13, color: CX.sub, textAlign: 'center' }}>Accept a job from the board to begin navigation.</div>
      </div>
    );
  }

  const stageLabel = {
    to_pickup: 'NAVIGATE TO PICKUP',
    at_pickup: 'CONFIRM PICKUP',
    to_dropoff: 'NAVIGATE TO DROPOFF',
    at_dropoff: 'CONFIRM DELIVERY',
  }[stage];

  const advance = () => {
    if (stage === 'to_pickup') setStage('at_pickup');
    else if (stage === 'at_pickup') setStage('to_dropoff');
    else if (stage === 'to_dropoff') setStage('at_dropoff');
    else onComplete();
  };

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{
        padding: '10px 14px', background: CX.panel, borderBottom: `1px solid ${CX.line}`,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{ width: 8, height: 8, borderRadius: 999, background: CX.orange, animation: 'cxPulse 1.5s infinite' }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: CX.sub, letterSpacing: '0.7px', fontWeight: 700 }}>{stageLabel}</div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{job.merchant} · ${job.payout.toFixed(2)}</div>
        </div>
        <Phone size={18} color={CX.sub} />
      </div>

      <div style={{ flex: 1, position: 'relative' }}>
        <div ref={mapRef} style={{ position: 'absolute', inset: 0 }} />
      </div>

      <div style={{
        padding: '14px 14px calc(env(safe-area-inset-bottom,0px) + 14px)',
        background: CX.panel, borderTop: `1px solid ${CX.line}`,
      }}>
        <div style={{ background: CX.panel2, borderRadius: 10, padding: 12, marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: CX.sub, letterSpacing: '0.7px', fontWeight: 700 }}>
            {stage.includes('pickup') ? 'PICKUP' : 'DROPOFF'}
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>
            {stage.includes('pickup') ? job.pickup.label : job.dropoff.label}
          </div>
        </div>
        <button onClick={advance} style={{
          width: '100%', background: `linear-gradient(135deg, ${CX.orange}, ${CX.orangeDeep})`,
          color: '#fff', border: 'none', borderRadius: 14, padding: '16px',
          fontWeight: 800, fontSize: 15, letterSpacing: '0.5px', cursor: 'pointer',
          boxShadow: `0 8px 22px ${CX.orangeGlow}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <Navigation2 size={18} />
          {stage === 'to_pickup' && 'ARRIVED AT PICKUP'}
          {stage === 'at_pickup' && 'PACKAGE COLLECTED'}
          {stage === 'to_dropoff' && 'ARRIVED AT DROPOFF'}
          {stage === 'at_dropoff' && 'COMPLETE DELIVERY'}
        </button>
      </div>
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
    <div style={{ height: '100%', overflowY: 'auto', background: CX.ink, padding: 16, paddingBottom: 90 }}>
      <div style={{ fontSize: 11, color: CX.sub, letterSpacing: '0.8px', fontWeight: 700 }}>TODAY · MON JUN 22</div>
      <div style={{ fontSize: 44, fontWeight: 900, color: CX.orange, fontFamily: 'ui-monospace, monospace', lineHeight: 1, marginTop: 4 }}>
        $142.80
      </div>
      <div style={{ display: 'flex', gap: 14, marginTop: 8, color: CX.sub, fontSize: 12 }}>
        <span><b style={{ color: CX.text }}>7</b> deliveries</span>
        <span><b style={{ color: CX.text }}>6.2h</b> online</span>
        <span><b style={{ color: CX.good }}>+$18</b> tips</span>
      </div>

      {/* Week chart */}
      <div style={{
        marginTop: 18, background: CX.panel, border: `1px solid ${CX.line}`, borderRadius: 14, padding: 16,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>This Week</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: CX.orange, fontFamily: 'ui-monospace, monospace' }}>$620.40</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120 }}>
          {weekly.map((v, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: '100%', height: `${(v / max) * 100}%`,
                background: i === 5 ? `linear-gradient(180deg, ${CX.orange}, ${CX.orangeDeep})` : CX.steel,
                borderRadius: 4,
              }} />
              <div style={{ fontSize: 10, color: CX.sub }}>{['M','T','W','T','F','S','S'][i]}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Payouts */}
      <div style={{ marginTop: 16, background: CX.panel, border: `1px solid ${CX.line}`, borderRadius: 14, padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: CX.sub, letterSpacing: '0.7px', fontWeight: 700 }}>AVAILABLE TO CASH OUT</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: CX.text, fontFamily: 'ui-monospace, monospace', marginTop: 4 }}>$142.80</div>
          </div>
          <Wallet size={28} color={CX.orange} />
        </div>
        <button style={{
          marginTop: 12, width: '100%', background: `${CX.orange}`, color: '#fff', border: 'none',
          borderRadius: 12, padding: '13px', fontWeight: 800, fontSize: 14, cursor: 'pointer',
          boxShadow: `0 6px 16px ${CX.orangeGlow}`, letterSpacing: '0.5px',
        }}>INSTANT CASH OUT · $0.50 FEE</button>
        <div style={{ marginTop: 10, fontSize: 11, color: CX.sub }}>
          Next weekly deposit: Friday · ABA •••4421
        </div>
      </div>

      {/* Recent */}
      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.5px', color: CX.sub, marginBottom: 8 }}>RECENT DELIVERIES</div>
        {[
          { id: 'CX-8801', m: 'AutoZone #4421', p: 18.50, t: '2h ago' },
          { id: 'CX-8794', m: 'Walgreens', p: 12.25, t: '3h ago' },
          { id: 'CX-8788', m: 'Office Depot', p: 35.75, t: '4h ago' },
        ].map(r => (
          <div key={r.id} style={{
            background: CX.panel, border: `1px solid ${CX.line}`, borderRadius: 10,
            padding: '12px 14px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{r.m}</div>
              <div style={{ fontSize: 10, color: CX.sub, fontFamily: 'ui-monospace, monospace' }}>{r.id} · {r.t}</div>
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: CX.good, fontFamily: 'ui-monospace, monospace' }}>+${r.p.toFixed(2)}</div>
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
    <div style={{ height: '100%', overflowY: 'auto', background: CX.ink, padding: 16, paddingBottom: 90 }}>
      <div style={{
        background: `linear-gradient(135deg, ${CX.panel} 0%, ${CX.steel} 100%)`,
        borderRadius: 16, padding: 18, border: `1px solid ${CX.line}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 999,
            background: `linear-gradient(135deg, ${CX.orange}, ${CX.orangeDeep})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 800, color: '#fff',
          }}>JD</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>Jordan Davis</div>
            <div style={{ fontSize: 11, color: CX.sub, fontFamily: 'ui-monospace, monospace' }}>COURIER ID · 7741</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <Star size={12} color={CX.warn} fill={CX.warn} />
              <span style={{ fontSize: 12, fontWeight: 700 }}>4.92</span>
              <span style={{ fontSize: 11, color: CX.sub }}>· 284 deliveries</span>
            </div>
          </div>
        </div>
        <div style={{
          marginTop: 14, padding: '8px 12px', background: `${CX.orange}22`,
          borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8,
          border: `1px solid ${CX.orange}55`,
        }}>
          <Zap size={14} color={CX.orange} />
          <span style={{ fontSize: 12, fontWeight: 700, color: CX.orange, letterSpacing: '0.5px' }}>ELITE TIER · PRIORITY DISPATCH</span>
        </div>
      </div>

      {[
        { icon: Shield, label: 'Background Check', val: 'Cleared' },
        { icon: Truck, label: 'Vehicle', val: '2021 Honda Civic' },
        { icon: Wallet, label: 'Payout Method', val: 'Stripe Connect' },
        { icon: Bell, label: 'Notifications', val: 'On' },
        { icon: Settings, label: 'App Settings', val: '' },
        { icon: LogOut, label: 'Sign Out', val: '' },
      ].map((r, i) => (
        <div key={i} style={{
          marginTop: 8, background: CX.panel, border: `1px solid ${CX.line}`, borderRadius: 10,
          padding: '14px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
        }}>
          <r.icon size={18} color={CX.orange} />
          <div style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{r.label}</div>
          {r.val && <div style={{ fontSize: 12, color: CX.sub }}>{r.val}</div>}
          <ChevronRight size={16} color={CX.sub} />
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
  const items: { id: Tab; label: string; icon: React.ElementType; dot?: boolean }[] = [
    { id: 'jobs', label: 'Jobs', icon: MapPin },
    { id: 'active', label: 'Active', icon: Navigation2, dot: hasActive },
    { id: 'earnings', label: 'Earnings', icon: DollarSign },
    { id: 'account', label: 'Account', icon: User },
  ];
  return (
    <div style={{
      background: CX.panel,
      borderTop: `1px solid ${CX.line}`,
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      display: 'flex', justifyContent: 'space-around',
    }}>
      {items.map((it) => {
        const active = tab === it.id;
        return (
          <button key={it.id} onClick={() => setTab(it.id)} style={{
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
                  background: CX.orange, borderRadius: 999, boxShadow: `0 0 8px ${CX.orangeGlow}`,
                }} />
              )}
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.3px' }}>{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}