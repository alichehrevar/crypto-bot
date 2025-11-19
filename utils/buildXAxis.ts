// utils/buildXAxis.ts
export function build7DayXAxis(createdAt: string | Date): string[] {
    const end = new Date(createdAt);
    // start is 7 days earlier
    const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);

    // let's create 7 labels (start, ..., end)
    const labels: string[] = [];

    for (let i = 0; i < 7; i++) {
        const d = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
        // format like "5 Oct"
        const day = d.getUTCDate();
        const monthShort = d.toLocaleString("en-GB", {
            month: "short",
            timeZone: "UTC",
        });

        labels.push(`${day} ${monthShort.toLowerCase()}`); // "5 oct"
    }

    return labels;
}
