import DataTable from "@/components/admin/DataTable";
import { getUsers } from "@/lib/users";

export default function UsersListPage() {
    const data = getUsers();

    return (
        <div>
            <h1 className="text-2xl font-semibold mb-4">Users</h1>
            <DataTable rows={data} />
        </div>
    );
}
