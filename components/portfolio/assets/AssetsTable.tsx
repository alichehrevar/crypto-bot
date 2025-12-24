// components/portfolio/assets/AssetsTable.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRightIcon } from '@/utils/icons'; // Ensure this path is correct
import { getData } from '@/actions/get'; // Ensure this path is correct

/* ---------- TYPES ---------- */

interface AssetNode {
    name: string;
    value: number;
    amount?: number; // Added for Crypto amounts (e.g. 0.05 BTC)
    color?: string;
    children?: AssetNode[];
    // Helper props for logic
    depth?: number;
}

interface ApiResponse {
    success: boolean;
    data: AssetNode;
}

interface TreeNodeProps {
    node: AssetNode;
    depth: number;
    parentValue: number;
    inheritedColor?: string;
}

/* ---------- HELPERS (Adapted from AssetsOverview) ---------- */

// Maps DB names to UI friendly names
const RENAME_MAP: Record<string, string> = {
    "Earn": "Funding",
    "Other": "Coin-M",
    "Futures": "USDT-M",
    "Spot": "Spot",
    "Margin": "Margin",
    "Funding": "Funding"
};

function sanitizeNumber(n: any): number {
    const v = Number(n);
    return Number.isFinite(v) ? v : 0;
}

/** * Cleans the API data:
 * 1. Renames keys based on RENAME_MAP
 * 2. Removes zero-balance nodes
 * 3. Flattens nested 'data' structures provided by your API
 */
function normalizeTree(node: any): AssetNode | null {
    // Handle the specific "data" wrapper in your API leaf nodes
    const actualNode = node.data ? { ...node, ...node.data } : node;

    const originalName = String(actualNode.name ?? "");
    const mappedName = RENAME_MAP[originalName] || originalName;

    const out: AssetNode = {
        name: mappedName,
        value: 0, // Will be calculated from children or raw value
        color: actualNode.color,
        amount: sanitizeNumber(actualNode.amount),
        children: [],
    };

    const kids = Array.isArray(actualNode.children) ? actualNode.children : [];
    const cleanedKids: AssetNode[] = [];

    for (const ch of kids) {
        const c = normalizeTree(ch);
        if (!c) continue;

        // Filter out tiny dust values (optional, adjust threshold as needed)
        if (c.value <= 0.01) continue;

        cleanedKids.push(c);
    }

    if (cleanedKids.length > 0) {
        // If has children, sum them up (ensures consistency)
        const sum = cleanedKids.reduce((s, c) => s + c.value, 0);
        out.value = sum;
        out.children = cleanedKids.sort((a, b) => b.value - a.value); // Sort high to low
    } else {
        // Leaf node
        out.value = sanitizeNumber(actualNode.value);
        if (out.value <= 0.01) return null; // Remove empty leaves
        out.children = [];
    }

    return out;
}

/* ---------- COMPONENT: Tree Node ---------- */

