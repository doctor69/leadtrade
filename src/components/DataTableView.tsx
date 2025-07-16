import { DataTable } from "./ui/datatable";

export const DataTableView = ({ columns, data }) => {
    return (
        <div className="space-y-4">
            <DataTable columns={columns} data={data} />
        </div>
    )
}
