// ───────────────────────────────────────────────────────────────────────────────
// components/market/shared/GlobalStyles.tsx
// (moved from inline <style> in the original; trimmed to essentials)
// ───────────────────────────────────────────────────────────────────────────────
'use client';

import React from 'react';

export default function GlobalStyles() {
    return (
        <style>{`
      body { background:#0c0c0f; color:#e0e0e0; margin:0; }
      .pageContainer { padding:2rem 3rem; max-width:1600px; margin:0 auto; }
      .header { margin-bottom:2.5rem; }
      .title { font-size:2.5rem; font-weight:800; margin:0; color:#fff; }
      .tabNav { display:flex; border-bottom:1px solid rgba(255,255,255,.1); margin-bottom:2rem; overflow-x:auto; }
      .tabButton { background:none; border:0; color:#a0a0a0; padding:1rem 1.5rem; cursor:pointer; position:relative; }
      .tabButton:hover, .tabButton:focus { color:#fff; outline:none; }
      .tabButtonActive { color:#fff; font-weight:600; }
      .tabButtonActive::after { content:''; position:absolute; bottom:-1px; left:1.5rem; right:1.5rem; height:3px; background:#0088FE; border-radius:2px 2px 0 0; }
      .tabContent { animation: fadeIn .4s ease-out; }
      @keyframes fadeIn { from { opacity:0; transform: translateY(10px);} to { opacity:1; transform:none; } }

      .grid { display:grid; gap:1.5rem; }
      .summaryGrid, .sectorsGrid, .liquidityGrid { grid-template-columns: repeat(2, 1fr); }
      .moversGrid, .sentimentGrid { grid-template-columns: 1fr; }
      .listingsGrid { grid-template-columns: 1fr 2fr; }
      .fullWidth { grid-column: span 2; }

      .card { background:#1a1a1d; border-radius:12px; padding:1.5rem; border:1px solid rgba(255,255,255,.05); box-shadow:0 8px 24px rgba(0,0,0,.3); height:100%; display:flex; flex-direction:column; }
      .chartCard { min-height:400px; }
      .cardHeader { display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; }
      .cardTitleContainer { display:flex; align-items:center; gap:.75rem; }
      .cardTitle { font-size:1.15rem; font-weight:600; color:#fff; margin:0; }

      .tableContainer{ width:100%; overflow-x:auto; margin-top:1.5rem; }
      .dataTable { width:100%; border-collapse:collapse; font-size:.9rem; margin-top:1.5rem; }
      .dataTable th, .dataTable td { text-align:left; padding:1rem; border-bottom:1px solid rgba(255,255,255,.08); }
      .dataTable th { font-weight:500; color:#888; font-size:.8rem; text-transform:uppercase; letter-spacing:.5px; }
      .positive{ color:#4CAF50; } .negative{ color:#F44336; } .neutral{ color:#9E9E9E; } .highImpact{ color:#FF9800; font-weight:700; }

      .chartContainer{ margin-top:1.5rem; flex-grow:1; }
      .kpiContainer{ display:flex; gap:1.5rem; }
      .kpiBox{ background:rgba(255,255,255,.05); padding:1rem 1.5rem; border-radius:8px; text-align:center; flex:1; }
      .kpiTitle{ font-size:.85rem; color:#a0a0a0; display:block; margin-bottom:.5rem; }
      .kpiValue{ display:block; font-weight:700; font-size:1.5rem; }

      .spinner { border:4px solid rgba(255,255,255,.1); width:40px; height:40px; border-radius:50%; border-left-color:#0088FE; animation:spin 1s linear infinite; }
      @keyframes spin { to { transform: rotate(360deg); } }

      @media (max-width:1280px){ .summaryGrid, .sectorsGrid, .liquidityGrid, .listingsGrid { grid-template-columns:1fr; } .fullWidth{ grid-column:span 1; } }
      @media (max-width:768px){ .pageContainer{ padding:1.5rem; } .title{ font-size:2rem; } .cardHeader{ flex-direction:column; align-items:flex-start; gap:1rem; } .kpiContainer{ flex-direction:column; gap:1rem; } }
    `}</style>
    );
}
