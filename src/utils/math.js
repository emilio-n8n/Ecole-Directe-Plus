export function cumulativeDistributionFunction(x, mu = 1, sigma = 1) { // This requires maths skills that I definitely don't have but it returns a number between 0 and one and is smoothly increasing. See: https://en.wikipedia.org/wiki/Normal_distribution
    function erf(x) {
        // Constants
        const a1 = 0.254829592;
        const a2 = -0.284496736;
        const a3 = 1.421413741;
        const a4 = -1.453152027;
        const a5 = 1.061405429;
        const p = 0.3275911;

        // This is a simplified version of the function because we know that x will always be positive 

        // A&S formula 7.1.26
        const t = 1.0 / (1.0 + p * x);
        const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

        return y;
    }

    // Calcul de la CDF pour une distribution normale
    return 0.5 * (1 + erf((x - mu) / (sigma * Math.sqrt(2))));
}