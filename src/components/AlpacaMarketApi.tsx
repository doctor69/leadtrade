import { useState } from "react"
import { DataTableView } from "./DataTableView"
import { asset_columns } from "./ui/columns/asset-columns"
import AlpacaConnection from "../lib/alpaca"

export default function AlpacaMarketApi() {

    const [data, setData] = useState([])

    return (
        <div>
            <AlpacaConnection setTableData={setData} method="GET" endpoint="/assets"/>
            <DataTableView columns={asset_columns} data={data} />
        </div>
    )
}