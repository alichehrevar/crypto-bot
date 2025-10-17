"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- TYPE DEFINITIONS ---
interface AssetNode {
    name: string;
    value: number;
    color?: string;
    children?: AssetNode[];
    parent?: AssetNode | null;
    depth?: number;
}

// --- DATA ---
const brokerAssetData: AssetNode = { name: "Total Holdings", value: 1085000, children: [ { name: "Binance", value: 255000, color: "#30B5D3", children: [ { name: "Spot", value: 90000, children: [ { name: "BTC", value: 55000 }, { name: "ETH", value: 35000 } ] }, { name: "Future", value: 105000, children: [ { name: "SOL-PERP", value: 60000 }, { name: "ADA-PERP", value: 45000 } ] }, { name: "Fund", value: 60000, children: [ { name: "Launchpad", value: 40000 }, { name: "Savings", value: 20000 } ] } ]}, { name: "Kraken", value: 210000, color: "#87D30D", children: [ { name: "Spot", value: 80000, children: [ { name: "XRP", value: 45000 }, { name: "DOT", value: 35000 } ] }, { name: "Future", value: 70000, children: [ { name: "BTC-PERP", value: 50000 }, { name: "LINK-PERP", value: 20000 } ] }, { name: "Fund", value: 60000, children: [ { name: "Staking", value: 40000 }, { name: "Parachain", value: 20000 } ] } ]}, { name: "Coinbase", value: 180000, color: "#E0AC00", children: [ { name: "Spot", value: 100000, children: [ { name: "ETH", value: 60000 }, { name: "USDC", value: 40000 } ] }, { name: "Future", value: 50000, children: [ { name: "ETH-PERP", value: 30000 }, { name: "AVAX-PERP", value: 20000 } ] }, { name: "Fund", value: 30000, children: [ { name: "Vault", value: 20000 }, { name: "Earn", value: 10000 } ] } ]}, { name: "Bybit", value: 240000, color: "#00E0D5", children: [ { name: "Spot", value: 85000, children: [ { name: "USDT", value: 50000 }, { name: "BTC", value: 35000 } ] }, { name: "Future", value: 110000, children: [ { name: "BTC-PERP", value: 70000 }, { name: "ETH-PERP", value: 40000 } ] }, { name: "Fund", value: 45000, children: [ { name: "ByStarter", value: 25000 }, { name: "Pool", value: 20000 } ] } ]}, { name: "OKX", value: 200000, color: "#DDE000", children: [ { name: "Spot", value: 70000, children: [ { name: "OKB", value: 40000 }, { name: "USDT", value: 30000 } ] }, { name: "Future", value: 90000, children: [ { name: "LTC-PERP", value: 50000 }, { name: "DOGE-PERP", value: 40000 } ] }, { name: "Fund", value: 40000, children: [ { name: "Jumpstart", value: 25000 }, { name: "Fixed Income", value: 15000 } ] } ]} ] };

const assetCentricData: AssetNode = {
    name: "Total Assets",
    value: 1085000,
    children: [
        { name: 'BTC', value: 450000, color: '#F7931A', children: [ { name: 'Binance', value: 200000, color: '#30B5D3' }, { name: 'Bybit', value: 150000, color: '#00E0D5' }, { name: 'Kraken', value: 100000, color: '#87D30D' }, ]},
        { name: 'ETH', value: 300000, color: '#627EEA', children: [ { name: 'Coinbase', value: 120000, color: '#E0AC00' }, { name: 'Binance', value: 110000, color: '#30B5D3' }, { name: 'OKX', value: 70000, color: '#DDE000' }, ]},
        { name: 'SOL', value: 150000, color: '#9945FF', children: [ { name: 'Binance', value: 90000, color: '#30B5D3' }, { name: 'OKX', value: 60000, color: '#DDE000' }, ]},
        { name: 'BNB', value: 85000, color: '#F0B90B', children: [ { name: 'Binance', value: 85000, color: '#30B5D3' }, ]},
        { name: 'XRP', value: 50000, color: '#00A3FF', children: [ { name: 'Kraken', value: 50000, color: '#87D30D' }, ]},
        { name: 'ADA', value: 50000, color: '#16D490', children: [ { name: 'Binance', value: 30000, color: '#30B5D3' }, { name: 'Kraken', value: 20000, color: '#87D30D' }, ]}
    ]
};

