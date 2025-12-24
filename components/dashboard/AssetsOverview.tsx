"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

import { getData } from "@/actions/get";

type ViewMode = "broker" | "asset";

/* ---------- TYPES ---------- */
interface AssetNode {
    name: string;
    value: number;
    color?: string;
    amount?: number;
    children?: AssetNode[];
    parent?: AssetNode | null;
    depth?: number;
}

interface SnapshotTodayFull {
    data: {
        brokerTree: AssetNode;
        assetTree: AssetNode;
        balances: { binance: number; okx: number; bingx: number };
        total: number;
    },
    success: boolean,
    message: string,
}

/* ---------- CONFIGURATION ---------- */

// 1. MAPPING DICTIONARY: Maps DB names to UI names
const RENAME_MAP: Record<string, string> = {
    "Earn": "Funding",
    "Other": "Coin-M",
    "Futures": "USDT-M",
    "Spot": "Spot",
    "Margin": "Margin",
    "Funding": "Funding"
};

/* ---------- HELPERS ---------- */

function sanitizeNumber(n: any): number {
    const v = Number(n);

    return Number.isFinite(v) ? v : 0;
}

function buildBrokerColorMap(brokerTree?: AssetNode | null): Record<string, string> {
    const map: Record<string, string> = {};

    if (!brokerTree?.children) return map;
    for (const b of brokerTree.children) {
        if (b?.name && b?.color) map[b.name] = b.color;
    }

    return map;
}

/** * Pivots a Broker-centric tree (Total -> Broker -> Account -> Asset)
 * into an Asset-centric tree (Total -> Asset -> Broker).
 * This acts as a fallback if the API sends an empty assetTree.
 */
function pivotBrokerToAssetTree(brokerRoot: AssetNode): AssetNode | null {
    if (!brokerRoot || !brokerRoot.children) return null;

    const assetMap = new Map<string, { value: number; brokers: Map<string, number>; color?: string }>();
    const brokerColors: Record<string, string> = {};

    // Traverse logic slightly adjusted: The root is Total, children are Brokers
    if (brokerRoot.children) {
        brokerRoot.children.forEach(broker => {
            brokerColors[broker.name] = broker.color || "#888";
            if(broker.children) {
                broker.children.forEach(account => {
                    // If accounts have children (actual assets), recurse
                    if (account.children && account.children.length > 0) {
                        account.children.forEach(asset => {
                            const name = asset.name;

                            if (!assetMap.has(name)) assetMap.set(name, { value: 0, brokers: new Map() });
                            const entry = assetMap.get(name)!;

                            entry.value += asset.value;
                            entry.brokers.set(broker.name, (entry.brokers.get(broker.name) || 0) + asset.value);
                        });
                    }
                    // If accounts ARE the leaves (as in your JSON snippet), we pivot on Account Type
                    else if (account.value > 0) {
                        const name = RENAME_MAP[account.name] || account.name;

                        if (!assetMap.has(name)) assetMap.set(name, { value: 0, brokers: new Map() });
                        const entry = assetMap.get(name)!;

                        entry.value += account.value;
                        entry.brokers.set(broker.name, (entry.brokers.get(broker.name) || 0) + account.value);
                    }
                });
            }
        });
    }

    if (assetMap.size === 0) return null;

    // 2. Build Asset Tree
    const children: AssetNode[] = [];

    assetMap.forEach((data, assetName) => {
        const brokerChildren: AssetNode[] = [];

        data.brokers.forEach((val, brokerName) => {
            brokerChildren.push({
                name: brokerName,
                value: val,
                color: brokerColors[brokerName],
                children: []
            });
        });

        children.push({
            name: assetName,
            value: data.value,
            children: brokerChildren
        });
    });

    // Sort by value desc
    children.sort((a, b) => b.value - a.value);

    return {
        name: "Total Assets",
        value: brokerRoot.value,
        children: children
    };
}


/** * Normalizes tree: removes zero values, sums children, and APPLIES RENAMING
 */
function normalizeTree(root: AssetNode): AssetNode | null {
    function walk(n: AssetNode): AssetNode | null {
        // 2. APPLY RENAMING HERE
        const originalName = String(n.name ?? "");
        const mappedName = RENAME_MAP[originalName] || originalName;

        const out: AssetNode = {
            name: mappedName,
            value: 0,
            color: n.color,
            amount: sanitizeNumber(n.amount),
            children: [],
        };

        const kids = Array.isArray(n.children) ? n.children : [];
        const cleanedKids: AssetNode[] = [];

        for (const ch of kids) {
            const c = walk(ch);

            if (!c) continue;
            const v = sanitizeNumber(c.value);

            if (v <= 0) continue;
            cleanedKids.push(c);
        }

        if (cleanedKids.length) {
            const sum = cleanedKids.reduce((s, c) => s + sanitizeNumber(c.value), 0);

            out.value = +sum.toFixed(8);
            out.children = cleanedKids;
        } else {
            out.value = sanitizeNumber(n.value);
            if (out.value <= 0) return null;
            out.children = [];
        }

        return out;
    }

    return walk(root);
}

