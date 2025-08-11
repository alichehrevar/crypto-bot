// ───────────────────────────────────────────────────────────────────────────────
// components/market/shared/NivoTheme.ts
// ───────────────────────────────────────────────────────────────────────────────
export const CHART_GRID_COLOR = 'rgba(255,255,255,0.05)';
export const CHART_AXIS_COLOR = '#a0a0a0';
export const TOOLTIP_BACKGROUND = 'rgba(30,30,35,0.9)';

export const nivoDarkTheme = {
    background: 'transparent',
    text: { fontSize: 12, fill: CHART_AXIS_COLOR, outlineWidth: 0, outlineColor: 'transparent' },
    axis: {
        domain: { line: { stroke: CHART_GRID_COLOR, strokeWidth: 1 } },
        legend: { text: { fontSize: 12, fontWeight: 'bold', fill: CHART_AXIS_COLOR } },
        ticks: { line: { stroke: CHART_GRID_COLOR, strokeWidth: 0 }, text: { fontSize: 11, fill: CHART_AXIS_COLOR } },
    },
    grid: { line: { stroke: CHART_GRID_COLOR, strokeWidth: 1, strokeDasharray: '3 3' } },
    legends: { text: { fill: CHART_AXIS_COLOR } },
    tooltip: {
        container: {
            background: TOOLTIP_BACKGROUND,
            color: '#fff',
            fontSize: '0.9rem',
            borderRadius: '8px',
            boxShadow: '0 8px 16px rgba(0,0,0,0.5)',
            padding: '12px',
            backdropFilter: 'blur(5px)'
        },
    },
};
