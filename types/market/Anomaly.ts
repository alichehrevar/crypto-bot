export type Severity = 'High' | 'Medium' | 'Low'
export type AnomalyType = 'Volume' | 'Funding' | 'On-Chain' | 'OI' | 'Price' | (string & {})

export type Anomaly = {
    id: string | number
    type: AnomalyType
    asset?: string
    detail: string
    time: string
    severity: Severity
}

export type AnomalyResponse = {
    data: Anomaly[],
    success: boolean,
    error: string
}
