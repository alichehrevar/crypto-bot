"use client";
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Chip, Input, Pagination } from "@heroui/react";
import { useMemo, useState } from "react";

export type UserRow = {
    id: string;
    name: string;
    email: string;
    role: "Admin" | "Manager" | "Viewer";
    status: "Active" | "Invited" | "Suspended";
};

export default function DataTable({ rows }: { rows: UserRow[] }) {
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const rowsPerPage = 7;

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();

        if (!q) return rows;

        return rows.filter(r => r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q));
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
                    <TableColumn>Status</TableColumn>
                </TableHeader>
                <TableBody emptyContent={"No users found"}>
                    {slice.map((r) => (
                        <TableRow key={r.id} className="hover:bg-white/5">
                            <TableCell>{r.name}</TableCell>
                            <TableCell className="text-white/70">{r.email}</TableCell>
                            <TableCell>
                                <Chip color={r.role === "Admin" ? "danger" : r.role === "Manager" ? "warning" : "default"} variant="flat">
                                    {r.role}
                                </Chip>
                            </TableCell>
                            <TableCell>
                                <Chip color={r.status === "Active" ? "success" : r.status === "Invited" ? "primary" : "default"} variant="flat">
                                    {r.status}
                                </Chip>
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
