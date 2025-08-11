// ───────────────────────────────────────────────────────────────────────────────
// components/market/tabs/MomentumRotation/SectorsRotationTab.tsx
// ───────────────────────────────────────────────────────────────────────────────
'use client';

import React from 'react';
import { ResponsiveBar } from '@nivo/bar';
import { ResponsiveLine } from '@nivo/line';

import CardHeader from '../../shared/CardHeader';
import NivoTooltip from '../../shared/NivoTooltip';
import { nivoDarkTheme, CHART_AXIS_COLOR } from '../../shared/NivoTheme';

export default function SectorsRotationTab({ data }: { data: any }) {
    const sectorColors = ['#0077b6', '#00b4d8', '#48cae4', '#90e0ef', '#ade8f4', '#caf0f8', '#1b4965'];

    return (
        <div className="grid sectorsGrid">
            <div className="card chartCard">
                <CardHeader infoContent="Ranks sectors by 24h performance." infoTitle="About Sector Performance" title="Sector Performance Ranking (1D)" />
                <div className="chartContainer" style={{ height: 450 }}>
                    <ResponsiveBar
                        axisBottom={{ tickSize: 0, tickPadding: 10, format: (v: number) => `${v.toFixed(1)}%`, legend: '1D Performance (%)', legendPosition: 'middle', legendOffset: 40 }}
                        axisLeft={{ tickSize: 0, tickPadding: 10 }}
                        axisRight={null}
                        axisTop={null}
                        borderRadius={4}
                        colors={({ value }) => (Number(value) > 0 ? '#4CAF50' : '#F44336')}
                        data={data.performance}
                        enableLabel={false}
                        indexBy="sector"
                        keys={['performance1D']}
                        layout="horizontal"
                        margin={{ top: 10, right: 30, bottom: 50, left: 180 }}
                        markers={[{ axis:'x', value:0, lineStyle:{ stroke: CHART_AXIS_COLOR, strokeWidth:1, strokeDasharray:'2 2' } }]}
                        padding={0.4}
                        theme={nivoDarkTheme}
                        tooltip={({ indexValue, value, color }) => (
                            <NivoTooltip>
                                <strong>{String(indexValue)}</strong><br/>
                                <span style={{ color: String(color) }}>1D Performance: {Number(value).toFixed(2)}%</span>
                            </NivoTooltip>
                        )}
                    />
                </div>
            </div>

            <div className="card chartCard">
                <CardHeader infoContent="30-day indexed sector performance." infoTitle="About Sector Rotation" title="Comparative Sector Rotation (30 Days Indexed)" />
                <div className="chartContainer" style={{ height: 450 }}>
                    <ResponsiveLine
                        useMesh
                        axisBottom={{ format: '%b %d', tickValues: 'every 5 days', legend: 'Date (30 Days)', legendOffset: 45, legendPosition: 'middle', tickRotation: -30 }}
                        axisLeft={{ legend: 'Indexed Performance (Base 100)', legendOffset: -50, legendPosition: 'middle' }}
                        axisRight={null}
                        axisTop={null}
                        colors={sectorColors}
                        curve="monotoneX"
                        data={data.timeSeries}
                        enablePoints={false}
                        enableSlices="x"
                        legends={[{ anchor: 'bottom-right', direction: 'column', translateX: 100, itemsSpacing: 5, itemWidth: 80, itemHeight: 20, symbolSize: 12, symbolShape: 'circle' }]}
                        lineWidth={2}
                        margin={{ top: 20, right: 120, bottom: 80, left: 60 }}
                        markers={[{ axis:'y', value:100, lineStyle:{ stroke: CHART_AXIS_COLOR, strokeWidth:1, strokeDasharray:'2 2' }, legend:'Base (100)', textStyle:{ fill: CHART_AXIS_COLOR, fontSize: 10 } }]}
                        sliceTooltip={({ slice }) => (
                            <NivoTooltip>
                                <strong>Date: {slice.points[0].data.xFormatted}</strong>
                                {slice.points.map(p => (
                                    <div key={p.id} style={{ color: p.seriesColor, padding: '3px 0' }}>{p.seriesId}: {p.data.yFormatted}</div>
                                ))}
                            </NivoTooltip>
                        )}
                        theme={nivoDarkTheme}
                        xFormat="time:%Y-%m-%d"
                        xScale={{ type: 'time', format: '%Y-%m-%d', precision: 'day' }}
                        yScale={{ type: 'linear', stacked: false }}
                    />
                </div>
            </div>
        </div>
    );
}
