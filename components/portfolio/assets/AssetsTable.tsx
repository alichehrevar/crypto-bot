'use client';

import React from 'react';

import {AssetNode, demoData} from '@/utils/PortfolioAssetData';

interface AssetsTableProps {
    data?: AssetNode;
}

/** A helper component to recursively render table rows */
const TableRow = ({ node, depth, parentValue }: { node: AssetNode; depth: number; parentValue: number }) => {
    const percentage = ((node.value / parentValue) * 100).toFixed(1);

    const formatCurrency = (v: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);

    return (
        <React.Fragment>
            <tr className="border-b border-gray-700 hover:bg-gray-800">
                <td className="py-3 px-4 text-sm text-gray-200">
                    <div className="flex items-center" style={{ paddingLeft: `${depth * 1.5}rem` }}>
                        {node.color && (
                            <span
                                className="w-2.5 h-2.5 rounded-full mr-3 inline-block shrink-0"
                                style={{ backgroundColor: node.color }}
                            />
                        )}
                        {node.name}
                    </div>
                </td>
                <td className="py-3 px-4 text-sm text-right text-gray-200 font-mono">{formatCurrency(node.value)}</td>
                <td className="py-3 px-4 text-sm text-right text-gray-400 font-mono">{percentage}%</td>
            </tr>
            {node.children && node.children.map(child => (
                <TableRow key={child.name} depth={depth + 1} node={child} parentValue={node.value} />
            ))}
        </React.Fragment>
    );
};

/** The main table component for displaying asset hierarchy */
export default function AssetsTable({ data = demoData }: AssetsTableProps) {
    if (!data || !data.children) return null;

    const formatCurrency = (v: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);

    return (
        <div className="bg-dark-gray text-white rounded-lg p-6">
            <div className="text-[22px] font-semibold mb-4">Asset Details</div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-800 text-xs text-gray-400 uppercase">
                    <tr>
                        <th className="py-3 px-4 font-semibold">Name</th>
                        <th className="py-3 px-4 font-semibold text-right">Value</th>
                        <th className="py-3 px-4 font-semibold text-right">% of Parent</th>
                    </tr>
                    </thead>
                    <tbody>
                    {data.children.map(child => (
                        <TableRow key={child.name} depth={0} node={child} parentValue={data.value} />
                    ))}
                    </tbody>
                    <tfoot className="border-t-2 border-gray-600">
                    <tr className="font-bold text-white">
                        <td className="py-3 px-4">{data.name} (Total)</td>
                        <td className="py-3 px-4 text-right font-mono">{formatCurrency(data.value)}</td>
                        <td className="py-3 px-4 text-right font-mono">100.0%</td>
                    </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
};
