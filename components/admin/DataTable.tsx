"use client";

import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Chip, Input, Pagination } from "@heroui/react";
import { useMemo, useState } from "react";
import Link from "next/link";

import {User} from "@/types/admin/Users";
import {BotIcon, PencilSquareIcon, TrashIcon} from "@/utils/icons";
import LoadingWithSpinner from "@/components/loading/LoadingWithSpinner";

export default function DataTable({rows, isLoading}: { rows: User[], isLoading?: boolean }) {
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const rowsPerPage = 7;

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();

        if (!q) return rows;

        return rows.filter(r => r.email.toLowerCase().includes(q) || r.email.toLowerCase().includes(q));
    }, [rows, search]);

    const pages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
    const slice = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage);

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
                <Input
                    className="max-w-xs"
                    placeholder="Search users..."
                    value={search}
                    variant="bordered"
                    onValueChange={setSearch}
                />
            </div>

            <Table removeWrapper aria-label="Users list">
                <TableHeader>
                    <TableColumn>Name</TableColumn>
                    <TableColumn>Email</TableColumn>
                    <TableColumn>Role</TableColumn>
                    <TableColumn>Action</TableColumn>
                </TableHeader>
                <TableBody
                    emptyContent={"No users found"}
                    isLoading={isLoading}
                    loadingContent={<LoadingWithSpinner />}
                >
                    {slice.map((r, idx) => (
                        <TableRow key={idx} className="hover:bg-white/5">
                            <TableCell>
                                <Link href={`/admin/users/${r._id}`}>
                                    {r.info.firstName + " " + r.info.lastName}
                                </Link>
                            </TableCell>
                            <TableCell className="text-white/70">{r.email}</TableCell>
                            <TableCell>
                                <Chip className="capitalize text-xs" color={r.role === "admin" ? "success" : r.role === "client" ? "warning" : "default"} variant="flat">
                                    {r.role}
                                </Chip>
                            </TableCell>
                            <TableCell className="text-white/70 flex items-center gap-3">
                                <Link className="group" href={`/admin/users/${r._id}/bots`}>
                                    <BotIcon className="size-6 group-hover:stroke-warning-400" />
                                </Link>
                                <Link className="group" href={`/admin/users/${r._id}`}>
                                    <PencilSquareIcon className="size-5 group-hover:stroke-success-300" />
                                </Link>
                                <Link className="group" href="/">
                                    <TrashIcon className="size-5 group-hover:stroke-red-800" />
                                </Link>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            <div className="flex justify-end">
                <Pagination page={page} size="sm" total={pages} onChange={setPage} />
            </div>
        </div>
    );
}