/* ---------- COMPONENT ---------- */
const AssetsOverview: React.FC = () => {
    const [view, setView] = useState<ViewMode>("broker");
    const [brokerData, setBrokerData] = useState<AssetNode | null>(null);
    const [assetData, setAssetData] = useState<AssetNode | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const chartWrapperRef = useRef<HTMLDivElement>(null);
    const componentContainerRef = useRef<HTMLDivElement>(null);

    /* -------- Fetch REAL data from API -------- */
    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                setLoading(true);
                setError(null);

                const res: SnapshotTodayFull = await getData('/asset/today/full');

                if (res.success) {
                    // 1. Process Broker Tree (with Renaming)
                    const safeBroker = normalizeTree(res.data.brokerTree);

                    // 2. Process Asset Tree
                    let safeAsset = normalizeTree(res.data.assetTree);

                    // 3. Fallback: If Asset Tree is empty (value 0), try to pivot the Broker Tree
                    if (!safeAsset && safeBroker) {
                        safeAsset = pivotBrokerToAssetTree(safeBroker);
                    } else if (safeAsset) {
                        // Apply colors if we used the API tree
                        const brokerColorMap = buildBrokerColorMap(safeBroker);

                        // Helper to apply colors deep in asset tree
                        const applyColors = (node: AssetNode, depth = 0) => {
                            if(depth === 2 && node.name && brokerColorMap[node.name]) {
                                node.color = brokerColorMap[node.name];
                            }
                            if(node.children) node.children.forEach(c => applyColors(c, depth + 1));
                        };

                        applyColors(safeAsset);
                    }

                    if (!cancelled) {
                        setBrokerData(safeBroker || null);
                        setAssetData(safeAsset || null);

                        if (!safeBroker) {
                            setError("No balance data available.");
                        }
                    }
                }
            } catch (e: any) {
                if (!cancelled) setError(e?.message || "Failed to load assets.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    /* -------- Chart renderer -------- */
    const drawChart = useCallback((dataToRender: AssetNode) => {
        const container = chartWrapperRef.current;
        const assetsContainer = componentContainerRef.current;

        if (!container || !assetsContainer || !dataToRender) return;

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
        const centerX = config.viewBoxSize / 2,
            centerY = config.viewBoxSize / 2;

        container.innerHTML = `
      <div class="w-[250px] h-[250px] relative shrink-0">
        <svg id="chart-svg" class="w-full h-full overflow-visible" viewBox="0 0 250 250"></svg>
        <div id="center-text" class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none flex flex-col items-center"></div>
      </div>
      <div id="legend" class="flex-1 flex flex-row justify-start items-start gap-4 overflow-y-auto max-h-[250px] custom-scrollbar"></div>
    `;

        const svg = container.querySelector<SVGSVGElement>("#chart-svg");
        const centerTextEl = container.querySelector<HTMLDivElement>("#center-text");
        const legendEl = container.querySelector<HTMLDivElement>("#legend");

        if (!svg || !centerTextEl || !legendEl) return;

        let activeNode: AssetNode = dataToRender;
        let lastActiveNode: AssetNode = dataToRender;

        const lightenColor = (hex: string, percent: number): string => {
            hex = (hex || "#888").replace(/^#/, "");
            if (hex.length === 3) hex = hex.replace(/(.)/g, "$1$1");
            let r = parseInt(hex.substring(0, 2), 16),
                g = parseInt(hex.substring(2, 4), 16),
                b = parseInt(hex.substring(4, 6), 16);
            const amount = Math.round(2.55 * percent);

            r = Math.min(255, r + amount);
            g = Math.min(255, g + amount);
            b = Math.min(255, b + amount);

            return `#${r.toString(16).padStart(2, "0")}${g
                .toString(16)
                .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
        };

        const processData = (node: AssetNode, parent: AssetNode | null = null, depth = 0): void => {
            node.parent = parent;
            node.depth = depth;
            if (parent && !node.color && parent.color) {
                if (depth === 2) node.color = lightenColor(parent.color, 15);
                else if (depth >= 3) node.color = lightenColor(parent.color, 25);
            }
            if (node.children) node.children.forEach((child) => processData(child, node, depth + 1));
        };

        const polarToCartesian = (cx: number, cy: number, r: number, angle: number) => {
            const rad = ((angle - 90) * Math.PI) / 180.0;

            return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
        };

        const describeFlatSidedArc = (
            x: number, y: number, rInner: number, rOuter: number,
            startAngle: number, endAngle: number, gapDegrees: number
        ): string => {
            const totalAngleSpan = endAngle - startAngle;
            const gap = totalAngleSpan > gapDegrees && totalAngleSpan < 359.99 ? gapDegrees : 0;
            const effectiveStart = startAngle + gap / 2, effectiveEnd = endAngle - gap / 2;
            const angleSpan = effectiveEnd - effectiveStart;

            if (angleSpan <= 0) return "";

            const maxCrFromThickness = (rOuter - rInner) / 2;
            const maxCrFromAngle = rInner > 0 ? rInner * Math.tan((angleSpan / 2) * (Math.PI / 180)) : 0;
            const cr = Math.min(config.cornerRadius, maxCrFromThickness, maxCrFromAngle);

            if (cr <= 0.1) {
                const p1 = polarToCartesian(x, y, rOuter, effectiveStart),
                    p2 = polarToCartesian(x, y, rOuter, effectiveEnd),
                    p3 = polarToCartesian(x, y, rInner, effectiveEnd),
                    p4 = polarToCartesian(x, y, rInner, effectiveStart);

                return `M ${p1.x} ${p1.y} A ${rOuter} ${rOuter} 0 ${angleSpan <= 180 ? "0" : "1"} 1 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${rInner} ${rInner} 0 ${
                    angleSpan <= 180 ? "0" : "1"
                } 0 ${p4.x} ${p4.y} Z`;
            }

            const oAngle = (Math.asin(cr / rOuter) * 180) / Math.PI || 0,
                iAngle = (Math.asin(cr / rInner) * 180) / Math.PI || 0;
            const oas = polarToCartesian(x, y, rOuter, effectiveStart + oAngle),
                oae = polarToCartesian(x, y, rOuter, effectiveEnd - oAngle);
            const ias = polarToCartesian(x, y, rInner, effectiveStart + iAngle),
                iae = polarToCartesian(x, y, rInner, effectiveEnd - iAngle);
            const lso = polarToCartesian(x, y, rOuter - cr, effectiveStart),
                lsi = polarToCartesian(x, y, rInner + cr, effectiveStart);
            const leo = polarToCartesian(x, y, rOuter - cr, effectiveEnd),
                lei = polarToCartesian(x, y, rInner + cr, effectiveEnd);

            return [
                "M", oas.x, oas.y,
                "A", rOuter, rOuter, 0, angleSpan <= 180 ? "0" : "1", 1, oae.x, oae.y,
                "A", cr, cr, 0, 0, 1, leo.x, leo.y,
                "L", lei.x, lei.y,
                "A", cr, cr, 0, 0, 1, iae.x, iae.y,
                "A", rInner, rInner, 0, angleSpan <= 180 ? "0" : "1", 0, ias.x, ias.y,
                "A", cr, cr, 0, 0, 1, lsi.x, lsi.y,
                "L", lso.x, lso.y,
                "A", cr, cr, 0, 0, 1, oas.x, oas.y,
                "Z",
            ].join(" ");
        };

        const formatCurrency = (v: number): string =>
            v >= 1000 ? `$${(v / 1000).toFixed(1)}K` : `$${v.toFixed(2)}`;

        const createClipPath = (defs: SVGDefsElement, id: string, rInner: number, rOuter: number) => {
            const cp = document.createElementNS("http://www.w3.org/2000/svg", "clipPath");

            cp.id = id;
            const sh = document.createElementNS("http://www.w3.org/2000/svg", "path");
            const o = `M ${centerX - rOuter},${centerY} a ${rOuter},${rOuter} 0 1,0 ${rOuter * 2},0 a ${rOuter},${rOuter} 0 1,0 -${rOuter * 2},0 Z`;
            const i = `M ${centerX - rInner},${centerY} a ${rInner},${rInner} 0 1,0 ${rInner * 2},0 a ${rInner},${rInner} 0 1,0 -${rInner * 2},0 Z`;

            sh.setAttribute("d", o + " " + i);
            sh.setAttribute("clip-rule", "evenodd");
            cp.appendChild(sh);
            defs.appendChild(cp);
        };

        const renderChart = () => {
            svg.innerHTML = "";
            const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");

            svg.appendChild(defs);

            const activePath: AssetNode[] = [];
            let cn: AssetNode | null | undefined = activeNode;

            while (cn) { activePath.unshift(cn); cn = cn.parent; }

            const l1ClipId = "clip-l1";

            createClipPath(defs, l1ClipId, config.baseInnerRadius, config.baseInnerRadius + config.ringHeight);
            drawLayer(dataToRender, 0, 360, false, l1ClipId);

            let sa = 0, ea = 360;

            for (let i = 1; i < activePath.length; i++) {
                const node = activePath[i], parent = activePath[i - 1];
                let ao = sa;
                const pa = ea - sa;

                parent.children?.forEach((sib) => {
                    const s = (sib.value / parent.value) * pa;

                    if (sib === node) { sa = ao; ea = ao + s; }
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
            if (!parentNode.children || parentNode.children.length === 0) return;
            let currentAngle = startAngle;
            const totalValue = parentNode.value;
            const fullSpan = endAngle - startAngle;

            parentNode.children.forEach((child) => {
                const rawSpan = (child.value / totalValue) * fullSpan;
                const isOnlyChild = parentNode.children!.length === 1;
                const span = Math.min(rawSpan, 359.999);
                const localStart = isOnlyChild ? currentAngle + 0.001 : currentAngle;
                const localEnd = localStart + span;

                const rInner = config.baseInnerRadius + config.ringHeight + ((child.depth || 0) - 2) * (config.expandedRingHeight + config.expansionGap) + config.expansionGap;
                const rOuter = rInner + config.expandedRingHeight;
                const path = document.createElementNS("http://www.w3.org/2000/svg", "path");

                path.setAttribute("d", describeFlatSidedArc(
                    centerX, centerY,
                    child.depth === 1 ? config.baseInnerRadius : rInner,
                    child.depth === 1 ? config.baseInnerRadius + config.ringHeight : rOuter,
                    localStart, localEnd, config.sliceGap
                ));
                path.setAttribute("fill", child.color || "#888");
                path.setAttribute("class", "arc");
                path.style.transition = "opacity 0.3s ease, transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)";
                path.style.transformOrigin = `${centerX}px ${centerY}px`;
                path.style.cursor = "pointer";
                if (clipPathId) path.setAttribute("clip-path", `url(#${clipPathId})`);

                if (isAnimated) {
                    path.style.opacity = "0";
                    path.style.transform = "scale(0.95)";
                    requestAnimationFrame(() => { path.style.opacity = "1"; path.style.transform = "scale(1)"; });
                }
                path.addEventListener("mouseenter", () => {
                    if (child !== activeNode) {
                        lastActiveNode = activeNode;
                        activeNode = child;
                        renderChart();
                    }
                });
                svg.appendChild(path);
                currentAngle += rawSpan;
            });
        };

        const updateInfo = () => {
            const name = activeNode === dataToRender ? dataToRender.name : activeNode.name;
            const value = formatCurrency(activeNode.value);
            const color = (activeNode.depth || 0) > 0 ? activeNode.color : "var(--color-text-primary)";

            centerTextEl.innerHTML = `
        <span class="text-xs font-medium text-gray-400 mb-0.5">${name}</span>
        <span class="text-lg font-semibold transition-colors" style="color: ${color};">${value}</span>
      `;
            legendEl.innerHTML = "";
            const activePath: AssetNode[] = [];
            let cur: AssetNode | null | undefined = activeNode;

            while (cur) { activePath.unshift(cur); cur = cur.parent; }

            const renderColumn = (nodes: AssetNode[], parentValue: number, highlightNode: AssetNode | null) => {
                const colDiv = document.createElement("div");

                colDiv.className = "flex flex-col gap-1 min-w-[120px]";
                if (legendEl.children.length > 0) {
                    colDiv.style.paddingLeft = "16px";
                    colDiv.style.borderLeft = "1px solid #333";
                }
                nodes.forEach((node) => {
                    const percentage = ((node.value / parentValue) * 100).toFixed(0);
                    const itemEl = document.createElement("div");

                    itemEl.className = `flex items-center text-sm p-1 px-2 rounded-md transition-all whitespace-nowrap cursor-pointer hover:bg-white/5 ${
                        activePath.includes(node) ? "text-white" : "text-gray-400"
                    } ${highlightNode === node ? "font-semibold text-white bg-[#333]" : ""}`;

                    // Allow clicking legend to navigate
                    itemEl.onclick = () => {
                        if (node !== activeNode) {
                            lastActiveNode = activeNode;
                            activeNode = node;
                            renderChart();
                        }
                    };

                    itemEl.innerHTML = `
            <div class="w-2 h-2 rounded-full mr-2.5 shrink-0" style="background-color:${node.color || "#888"};"></div>
            <div class="flex-grow truncate mr-2">${node.name}</div>
            <div class="font-medium">${percentage}%</div>
          `;
                    colDiv.appendChild(itemEl);
                });

                return colDiv;
            };

            for (let i = 0; i < activePath.length; i++) {
                const parentNode = activePath[i];

                if (parentNode.children && parentNode.children.length > 0) {
                    const highlightNode = activePath[i + 1] || ((activeNode.depth || 0) > (parentNode.depth || 0) ? activeNode : null);

                    legendEl.appendChild(renderColumn(parentNode.children, parentNode.value, highlightNode));
                }
            }
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (activeNode === dataToRender) return;
            const rect = svg.getBoundingClientRect();
            const scaleX = svg.viewBox.baseVal.width / rect.width;
            const scaleY = svg.viewBox.baseVal.height / rect.height;
            const dist = Math.sqrt(Math.pow((e.clientX - rect.left) * scaleX - centerX, 2) + Math.pow((e.clientY - rect.top) * scaleY - centerY, 2));

            let maxR = config.baseInnerRadius + config.ringHeight;

            if ((activeNode.depth || 0) === 1) maxR += config.expansionGap + config.expandedRingHeight;
            else if ((activeNode.depth || 0) >= 2) maxR += (config.expansionGap + config.expandedRingHeight) * 2;

            if (dist < config.baseInnerRadius - config.centerBuffer || dist > maxR + config.resetMargin) {
                lastActiveNode = activeNode;
                activeNode = dataToRender;
                renderChart();
            }
        };

        const handleMouseLeave = () => {
            if (activeNode !== dataToRender) {
                lastActiveNode = activeNode;
                activeNode = dataToRender;
                renderChart();
            }
        };

        assetsContainer.addEventListener("mousemove", handleMouseMove);
        assetsContainer.addEventListener("mouseleave", handleMouseLeave);
        processData(dataToRender);
        renderChart();

        return () => {
            assetsContainer.removeEventListener("mousemove", handleMouseMove);
            assetsContainer.removeEventListener("mouseleave", handleMouseLeave);
        };
    }, []);

    // Re-draw when toggling view or when fresh API data arrives
    useEffect(() => {
        const data = view === "broker" ? brokerData : assetData;

        // Handle Empty State visual for "By Asset" specifically
        if (view === "asset" && !data && !loading) {
            if(chartWrapperRef.current) chartWrapperRef.current.innerHTML = "<div class='text-gray-500 text-sm italic w-full text-center mt-10'>No granular asset data available</div>";

            return;
        }

        if (!data) return;

        return drawChart(data);
    }, [view, brokerData, assetData, drawChart, loading]);

    return (
        <div ref={componentContainerRef} className="ua-card p-6 w-full text-white h-full min-h-[350px]">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full mb-4 gap-4 sm:gap-0">
                <h4 className="font-bold text-lg">Assets</h4>
                <div className="inline-flex">
                    <div className="flex p-1 gap-1 items-center h-8 rounded-lg bg-[#0A0908]">
                        <button
                            className={`py-1 px-3 flex justify-center items-center cursor-pointer outline-none rounded-md text-sm font-medium transition-all ${
                                view === "broker" ? "bg-white text-[#0A0908] shadow-sm" : "bg-transparent text-gray-400"
                            }`}
                            onClick={() => setView("broker")}
                        >
                            By Broker
                        </button>
                        <button
                            className={`py-1 px-3 flex justify-center items-center cursor-pointer outline-none rounded-md text-sm font-medium transition-all ${
                                view === "asset" ? "bg-white text-[#0A0908] shadow-sm" : "bg-transparent text-gray-400"
                            }`}
                            onClick={() => setView("asset")}
                        >
                            By Asset
                        </button>
                    </div>
                </div>
            </div>

            {loading && <div className="mt-6 text-sm text-gray-400 flex items-center justify-center w-full animate-pulse">Loading assets…</div>}
            {error && <div className="mt-6 text-sm text-red-400">Error: {error}</div>}

            <div ref={chartWrapperRef} className="assets-chart-body mt-4 flex flex-col sm:flex-row flex-1 relative items-center justify-start gap-6">
                {/* Chart & Legend render here */}
            </div>
        </div>
    );
};

export default AssetsOverview;
