// 1D K-Means (k up to 3) on salary values
function kmeans1D(values, k = 3, maxIter = 100) {
  const data = values.filter((v) => Number.isFinite(v));
  if (data.length === 0) return [];
  const distinct = [...new Set(data)].sort((a, b) => a - b);
  const kk = Math.min(k, distinct.length); // not enough distinct values -> fewer clusters

  // init centroids spread across distinct sorted values
  let centroids = [];
  for (let i = 0; i < kk; i++) {
    const idx = kk === 1 ? 0 : Math.round((i * (distinct.length - 1)) / (kk - 1));
    centroids.push(distinct[idx]);
  }

  let assign = new Array(data.length).fill(0);
  for (let iter = 0; iter < maxIter; iter++) {
    // assignment step
    let changed = false;
    data.forEach((v, i) => {
      let best = 0, bestDist = Infinity;
      centroids.forEach((c, j) => {
        const d = Math.abs(v - c);
        if (d < bestDist) { bestDist = d; best = j; }
      });
      if (assign[i] !== best) { assign[i] = best; changed = true; }
    });
    // update step
    const sums = new Array(kk).fill(0), counts = new Array(kk).fill(0);
    data.forEach((v, i) => { sums[assign[i]] += v; counts[assign[i]]++; });
    const next = centroids.map((c, j) => (counts[j] > 0 ? sums[j] / counts[j] : c));
    const moved = next.some((c, j) => c !== centroids[j]);
    centroids = next;
    if (!changed && !moved) break;
  }

  const counts = new Array(kk).fill(0);
  assign.forEach((a) => counts[a]++);
  return centroids
    .map((c, j) => ({ centroid: Math.round(c * 100) / 100, count: counts[j] }))
    .filter((c) => c.count > 0)
    .sort((a, b) => a.centroid - b.centroid)
    .map((c, i) => ({ group: `Tier ${i + 1}`, centroid: c.centroid, count: c.count }));
}

module.exports = { kmeans1D };
