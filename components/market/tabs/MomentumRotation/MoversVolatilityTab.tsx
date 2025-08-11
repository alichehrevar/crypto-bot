// ───────────────────────────────────────────────────────────────────────────────
// components/market/tabs/MomentumRotation/MoversVolatilityTab.tsx
// ───────────────────────────────────────────────────────────────────────────────
'use client';

import React, { useState } from 'react';
import { ResponsiveScatterPlot } from '@nivo/scatterplot';

import NivoSparkline from '../../shared/NivoSparkline';
import NivoTooltip from '../../shared/NivoTooltip';
import { nivoDarkTheme, CHART_AXIS_COLOR } from '../../shared/NivoTheme';

export default function MoversVolatilityTab({ data }: { data: any }) {
    const [moverView, setMoverView] = useState<'gainers'|'losers'>('gainers');
    const [activeSubTab, setActiveSubTab] = useState<'table'|'chart'>('table');
    const items = moverView === 'gainers' ? data.gainers : data.losers;

    const rVols = data.volatilityScatter.map((d: any) => d.rVol);
    const minR = Math.min(...rVols); const maxR = Math.max(...rVols);
    const sizeFor = (r: number) => { if (maxR===minR) return 5;

 return ((r - minR) / (maxR - minR)) * 20 + 5; };

    const CustomNode = ({ node, x, y, blendMode }: any) => {
        const d = node.data; const size = sizeFor(d.rVol); const color = d.x > 0 ? '#4CAF50' : '#F44336'; const opacity = Math.min(1, d.rVol / 5 + .4);

        return (
            <g transform={`translate(${x},${y})`}>
                <circle fill={color} r={size/2} stroke={node.isHovered ? '#fff' : 'none'} strokeWidth={2} style={{ mixBlendMode: blendMode as any, opacity }} />
            </g>
        );
    };

    return (
        <div className="grid moversGrid">
            <div className="card fullWidth">
                <div className="cardHeader">
                    <div className="cardTitleContainer"><h3 className="cardTitle">Market Movers & Volatility</h3></div>
                    <div className="headerControls">
                        <div className={`moverFilter ${activeSubTab !== 'table' ? 'hidden' : ''}`}>
                            <button aria-label="View Gainers" className={moverView==='gainers'?'active':''} onClick={() => setMoverView('gainers')}>▲</button>
                            <button aria-label="View Losers" className={moverView==='losers'?'active':''} onClick={() => setMoverView('losers')}>▼</button>
                        </div>
                        <div className="subTabs">
                            <button className={`subTabButton ${activeSubTab==='table'?'active':''}`} onClick={() => setActiveSubTab('table')}>Table View</button>
                            <button className={`subTabButton ${activeSubTab==='chart'?'active':''}`} onClick={() => setActiveSubTab('chart')}>Volatility Chart</button>
                        </div>
                    </div>
                </div>

                {activeSubTab === 'table' && (
                    <div className="tableContainer">
                        <table className="dataTable moversTable">
                            <thead>
                            <tr><th>Asset</th><th>Change (%)</th><th>Volume (USD)</th><th>RVOL</th><th>24h trend</th></tr>
                            </thead>
                            <tbody>
                            {items.map((it: any) => (
                                <tr key={it.asset}>
                                    <td>{it.asset}</td>
                                    <td className={it.change>=0?'positive':'negative'}>{it.change.toFixed(2)}%</td>
                                    <td>${(it.volume/1_000_000).toFixed(2)}M</td>
                                    <td>{it.rVol.toFixed(2)}x</td>
                                    <td><NivoSparkline color={it.change>=0?'#4CAF50':'#F44336'} data={it.sparkline} /></td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeSubTab === 'chart' && (
                    <>
                        <div style={{ height: 500 }}>
                            <ResponsiveScatterPlot
                                axisBottom={{ tickSize:5, tickPadding:5, legend:'Price Change (%)', legendPosition:'middle', legendOffset:46, format:(v: number)=>`${v.toFixed(1)}%` }}
                                axisLeft={{ tickSize:5, tickPadding:5, legend:'Volume (USD)', legendPosition:'middle', legendOffset:-70, format:(v: number)=>`${(v/1_000_000).toFixed(0)}M` }}
                                axisRight={null}
                                axisTop={null} data={data.volatilityScatterNivo}
                                margin={{ top: 20, right: 30, bottom: 70, left: 90 }} markers={[{ axis:'x', value:0, lineStyle:{ stroke: CHART_AXIS_COLOR, strokeWidth:1, strokeDasharray:'2 2' } }]}
                                renderNode={CustomNode}
                                theme={nivoDarkTheme} tooltip={({ node }) => (
                                    <NivoTooltip>
                                        <strong>{node.data.asset}</strong><br/>
                                        <span>Change: {Number(node.data.x).toFixed(2)}%</span><br/>
                                        <span>Volume: ${(Number(node.data.y)/1_000_000).toFixed(2)}M</span><br/>
                                        <span>RVOL: {node.data.rVol.toFixed(2)}x</span>
                                    </NivoTooltip>
                                )}
                                xFormat=">-.2f"
                                xScale={{ type: 'linear' }}
                                yFormat={(v: number) => `${(v/1_000_000).toFixed(2)}M`}
                                yScale={{ type: 'linear' }}
                            />
                        </div>
                        <p className="chartNote">X-Axis: Performance | Y-Axis: Volume | Size & Opacity: RVOL</p>
                    </>
                )}
            </div>
        </div>
    );
}
