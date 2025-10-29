import type { UserRow } from "@/components/admin/DataTable";

export function getUsers(): UserRow[] {
    return Array.from({ length: 34 }).map((_, i) => ({
        id: `${i + 1}`,
        name: `User ${i + 1}`,
        email: `user${i + 1}@example.com`,
        role: (['Admin', 'Manager', 'Viewer'] as const)[i % 3],
        status: (['Active', 'Invited', 'Suspended'] as const)[i % 3]
    }));
}
