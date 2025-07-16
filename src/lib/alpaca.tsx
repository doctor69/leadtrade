import { useEffect, useState } from "react";

export default function AlpacaConnection({ setTableData, method, body, endpoint } : {setTableData:Function, method: string, body: {}, endpoint: string}) {

    const KEY_ID = import.meta.env.PUBLIC_ALPACA_BROKER_SANDBOX_API_KEY
    const SECRET = import.meta.env.PUBLIC_ALPACA_BROKER_SANDBOX_API_SECRET
    const BASE_URL = import.meta.env.PUBLIC_ALPACA_BROKER_SANDBOX_BASE_URL

    var credentials = btoa(`${KEY_ID}:${SECRET}`);

    const myHeaders = new Headers();
    myHeaders.append("Accept", "application/json");
    myHeaders.append("Content-Type", "application/json");
    myHeaders.append("Authorization", `Basic ${credentials}`);

    const [fetchedData, setFetchedData] = useState([]);

    const requestOptions: any = {
        method: method,
        headers: myHeaders,
        body: body ? JSON.stringify(body) : null,
        redirect: 'follow'
    };

    useEffect(() => {
        console.log("which connection - " + method + endpoint + body)

        const alpacaData = fetch(`${BASE_URL}${endpoint}`, requestOptions)
            .then((res) => {
                return res.text()
            })
            .then(
                (result) => {
                    const fetchData = JSON.parse(result)
                    setFetchedData(fetchData);
                })
            .catch((err) => {
                console.error(err)
            });
    }, [])

    return (
        <div>
            {setTableData(fetchedData)}
        </div>
    )
}