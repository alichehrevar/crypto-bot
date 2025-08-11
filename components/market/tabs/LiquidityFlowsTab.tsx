// ───────────────────────────────────────────────────────────────────────────────
// components/market/tabs/LiquidityFlowsTab.tsx
// ───────────────────────────────────────────────────────────────────────────────
'use client';

import React from 'react';
import { ResponsiveLine } from '@nivo/line';
import { ResponsiveBar } from '@nivo/bar';

import CardHeader from '../shared/CardHeader';
import NivoTooltip from '../shared/NivoTooltip';
import { nivoDarkTheme, CHART_AXIS_COLOR } from '../shared/NivoTheme';

export default function LiquidityFlowsTab({ data }: { data: any }) {
    const NetFlowKpi = ({ title, value }: { title: string; value: number }) => (
        <div className="kpiBox"><span className="kpiTitle">{title}</span><span className={`kpiValue ${value>=0?'positive':'negative'}`}>{value>=0?'+':''}${Math.abs(value).toFixed(2)}M</span></div>
    );

    const { currentPrice, nivoData } = data.orderBook;
    const minPrice = nivoData[0].data[0].x;
    const maxPrice = nivoData[1].data[nivoData[1].data.length-1].x;
    const pr = Math.max(currentPrice - minPrice, maxPrice - currentPrice);
    const xDomain = [currentPrice - pr*1.05, currentPrice + pr*1.05];

    return (
        <div className="grid liquidityGrid">
            <div className="card fullWidth chartCard">
                <CardHeader infoContent="Cumulative bids/asks around current price." infoTitle="About Order Book Depth" title="Aggregated Order Book Depth (Simulated BTC)" />
                <div className="chartContainer" style={{ height: 400 }}>
                    <ResponsiveLine
                        enableArea
                        useMesh
                        areaOpacity={0.25}
                        axisBottom={{ legend:'Price (USD)', legendPosition:'middle', legendOffset:45, format:(p: number)=>`$${(p/1000).toFixed(1)}k` }}
                        axisLeft={{ legend:'Cumulative Depth', legendPosition:'middle', legendOffset:-50 }}
                        colors={(d: any) => d.color}
                        curve="step"
                        data={nivoData}
                        enablePoints={false}
                        lineWidth={1}
                        margin={{ top: 20, right: 60, bottom: 60, left: 60 }}
                        theme={nivoDarkTheme} tooltip={({ point }) => (
                            <NivoTooltip>
                                <strong style={{ color: point.color as string }}>{point.seriesId}</strong><br/>
                                <span>Price: ${Number(point.data.x).toFixed(2)}</span><br/>
                                <span>Depth: {Number(point.data.y).toFixed(2)}</span>
                            </NivoTooltip>
                        )}
                        xScale={{ type: 'linear', min: xDomain[0], max: xDomain[1] }}
                        yScale={{ type: 'linear', min: 0, max: 'auto' }}
                    />
                </div>
            </div>

            <div className="card chartCard">
                <CardHeader infoContent="In/Out flows over the last week." infoTitle="About Net Flows" title="Exchange & Stablecoin Net Flows (On-Chain)" />
                <div className="kpiContainer" style={{ justifyContent:'center', marginTop:'1rem' }}>
                    <NetFlowKpi title="24h Stablecoin Net Flow" value={data.netFlows.stablecoinNetFlow24h} />
                    <NetFlowKpi title="24h Exchange Net Flow" value={data.netFlows.exchangeNetFlow24h} />
                </div>
                <div className="chartContainer" style={{ height: 300, marginTop: '1.5rem' }}>
                    <ResponsiveBar
                        axisBottom={{ tickSize: 0, tickPadding: 10 }}
                        axisLeft={{ format: (v: number) => `${Math.abs(v)}M` }}
                        borderRadius={3}
                        colors={({ id }) => (String(id)==='inflow' ? '#4CAF50' : '#F44336')}
                        data={data.netFlows.history}
                        enableLabel={false}
                        indexBy="day"
                        keys={['inflow','outflow']}
                        margin={{ top: 30, right: 20, bottom: 50, left: 60 }}
                        markers={[{ axis:'y', value:0, lineStyle:{ stroke: CHART_AXIS_COLOR, strokeWidth:2 } }]}
                        padding={0.4}
                        theme={nivoDarkTheme}
                        tooltip={({ indexValue, value, id, color }) => (
                            <NivoTooltip>
                                <strong>{String(indexValue)} - {String(id)}</strong><br/>
                                <span style={{ color: String(color) }}>Amount: ${Math.abs(Number(value)).toFixed(2)}M</span>
                            </NivoTooltip>
                        )}
                    />
                </div>
            </div>

            <div className="card">
                <CardHeader infoContent="Impact of order size vs liquidity class." infoTitle="About Slippage" title="Estimated Slippage Calculator" />
                <table className="dataTable">
                    <thead><tr><th>Asset type</th><th>$1k order slippage</th><th>$100k order slippage</th></tr></thead>
                    <tbody>
                    {data.slippageMetrics.map((it: any) => (
                        <tr key={it.asset}>
                            <td>{it.asset}</td>
                            <td>{it.slippage1k.toFixed(2)}%</td>
                            <td className={it.slippage100k > 5 ? 'negative' : (it.slippage100k > 1 ? 'highImpact' : '')}>{it.slippage100k.toFixed(2)}%</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
