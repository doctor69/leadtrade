import AlpacaConnection from "@/lib/alpaca";
import { useState } from "react";
import { createPostRequestForAccountOpen } from "@/lib/createrequest";

export default function OpenAlpacaAccount () {

    const [data, setData] = useState([])
    const formData = createPostRequestForAccountOpen

    console.log(data)

    return (
        <div>
            <AlpacaConnection setTableData={setData} method="POST" endpoint="/accounts" body={formData} />
        </div>
    )
}