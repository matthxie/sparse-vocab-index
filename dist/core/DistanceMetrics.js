export function calculateDotProduct(a, b) {
    let dot = 0;
    for (let i = 0; i < a.length; i++) {
        if ((a[i] & 0x80) !== 0 && (b[i] & 0x80) !== 0) {
            dot += (a[i] & 0x7f) * (b[i] & 0x7f);
        }
    }
    return dot;
}
export function calculateQuantizedCosine(a, b) {
    let dot = 0;
    let magA = 0;
    let magB = 0;
    for (let i = 0; i < a.length; i++) {
        const scoreA = (a[i] & 0x80) !== 0 ? (a[i] & 0x7f) : 0;
        const scoreB = (b[i] & 0x80) !== 0 ? (b[i] & 0x7f) : 0;
        dot += scoreA * scoreB;
        magA += scoreA * scoreA;
        magB += scoreB * scoreB;
    }
    if (magA === 0 || magB === 0)
        return 0;
    return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}
export function calculateJaccard(a, b) {
    let intersection = 0;
    let union = 0;
    for (let i = 0; i < a.length; i++) {
        const activeA = (a[i] & 0x80) !== 0;
        const activeB = (b[i] & 0x80) !== 0;
        if (activeA && activeB)
            intersection++;
        if (activeA || activeB)
            union++;
    }
    if (union === 0)
        return 0;
    return intersection / union;
}
//# sourceMappingURL=DistanceMetrics.js.map