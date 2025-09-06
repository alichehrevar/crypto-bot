// components/portfolio/assets/AssetsTable.tsx
'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion'; // Import motion and AnimatePresence

import { ChevronRightIcon } from '@/utils/icons';
import { AssetNode, demoData } from '@/utils/PortfolioAssetData';

interface AssetsTableProps {
    data?: AssetNode;
}

interface TreeNodeProps {
    node: AssetNode;
    depth: number;
    parentValue: number;
}

/**
 * A reusable, recursive component to render a single node in the asset tree.
 * It manages its own expanded/collapsed state and applies Framer Motion animations.
 */
const TreeNode: React.FC<TreeNodeProps> = ({ node, depth, parentValue }) => {
    const [isOpen, setIsOpen] = useState(depth < 1); // Auto-expand the first level

    const hasChildren = node.children && node.children.length > 0;
    const percentage = ((node.value / parentValue) * 100).toFixed(1);

    const formatCurrency = (v: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);

    return (
        <div style={{ paddingLeft: `${depth * 1.5}rem` }}>
            {/* The main row for the current node, now a motion.button */}
            <motion.button
                className="flex items-center justify-between w-full py-3 px-4 rounded-md hover:bg-gray-800 cursor-pointer"
                whileTap={{ scale: 0.99 }}
                onClick={() => hasChildren && setIsOpen(!isOpen)}
            >
                <div className="flex items-center flex-1">
                    {/* Expander Icon with rotation animation */}
                    {hasChildren && (
                        <motion.div
                            animate={{ rotate: isOpen ? 90 : 0 }}
                            className="flex items-center" // Wrapper div for rotation
                            transition={{ duration: 0.2 }}
                        >
                            <ChevronRightIcon className="w-4 h-4 mr-2" />
                        </motion.div>
                    )}
                    {!hasChildren && <span className="w-4 h-4 mr-2" /> /* Spacer for alignment */}

                    {/* Color Dot and Name */}
                    {node.color && (
                        <span
                            className="w-2.5 h-2.5 rounded-full mr-3 inline-block shrink-0"
                            style={{ backgroundColor: node.color }}
                        />
                    )}
                    <span className="text-sm text-gray-200">{node.name}</span>
                </div>

                {/* Value and Percentage */}
                <div className="flex items-center">
                    <span className="text-sm text-center text-gray-200 font-mono w-32">
                        {formatCurrency(node.value)}
                    </span>
                    <span className="text-sm text-center text-gray-400 font-mono w-20">{percentage}%</span>
                </div>
            </motion.button>

            {/* Recursively render children with AnimatePresence for mount/unmount animations */}
            <AnimatePresence>
                {isOpen && hasChildren && (
                    <motion.div
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-1 overflow-hidden" // overflow-hidden is crucial for height animation
                        exit={{ opacity: 0, height: 0 }}
                        initial={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                    >
                        {node.children && node.children.map(child => (
                            <TreeNode key={child.name} depth={depth + 1} node={child} parentValue={node.value} />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

/**
 * The main component to display the asset hierarchy as an interactive tree.
 * A direct replacement for AssetsTable.
 */
export default function AssetsTable({ data = demoData }: AssetsTableProps) {
    if (!data || !data.children) return null;

    const formatCurrency = (v: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);

    return (
        <div className="bg-dark-gray text-white rounded-lg p-6">
            <div className="text-[22px] font-semibold mb-2">Asset Details</div>

            {/* Header Row */}
            <div className="flex items-center justify-between py-2 px-4 text-xs text-gray-400 capitalize bg-dark-gray border-b border-white/30 rounded-t-md">
                <span className="font-semibold flex-1">Name</span>
                <div className="flex items-center gap-5">
                    <span className="font-semibold text-center w-24">Value</span>
                    <span className="font-semibold text-center w-20">Share</span>
                </div>
            </div>

            {/* Tree Body */}
            <div className="mt-1">
                {data.children.map(child => (
                    <TreeNode key={child.name} depth={0} node={child} parentValue={data.value} />
                ))}
            </div>

            {/* Footer Row */}
            <div className="flex items-center justify-between font-bold text-white mt-4 pt-3 px-4 border-t-2 border-gray-600">
                <span>{data.name} (Total)</span>
                <div className="flex items-center">
                    <span className="text-right font-mono w-32">{formatCurrency(data.value)}</span>
                    <span className="text-right font-mono w-20">100.0%</span>
                </div>
            </div>
        </div>
    );
};
