'use client';

import React, { useEffect, useRef } from 'react';

import {AssetNode, demoData} from '@/utils/PortfolioAssetData';

/**
 * SummaryPieChartWithDetails
 * - Tailwind-only styling (no external CSS)
 * - Self-contained SVG sunburst (donut) with hover-to-drill and expanding legend
 * - Works with your own hierarchical data or the included demo
 *
 * Humanized notes:
 *  - The heavy DOM/SVG work runs after mount (client-only) to keep React clean.
 *  - We avoid element IDs and rely on refs so multiple instances can render safely.
 *  - Legend sections auto-expand along the active (hovered) path.
 */

export interface SummaryPieChartWithDetailsProps {
    title?: string;
    data?: AssetNode;
    /** Size of the chart area (square in px). SVG viewBox is 250, this is the rendered box size. */
    chartSizePx?: number; // default 250
    /** Container size (defaults approximate the original 520x350 layout) */
    containerWidthPx?: number; // default 520
    containerHeightPx?: number; // default 350
}

/** Default demo data (feel free to pass your own via props.data) */
export default function SummaryPieChartWithDetails({
   title = 'Assets',
   data = demoData,
   chartSizePx = 250,
   containerHeightPx = 400,
}: SummaryPieChartWithDetailsProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const svgRef = useRef<SVGSVGElement | null>(null);
    const centerRef = useRef<HTMLDivElement | null>(null);
    const legendRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!containerRef.current || !svgRef.current || !centerRef.current || !legendRef.current) return;

        // === Config (mirrors original) ===
        const config = {
            viewBoxSize: 250,
            baseInnerRadius: 55,
            ringHeight: 30,
            expandedRingHeight: 22,
            expansionGap: 5,
            sliceGap: 1.5,
            cornerRadius: 5,
            resetMargin: 15,
            centerBuffer: 15,
        };
        const centerX = config.viewBoxSize / 2;
        const centerY = config.viewBoxSize / 2;

        const container = containerRef.current!;
        const svg = svgRef.current!;
        const centerTextEl = centerRef.current!;
        const legendEl = legendRef.current!;

        // Deep clone data so we can annotate safely
        const root: AssetNode = JSON.parse(JSON.stringify(data));

        let activeNode: AssetNode = root;
        let lastActiveNode: AssetNode = root;

        // --- Helpers ----
        function lightenColor(hex: string | undefined, percent: number) {
            if (!hex) return '#ffffff';
            let h = hex.replace(/^#/, '');

            if (h.length === 3) h = h.replace(/(.)/g, '$1$1');
            let r = parseInt(h.substring(0, 2), 16);
            let g = parseInt(h.substring(2, 4), 16);
            let b = parseInt(h.substring(4, 6), 16);
            const amt = Math.round(2.55 * percent);

            r = Math.min(255, r + amt);
            g = Math.min(255, g + amt);
            b = Math.min(255, b + amt);

            return `#${r.toString(16).padStart(2, '0')}${g
                .toString(16)
                .padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        }

        function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
            const rad = ((angleDeg - 90) * Math.PI) / 180;

            return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
        }

        function describeFlatSidedArc(
            x: number,
            y: number,
            rInner: number,
            rOuter: number,
            startAngle: number,
            endAngle: number,
            gapDegrees: number
        ) {
            const totalAngleSpan = endAngle - startAngle;
            const gap = totalAngleSpan > gapDegrees && totalAngleSpan < 359.99 ? gapDegrees : 0;
            const effectiveStart = startAngle + gap / 2;
            const effectiveEnd = endAngle - gap / 2;
            const angleSpan = effectiveEnd - effectiveStart;

            if (angleSpan <= 0) return '';

            const maxCrFromThickness = (rOuter - rInner) / 2;
            const maxCrFromAngle = rInner > 0 ? rInner * Math.tan(((angleSpan / 2) * Math.PI) / 180) : 0;
            const cr = Math.min(config.cornerRadius, maxCrFromThickness, maxCrFromAngle);

            if (cr <= 0.1) {
                const p1 = polarToCartesian(x, y, rOuter, effectiveStart);
                const p2 = polarToCartesian(x, y, rOuter, effectiveEnd);
                const p3 = polarToCartesian(x, y, rInner, effectiveEnd);
                const p4 = polarToCartesian(x, y, rInner, effectiveStart);
                const large = angleSpan <= 180 ? '0' : '1';

                return `M ${p1.x} ${p1.y} A ${rOuter} ${rOuter} 0 ${large} 1 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${rInner} ${rInner} 0 ${large} 0 ${p4.x} ${p4.y} Z`;
            }

            const outerAngleOffset = (Math.asin(cr / rOuter) * 180) / Math.PI || 0;
            const innerAngleOffset = (Math.asin(cr / rInner) * 180) / Math.PI || 0;
            const outerArcStart = polarToCartesian(x, y, rOuter, effectiveStart + outerAngleOffset);
            const outerArcEnd = polarToCartesian(x, y, rOuter, effectiveEnd - outerAngleOffset);
            const innerArcStart = polarToCartesian(x, y, rInner, effectiveStart + innerAngleOffset);
            const innerArcEnd = polarToCartesian(x, y, rInner, effectiveEnd - innerAngleOffset);
            const lineStartOuter = polarToCartesian(x, y, rOuter - cr, effectiveStart);
            const lineStartInner = polarToCartesian(x, y, rInner + cr, effectiveStart);
            const lineEndOuter = polarToCartesian(x, y, rOuter - cr, effectiveEnd);
            const lineEndInner = polarToCartesian(x, y, rInner + cr, effectiveEnd);
            const large = angleSpan <= 180 ? '0' : '1';

            return [
                'M',
                outerArcStart.x,
                outerArcStart.y,
                'A',
                rOuter,
                rOuter,
                0,
                large,
                1,
                outerArcEnd.x,
                outerArcEnd.y,
                'A',
                cr,
                cr,
                0,
                0,
                1,
                lineEndOuter.x,
                lineEndOuter.y,
                'L',
                lineEndInner.x,
                lineEndInner.y,
                'A',
                cr,
                cr,
                0,
                0,
                1,
                innerArcEnd.x,
                innerArcEnd.y,
                'A',
                rInner,
                rInner,
                0,
                large,
                0,
                innerArcStart.x,
                innerArcStart.y,
                'A',
                cr,
                cr,
                0,
                0,
                1,
                lineStartInner.x,
                lineStartInner.y,
                'L',
                lineStartOuter.x,
                lineStartOuter.y,
                'A',
                cr,
                cr,
                0,
                0,
                1,
                outerArcStart.x,
                outerArcStart.y,
                'Z',
            ].join(' ');
        }

        function formatCurrency(v: number) {
            return v >= 1000 ? `$${(v / 1000).toFixed(1)}K` : `$${v.toFixed(0)}`;
        }

        function isInActivePath(node: AssetNode) {
            let cur: AssetNode | undefined | null = activeNode;

            while (cur) {
                if (cur === node) return true;
                cur = cur.parent;
            }

            return false;
        }

        function processData(node: AssetNode, parent: AssetNode | null = null, depth = 0) {
            node.parent = parent;
            node.depth = depth;
            if (parent) {
                if (depth === 2) node.color = lightenColor(parent.color, 15);
                else if (depth === 3) node.color = lightenColor(parent.color, 25);
            }
            node.children?.forEach((c) => processData(c, node, depth + 1));
        }

        function createClipPath(defs: SVGDefsElement, id: string, rInner: number, rOuter: number) {
            const clipPath = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');

            clipPath.setAttribute('id', id);
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const outerCircle = `M ${centerX - rOuter},${centerY} a ${rOuter},${rOuter} 0 1,0 ${rOuter * 2},0 a ${rOuter},${rOuter} 0 1,0 -${rOuter * 2},0 Z`;
            const innerCircle = `M ${centerX - rInner},${centerY} a ${rInner},${rInner} 0 1,0 ${rInner * 2},0 a ${rInner},${rInner} 0 1,0 -${rInner * 2},0 Z`;

            path.setAttribute('d', outerCircle + ' ' + innerCircle);
            path.setAttribute('clip-rule', 'evenodd');
            clipPath.appendChild(path);
            defs.appendChild(clipPath);
        }

        // ---- Rendering ----
        function renderChart() {
            svg.innerHTML = '';
            const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');

            svg.appendChild(defs);

            const activePath: AssetNode[] = [];
            let cur: AssetNode | null | undefined = activeNode;

            while (cur) {
                activePath.unshift(cur);
                cur = cur.parent;
            }

            // L1
            const l1ClipId = 'clip-l1';

            createClipPath(defs, l1ClipId, config.baseInnerRadius, config.baseInnerRadius + config.ringHeight);
            drawLayer(root, 0, 360, false, l1ClipId);

            // Expanded deeper layers
            let startAngle = 0;
            let endAngle = 360;

            for (let i = 1; i < activePath.length; i++) {
                const node = activePath[i];
                const parent = activePath[i - 1];
                let angleOffset = startAngle;
                const parentSpan = endAngle - startAngle;

                parent.children?.forEach((sibling) => {
                    const span = (sibling.value / parent.value) * parentSpan;

                    if (sibling === node) {
                        startAngle = angleOffset;
                        endAngle = angleOffset + span;
                    }
                    angleOffset += span;
                });

                const childDepth = (node.depth ?? 0) + 1;
                const rInner =
                    config.baseInnerRadius +
                    config.ringHeight +
                    (childDepth - 2) * (config.expandedRingHeight + config.expansionGap) +
                    config.expansionGap;
                const rOuter = rInner + config.expandedRingHeight;
                const clipId = `clip-l${childDepth}`;

                createClipPath(defs, clipId, rInner, rOuter);
                const shouldAnimate = (node.depth ?? 0) > (lastActiveNode.depth ?? 0);

                drawLayer(node, startAngle, endAngle, shouldAnimate, clipId);
            }

            updateInfo();
        }

        function drawLayer(parentNode: AssetNode, startAngle: number, endAngle: number, isAnimated: boolean, clipPathId: string) {
            if (!parentNode.children) return;
            let currentAngle = startAngle;
            const total = parentNode.value;

            parentNode.children.forEach((child) => {
                const span = (child.value / total) * (endAngle - startAngle);
                let rInner: number, rOuter: number;

                if ((child.depth ?? 0) === 1) {
                    rInner = config.baseInnerRadius;
                    rOuter = config.baseInnerRadius + config.ringHeight;
                } else {
                    const prevOuter =
                        config.baseInnerRadius +
                        config.ringHeight +
                        ((child.depth ?? 0) - 2) * (config.expandedRingHeight + config.expansionGap) +
                        config.expansionGap;

                    rInner = prevOuter;
                    rOuter = prevOuter + config.expandedRingHeight;
                }

                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

                path.setAttribute(
                    'd',
                    describeFlatSidedArc(centerX, centerY, rInner, rOuter, currentAngle, currentAngle + span, config.sliceGap)
                );
                path.setAttribute('fill', child.color || '#999');
                path.style.transition = 'opacity 0.3s ease, transform 0.5s cubic-bezier(0.16,1,0.3,1)';
                (path.style as any).transformOrigin = `${centerX}px ${centerY}px`;
                if (clipPathId) path.setAttribute('clip-path', `url(#${clipPathId})`);

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
                currentAngle += span;
            });
        }

        function updateInfo() {
            const name = activeNode === root ? 'Total' : activeNode.name;
            const val = formatCurrency(activeNode.value);
            const col = (activeNode.depth ?? 0) > 0 ? activeNode.color || '#fff' : '#fff';

            // Center label
            centerTextEl.innerHTML = `
        <span class="text-[12px] font-medium text-[#B0B0B0] mb-[2px]">${name}</span>
        <span class="text-[18px] font-semibold" style="color:${col}">${val}</span>
      `;

            // Legend
            legendEl.innerHTML = '';
            const brokers = root.children || [];
            const total = root.value;

            brokers.forEach((broker) => {
                const percentage = ((broker.value / total) * 100).toFixed(0);
                const isActive = isInActivePath(broker);
                const isHighlight = activeNode === broker;

                const brokerItem = document.createElement('div');

                brokerItem.className = [
                    'flex items-center mb-3 text-sm transition-colors transition-opacity',
                    isActive ? 'text-white' : 'text-[#B0B0B0]',
                    isHighlight ? 'font-bold' : 'font-semibold',
                ].join(' ');

                const marker = document.createElement('div');

                marker.className = 'w-2 h-2 rounded-full mr-2';
                marker.style.border = `2px solid ${broker.color || '#999'}`;
                marker.style.backgroundColor = broker.color || '#999';

                const nameEl = document.createElement('div');

                nameEl.className = 'flex-1';
                nameEl.textContent = broker.name;

                const pctEl = document.createElement('div');

                pctEl.className = 'font-medium';
                pctEl.textContent = `${percentage}%`;

                brokerItem.appendChild(marker);
                brokerItem.appendChild(nameEl);
                brokerItem.appendChild(pctEl);
                legendEl.appendChild(brokerItem);

                const brokerDetails = document.createElement('div');

                brokerDetails.className =
                    'ml-2 pl-2 border-l border-[#444] max-h-0 overflow-hidden opacity-0 transition-[max-height,opacity] duration-300 ease-in-out';
                if (isActive) brokerDetails.className += ' max-h-[300px] opacity-100';

                (broker.children || []).forEach((category) => {
                    const catPct = ((category.value / broker.value) * 100).toFixed(0);
                    const catActive = isInActivePath(category);
                    const catHighlight = activeNode === category;

                    const catItem = document.createElement('div');

                    catItem.className = [
                        'flex items-center mb-2 text-[13px] transition-colors',
                        catActive ? 'text-white' : 'text-[#B0B0B0]',
                        catHighlight ? 'font-bold' : '',
                    ].join(' ');

                    const catName = document.createElement('div');

                    catName.className = 'flex-1';
                    catName.textContent = category.name;

                    const catPctEl = document.createElement('div');

                    catPctEl.className = 'font-medium';
                    catPctEl.textContent = `${catPct}%`;

                    catItem.appendChild(catName);
                    catItem.appendChild(catPctEl);
                    brokerDetails.appendChild(catItem);

                    const catDetails = document.createElement('div');

                    catDetails.className =
                        'ml-2 pl-2 border-l border-[#444] max-h-0 overflow-hidden opacity-0 transition-[max-height,opacity] duration-300 ease-in-out';
                    if (catActive) catDetails.className += ' max-h-[300px] opacity-100';

                    (category.children || []).forEach((coin) => {
                        const coinPct = ((coin.value / category.value) * 100).toFixed(0);
                        const coinActive = activeNode === coin;

                        const coinItem = document.createElement('div');

                        coinItem.className = [
                            'flex items-center mb-1 text-[12px]',
                            coinActive ? 'font-bold text-white' : 'text-[#B0B0B0]',
                        ].join(' ');

                        const coinName = document.createElement('div');

                        coinName.className = 'flex-1';
                        coinName.textContent = coin.name;

                        const coinPctEl = document.createElement('div');

                        coinPctEl.className = 'font-medium';
                        coinPctEl.textContent = `${coinPct}%`;

                        coinItem.appendChild(coinName);
                        coinItem.appendChild(coinPctEl);
                        catDetails.appendChild(coinItem);
                    });

                    brokerDetails.appendChild(catDetails);
                });

                legendEl.appendChild(brokerDetails);
            });
        }

        function onMouseMove(e: MouseEvent) {
            if (activeNode === root) return;
            const rect = svg.getBoundingClientRect();
            const scaleX = (svg.viewBox.baseVal.width || config.viewBoxSize) / rect.width;
            const scaleY = (svg.viewBox.baseVal.height || config.viewBoxSize) / rect.height;
            const mouseX = (e.clientX - rect.left) * scaleX;
            const mouseY = (e.clientY - rect.top) * scaleY;
            const dx = mouseX - centerX;
            const dy = mouseY - centerY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            let maxOuter = config.baseInnerRadius + config.ringHeight;

            if ((activeNode.depth ?? 0) === 1) maxOuter += config.expansionGap + config.expandedRingHeight;
            else if ((activeNode.depth ?? 0) >= 2) maxOuter += (config.expansionGap + config.expandedRingHeight) * 2;

            if (dist < config.baseInnerRadius - config.centerBuffer || dist > maxOuter + config.resetMargin) {
                lastActiveNode = activeNode;
                activeNode = root;
                renderChart();
            }
        }

        function onMouseLeave() {
            if (activeNode !== root) {
                lastActiveNode = activeNode;
                activeNode = root;
                renderChart();
            }
        }

        // Init
        processData(root);
        renderChart();

        container.addEventListener('mousemove', onMouseMove);
        container.addEventListener('mouseleave', onMouseLeave);

        return () => {
            container.removeEventListener('mousemove', onMouseMove);
            container.removeEventListener('mouseleave', onMouseLeave);
            svg.innerHTML = '';
            legendEl.innerHTML = '';
            centerTextEl.innerHTML = '';
        };
    }, [data]);

    return (
        <div
            ref={containerRef}
            className="bg-dark-gray text-white rounded-lg select-none flex flex-col p-6"
            style={{ width: '100%', height: containerHeightPx }}
        >
            <div className="text-[22px] font-semibold">{title}</div>

            <div className="flex flex-1 items-center justify-between">
                {/* SVG wrapper */}
                <div className="relative shrink-0" style={{ width: chartSizePx, height: chartSizePx }}>
                    <svg ref={svgRef} className="w-full h-full overflow-visible" viewBox="0 0 250 250" />
                    <div
                        ref={centerRef}
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none flex flex-col items-center"
                    />
                </div>

                {/* Legend */}
                <div ref={legendRef} className="flex-1 max-w-[200px] flex flex-col justify-center pl-7" />
            </div>
        </div>
    );
}