const AssetsOverview: React.FC = () => {
    const [view, setView] = useState<'broker' | 'asset'>('broker');
    const chartWrapperRef = useRef<HTMLDivElement>(null);
    const componentContainerRef = useRef<HTMLDivElement>(null);

    const drawChart = useCallback((assetData: AssetNode) => {
        const container = chartWrapperRef.current;
        const assetsContainer = componentContainerRef.current;

        if (!container || !assetsContainer) return;

        const config = { viewBoxSize: 250, baseInnerRadius: 55, ringHeight: 30, expandedRingHeight: 22, expansionGap: 5, sliceGap: 1.5, cornerRadius: 5, resetMargin: 15, centerBuffer: 15 };
        const centerX = config.viewBoxSize / 2, centerY = config.viewBoxSize / 2;

        container.innerHTML = `<div class="w-[250px] h-[250px] relative shrink-0"><svg id="chart-svg" class="w-full h-full overflow-visible" viewBox="0 0 250 250"></svg><div id="center-text" class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none flex flex-col items-center"></div></div><div id="legend" class="flex-1 flex flex-row justify-start items-start gap-4"></div>`;
        const svg = container.querySelector<SVGSVGElement>('#chart-svg');
        const centerTextEl = container.querySelector<HTMLDivElement>('#center-text');
        const legendEl = container.querySelector<HTMLDivElement>('#legend');

        if (!svg || !centerTextEl || !legendEl) return;

        let activeNode: AssetNode = assetData;
        let lastActiveNode: AssetNode = assetData;

        const lightenColor = (hex: string, percent: number): string => {
            hex = hex.replace(/^#/, '');
            if (hex.length === 3) hex = hex.replace(/(.)/g, '$1$1');
            let r = parseInt(hex.substring(0, 2), 16), g = parseInt(hex.substring(2, 4), 16), b = parseInt(hex.substring(4, 6), 16);
            const amount = Math.round(2.55 * percent);

            r = Math.min(255, r + amount); g = Math.min(255, g + amount); b = Math.min(255, b + amount);

            return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        };

        const processData = (node: AssetNode, parent: AssetNode | null = null, depth = 0): void => {
            node.parent = parent;
            node.depth = depth;
            if (parent) {
                if (assetData === assetCentricData && depth === 2) {
                    node.color = lightenColor(parent.color!, 15);
                } else if (!node.color) {
                    if (depth === 2) node.color = lightenColor(parent.color!, 15);
                    else if (depth === 3) node.color = lightenColor(parent.color!, 25);
                }
            }
            if (node.children) {
                node.children.forEach(child => processData(child, node, depth + 1));
            }
        };

        const polarToCartesian = (cx: number, cy: number, r: number, angle: number): { x: number, y: number } => {
            const rad = (angle - 90) * Math.PI / 180.0;

            return { x: cx + (r * Math.cos(rad)), y: cy + (r * Math.sin(rad)) };
        };

        const describeFlatSidedArc = (x: number, y: number, rInner: number, rOuter: number, startAngle: number, endAngle: number, gapDegrees: number): string => {
            const totalAngleSpan = endAngle - startAngle;
            const gap = (totalAngleSpan > gapDegrees && totalAngleSpan < 359.99) ? gapDegrees : 0;
            const effectiveStart = startAngle + gap / 2, effectiveEnd = endAngle - gap / 2;
            const angleSpan = effectiveEnd - effectiveStart;

            if (angleSpan <= 0) return "";
            const maxCrFromThickness = (rOuter - rInner) / 2;
            const maxCrFromAngle = rInner > 0 ? rInner * Math.tan((angleSpan / 2) * (Math.PI / 180)) : 0;
            const cr = Math.min(config.cornerRadius, maxCrFromThickness, maxCrFromAngle);

            if (cr <= 0.1) {
                const p1 = polarToCartesian(x, y, rOuter, effectiveStart), p2 = polarToCartesian(x, y, rOuter, effectiveEnd), p3 = polarToCartesian(x, y, rInner, effectiveEnd), p4 = polarToCartesian(x, y, rInner, effectiveStart);

                return `M ${p1.x} ${p1.y} A ${rOuter} ${rOuter} 0 ${angleSpan <= 180 ? "0" : "1"} 1 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${rInner} ${rInner} 0 ${angleSpan <= 180 ? "0" : "1"} 0 ${p4.x} ${p4.y} Z`;
            }
            const oAngle = (Math.asin(cr / rOuter) * 180 / Math.PI) || 0, iAngle = (Math.asin(cr / rInner) * 180 / Math.PI) || 0;
            const oas = polarToCartesian(x, y, rOuter, effectiveStart + oAngle), oae = polarToCartesian(x, y, rOuter, effectiveEnd - oAngle);
            const ias = polarToCartesian(x, y, rInner, effectiveStart + iAngle), iae = polarToCartesian(x, y, rInner, effectiveEnd - iAngle);
            const lso = polarToCartesian(x, y, rOuter - cr, effectiveStart), lsi = polarToCartesian(x, y, rInner + cr, effectiveStart);
            const leo = polarToCartesian(x, y, rOuter - cr, effectiveEnd), lei = polarToCartesian(x, y, rInner + cr, effectiveEnd);

            return [ "M", oas.x, oas.y, "A", rOuter, rOuter, 0, angleSpan <= 180 ? "0" : "1", 1, oae.x, oae.y, "A", cr, cr, 0, 0, 1, leo.x, leo.y, "L", lei.x, lei.y, "A", cr, cr, 0, 0, 1, iae.x, iae.y, "A", rInner, rInner, 0, angleSpan <= 180 ? "0" : "1", 0, ias.x, ias.y, "A", cr, cr, 0, 0, 1, lsi.x, lsi.y, "L", lso.x, lso.y, "A", cr, cr, 0, 0, 1, oas.x, oas.y, "Z" ].join(" ");
        };

        const formatCurrency = (v: number): string => v >= 1000 ? `$${(v/1000).toFixed(1)}K` : `$${v.toFixed(0)}`;

        const createClipPath = (defs: SVGDefsElement, id: string, rInner: number, rOuter: number): void => {
            const cp = document.createElementNS("http://www.w3.org/2000/svg", "clipPath");

            cp.id = id;
            const sh = document.createElementNS("http://www.w3.org/2000/svg", "path");
            const o = `M ${centerX-rOuter},${centerY} a ${rOuter},${rOuter} 0 1,0 ${rOuter*2},0 a ${rOuter},${rOuter} 0 1,0 -${rOuter*2},0 Z`;
            const i = `M ${centerX-rInner},${centerY} a ${rInner},${rInner} 0 1,0 ${rInner*2},0 a ${rInner},${rInner} 0 1,0 -${rInner*2},0 Z`;

            sh.setAttribute("d", o + " " + i);
            sh.setAttribute("clip-rule", "evenodd");
            cp.appendChild(sh);
            defs.appendChild(cp);
        };

        const renderChart = () => {
            svg.innerHTML = '';
            const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");

            svg.appendChild(defs);
            const activePath: AssetNode[] = [];
            let cn: AssetNode | null | undefined = activeNode;

            while(cn) { activePath.unshift(cn); cn = cn.parent; }

            const l1ClipId = 'clip-l1';

            createClipPath(defs, l1ClipId, config.baseInnerRadius, config.baseInnerRadius + config.ringHeight);
            drawLayer(assetData, 0, 360, false, l1ClipId);

            let sa = 0, ea = 360;

            for (let i = 1; i < activePath.length; i++) {
                const node = activePath[i], parent = activePath[i-1];
                let ao = sa;
                const pa = ea - sa;

                parent.children?.forEach(sib => {
                    const s = (sib.value / parent.value) * pa;

                    if(sib === node) { sa = ao; ea = ao + s; }
                    ao += s;
                });
                const cd = (node.depth || 0) + 1;
                const rIn = config.baseInnerRadius + config.ringHeight + (cd - 2) * (config.expandedRingHeight + config.expansionGap) + config.expansionGap;
                const rOut = rIn + config.expandedRingHeight;
                const clipId = `clip-l${cd}`;

                createClipPath(defs, clipId, rIn, rOut);
                drawLayer(node, sa, ea, (node.depth || 0) > (lastActiveNode.depth || 0), clipId);
            }
            updateInfo();
        };

        const drawLayer = (parentNode: AssetNode, startAngle: number, endAngle: number, isAnimated: boolean, clipPathId: string) => {
            if (!parentNode.children) return;
            let currentAngle = startAngle;
            const totalValue = parentNode.value;

            parentNode.children.forEach(child => {
                const angleSpan = (child.value / totalValue) * (endAngle - startAngle);
                const rInner = config.baseInnerRadius + config.ringHeight + ((child.depth || 0) - 2) * (config.expandedRingHeight + config.expansionGap) + config.expansionGap;
                const rOuter = rInner + config.expandedRingHeight;

                const path = document.createElementNS("http://www.w3.org/2000/svg", "path");

                path.setAttribute("d", describeFlatSidedArc(centerX, centerY, child.depth === 1 ? config.baseInnerRadius : rInner, child.depth === 1 ? config.baseInnerRadius + config.ringHeight : rOuter, currentAngle, currentAngle + angleSpan, config.sliceGap));
                path.setAttribute("fill", child.color || '#ccc');
                path.setAttribute("class", "arc");
                path.style.transition = 'opacity 0.3s ease, transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
                path.style.transformOrigin = `${centerX}px ${centerY}px`;
                path.style.cursor = 'pointer';

                if (clipPathId) path.setAttribute("clip-path", `url(#${clipPathId})`);

                if (isAnimated) {
                    path.style.opacity = '0';
                    path.style.transform = 'scale(0.95)';
                    requestAnimationFrame(() => {
                        path.style.opacity = '1';
                        path.style.transform = 'scale(1)';
                    });
                }

                path.addEventListener('mouseenter', () => {
                    if (child !== activeNode) {
                        lastActiveNode = activeNode;
                        activeNode = child;
                        renderChart();
                    }
                });
                svg.appendChild(path);
                currentAngle += angleSpan;
            });
        };

        const updateInfo = () => {
            const name = activeNode === assetData ? assetData.name : activeNode.name;
            const value = formatCurrency(activeNode.value);
            const color = (activeNode.depth || 0) > 0 ? activeNode.color : 'var(--color-text-primary)';

            centerTextEl.innerHTML = `<span class="text-xs font-medium text-gray-400 mb-0.5">${name}</span><span class="text-lg font-semibold transition-colors" style="color: ${color};">${value}</span>`;
            legendEl.innerHTML = '';

            const activePath: AssetNode[] = [];
            let currentNode: AssetNode | null | undefined = activeNode;

            while(currentNode) {
                activePath.unshift(currentNode);
                currentNode = currentNode.parent;
            }

            const renderColumn = (nodes: AssetNode[], parentValue: number, highlightNode: AssetNode | null) => {
                const colDiv = document.createElement('div');

                colDiv.className = 'flex flex-col gap-1';
                if (legendEl.children.length > 0) {
                    colDiv.style.paddingLeft = '16px';
                    colDiv.style.borderLeft = '1px solid #333';
                }
                nodes.forEach(node => {
                    const percentage = ((node.value / parentValue) * 100).toFixed(0);
                    const itemEl = document.createElement('div');

                    itemEl.className = `flex items-center text-sm p-1 px-2 rounded-md transition-all whitespace-nowrap ${activePath.includes(node) ? 'text-white' : 'text-gray-400'} ${highlightNode === node ? 'font-semibold text-white bg-[#333]' : ''}`;
                    itemEl.innerHTML = `<div class="w-2 h-2 rounded-full mr-2.5 shrink-0" style="background-color:${node.color};"></div><div class="flex-grow">${node.name}</div><div class="font-medium ml-3">${percentage}%</div>`;
                    colDiv.appendChild(itemEl);
                });

                return colDiv;
            };

            for (let i = 0; i < activePath.length; i++) {
                const parentNode = activePath[i];

                if (parentNode.children && parentNode.children.length > 0) {
                    const highlightNode = activePath[i+1] || ((activeNode.depth || 0) > (parentNode.depth || 0) ? activeNode : null);

                    legendEl.appendChild(renderColumn(parentNode.children, parentNode.value, highlightNode));
                }
            }
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (activeNode === assetData) return;
            const rect = svg.getBoundingClientRect();
            const scaleX = svg.viewBox.baseVal.width / rect.width;
            const scaleY = svg.viewBox.baseVal.height / rect.height;
            const mouseX = (e.clientX - rect.left) * scaleX;
            const mouseY = (e.clientY - rect.top) * scaleY;
            const dx = mouseX - centerX;
            const dy = mouseY - centerY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            let maxR = config.baseInnerRadius + config.ringHeight;

            if ((activeNode.depth || 0) === 1) maxR += config.expansionGap + config.expandedRingHeight;
            else if ((activeNode.depth || 0) >= 2) maxR += (config.expansionGap + config.expandedRingHeight) * 2;
            if (dist < config.baseInnerRadius - config.centerBuffer || dist > maxR + config.resetMargin) {
                lastActiveNode = activeNode;
                activeNode = assetData;
                renderChart();
            }
        };

        const handleMouseLeave = () => {
            if (activeNode !== assetData) {
                lastActiveNode = activeNode;
                activeNode = assetData;
                renderChart();
            }
        };

        assetsContainer.addEventListener('mousemove', handleMouseMove);
        assetsContainer.addEventListener('mouseleave', handleMouseLeave);

        processData(assetData);
        renderChart();

        // Cleanup function
        return () => {
            assetsContainer.removeEventListener('mousemove', handleMouseMove);
            assetsContainer.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, []);

    useEffect(() => {
        const data = view === 'broker' ? brokerAssetData : assetCentricData;
        const cleanup = drawChart(data);

        return cleanup;
    }, [view, drawChart]);

    return (
        <div ref={componentContainerRef} className="ua-card p-6 w-full text-white">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full mb-4 gap-4 sm:gap-0">
                <h4 className="font-bold text-lg">Assets</h4>
                <div className="inline-flex">
                    <div className="flex p-1 gap-1 items-center h-8 rounded-lg bg-[#0A0908]">
                        <button
                            className={`py-1 px-3 flex justify-center items-center cursor-pointer outline-none rounded-md text-sm font-medium transition-all ${view === 'broker' ? 'bg-white text-[#0A0908] shadow-sm' : 'bg-transparent text-gray-400'}`}
                            onClick={() => setView('broker')}
                        >
                            By Broker
                        </button>
                        <button
                            className={`py-1 px-3 flex justify-center items-center cursor-pointer outline-none rounded-md text-sm font-medium transition-all ${view === 'asset' ? 'bg-white text-[#0A0908] shadow-sm' : 'bg-transparent text-gray-400'}`}
                            onClick={() => setView('asset')}
                        >
                            By Asset
                        </button>
                    </div>
                </div>
            </div>
            <div ref={chartWrapperRef} className="assets-chart-body mt-4 flex flex-col sm:flex-row flex-1 relative items-center justify-start gap-6">
                {/* Chart and Legend will be rendered here */}
            </div>
        </div>
    );
};

export default AssetsOverview;