const TreeNode: React.FC<TreeNodeProps> = ({ node, depth, parentValue, inheritedColor }) => {
    // Open top level (depth 0) by default, collapse others
    const [isOpen, setIsOpen] = useState(depth < 1);

    const hasChildren = node.children && node.children.length > 0;

    // Safety check for division by zero
    const percentage = parentValue > 0
        ? ((node.value / parentValue) * 100).toFixed(1)
        : "0.0";

    const displayColor = node.color || inheritedColor || "#6B7280"; // Default gray

    const formatCurrency = (v: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(v);

    const formatAmount = (v: number) => {
        if(v === 0) return '';
        return v < 1 ? v.toFixed(6) : v.toFixed(2);
    }

    return (
        <div className="border-l border-white/5 ml-1" style={{ paddingLeft: depth === 0 ? 0 : '0.5rem' }}>
            <motion.button
                className={`flex items-center justify-between w-full py-3 px-4 rounded-md hover:bg-white/5 cursor-pointer group transition-colors ${depth === 0 ? 'bg-white/5 mb-1' : ''}`}
                whileTap={{ scale: 0.99 }}
                onClick={() => hasChildren && setIsOpen(!isOpen)}
            >
                <div className="flex items-center flex-1 gap-2">
                    {/* Indentation for hierarchy visual */}
                    {depth > 0 && (
                        <div style={{ width: `${(depth - 1) * 1}rem` }} />
                    )}

                    {/* Expander Icon */}
                    <div className="w-6 flex justify-center shrink-0">
                        {hasChildren ? (
                            <motion.div
                                animate={{ rotate: isOpen ? 90 : 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <ChevronRightIcon className="w-4 h-4 text-gray-400 group-hover:text-white" />
                            </motion.div>
                        ) : (
                            <span className="w-4" />
                        )}
                    </div>

                    {/* Color Dot */}
                    <span
                        className="w-2.5 h-2.5 rounded-full shadow-sm shrink-0"
                        style={{ backgroundColor: displayColor }}
                    />

                    {/* Name */}
                    <div className="flex flex-col items-start">
                        <span className="text-sm text-gray-200 font-medium">{node.name}</span>
                        {/* If it's a leaf node with an amount (e.g. 0.05 BTC), show it */}
                        {!hasChildren && node.amount && node.amount > 0 && (
                            <span className="text-[10px] text-gray-500 font-mono">
                                {formatAmount(node.amount)}
                            </span>
                        )}
                    </div>
                </div>

                {/* Values */}
                <div className="flex items-center gap-4">
                    <span className="text-sm text-right text-gray-200 font-mono w-32">
                        {formatCurrency(node.value)}
                    </span>
                    <div className="w-16 text-right">
                        <span className="text-xs text-gray-400 font-mono bg-white/10 px-1.5 py-0.5 rounded">
                            {percentage}%
                        </span>
                    </div>
                </div>
            </motion.button>

            <AnimatePresence>
                {isOpen && hasChildren && (
                    <motion.div
                        animate={{ opacity: 1, height: 'auto' }}
                        className="overflow-hidden"
                        exit={{ opacity: 0, height: 0 }}
                        initial={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                    >
                        {node.children!.map((child, idx) => (
                            <TreeNode
                                key={`${child.name}-${idx}`}
                                depth={depth + 1}
                                node={child}
                                parentValue={node.value}
                                inheritedColor={displayColor}
                            />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

/* ---------- MAIN COMPONENT ---------- */

export default function AssetsTable() {
    const [data, setData] = useState<AssetNode | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const formatCurrency = (v: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);

    useEffect(() => {
        let isMounted = true;

        const fetchData = async () => {
            try {
                setLoading(true);
                // 1. Fetch from the specific API URL provided
                const res: ApiResponse = await getData('/accounts/summary/details');

                if (isMounted) {
                    if (res.success && res.data) {
                        // 2. Normalize the data (remove zeros, fix names)
                        const cleanData = normalizeTree(res.data);
                        setData(cleanData);
                    } else {
                        setError("Failed to retrieve asset details.");
                    }
                }
            } catch (err: any) {
                if (isMounted) setError(err.message || "An unexpected error occurred.");
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchData();

        return () => { isMounted = false; };
    }, []);

    // --- Render States ---

    if (loading) {
        return (
            <div className="ua-card text-white p-6 animate-pulse min-h-[300px]">
                <div className="h-6 w-32 bg-gray-700 rounded mb-6"></div>
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-12 w-full bg-gray-800 rounded opacity-50"></div>
                    ))}
                </div>
            </div>
        );
    }

    if (error || !data || !data.children) {
        return (
            <div className="ua-card text-white p-6">
                <div className="text-red-400 text-center py-10">
                    {error || "No asset data available."}
                </div>
            </div>
        );
    }

    return (
        <div className="ua-card text-white p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="text-[22px] font-semibold">Asset Details</div>
                <div className="text-xs text-gray-500">Live Snapshot</div>
            </div>

            {/* Header Row */}
            <div className="flex items-center justify-between py-2 px-4 text-xs text-gray-400 uppercase tracking-wider bg-white/5 border-b border-white/10 rounded-t-md">
                <span className="font-semibold flex-1 ml-10">Source / Asset</span>
                <div className="flex items-center gap-4">
                    <span className="font-semibold text-right w-32">Value (USD)</span>
                    <span className="font-semibold text-right w-16">Share</span>
                </div>
            </div>

            {/* Tree Body */}
            <div className="mt-2 flex flex-col gap-1">
                {data.children.map((child, idx) => (
                    <TreeNode
                        key={`${child.name}-${idx}`}
                        depth={0}
                        node={child}
                        parentValue={data.value}
                    />
                ))}
            </div>

            {/* Footer Row (Total) */}
            <div className="flex items-center justify-between font-bold text-white mt-6 pt-4 px-4 border-t border-gray-700">
                <span className="text-lg">Total Assets</span>
                <div className="flex items-center gap-4">
                    <span className="text-right font-mono text-lg text-green-400 w-32">
                        {formatCurrency(data.value)}
                    </span>
                    <span className="text-right font-mono text-sm text-gray-400 w-16">
                        100.0%
                    </span>
                </div>
            </div>
        </div>
    );
};
