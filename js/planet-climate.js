/* Pure grey-atmosphere proxy; matches client/space/GreenhouseMath.java.
 * Density is a catalog class, NOT pressure. No RNG, catalog writes or W/m².
 * Earth-relative value is tauIR/tauEarth, never the saturated index ratio.
 */
(function () {
  'use strict';
  const DENSITY = Object.freeze({ none: 0, minimal: .15, thin: .35, moderate: .55, medium: .75, thick: .90 });
  const EARTH_GASES = Object.freeze(['N2', 'O2', 'AR', 'CO2', 'H2O', 'CH4']);
  const clamp = (v, lo, hi) => Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : lo;
  const key = v => String(v == null ? '' : v).trim().toLowerCase();
  const compositionText = v => Array.isArray(v) ? v.join(',') : String(v == null ? '' : v);
  function density(atmosphere) { return DENSITY[key(atmosphere)] || 0; }
  function fractions(composition) {
    const text = compositionText(composition).toUpperCase();
    const explicit = text.includes(':');
    const gas = Object.create(null);
    for (const raw of text.split(/[,;]/)) {
      const pair = raw.trim().split(':');
      const formula = pair[0].trim();
      if (!formula) continue;
      const amount = explicit ? (pair.length > 1 && pair[1].trim() ? Number(pair[1].trim()) : 0) : 1;
      if (Number.isFinite(amount) && amount > 0) gas[formula] = (gas[formula] || 0) + amount;
    }
    if (!explicit) {
      const terrestrial = gas.N2 > 0 && gas.O2 > 0;
      const hydrogen = gas.H2 > 0 && gas.HE > 0;
      const carbon = gas.CO2 > 0 && !terrestrial && !hydrogen;
      const weights = terrestrial ? { N2: .78, O2: .21, AR: .0093, CO2: .00042, H2O: .01, CH4: .0000019 }
        : hydrogen ? { H2: .86, HE: .12, CH4: .015, NH3: .005, H2O: .005, H2S: .005 }
        : carbon ? { CO2: .96, N2: .035, SO2: .004, H2O: .00002 } : null;
      for (const formula of Object.keys(gas)) gas[formula] = weights ? (weights[formula] || (terrestrial ? .0001 : .001)) : 1;
    }
    const total = Object.values(gas).reduce((a, b) => a + b, 0);
    if (!(total > 0) || !Number.isFinite(total)) return Object.create(null);
    for (const formula of Object.keys(gas)) gas[formula] /= total;
    return gas;
  }
  function estimate(atmosphereOrDensity, composition, savedTemperatureC, equilibriumK) {
    const gas = fractions(composition);
    const d = clamp(typeof atmosphereOrDensity === 'number' ? atmosphereOrDensity : density(atmosphereOrDensity), 0, 1);
    const columnProxy = d === 0 ? 0 : Math.min(80, Math.exp(11 * (d - .55)));
    const absorption = .40 * Math.log1p((gas.CO2 || 0) / .0004)
      + .82 * Math.log1p((gas.H2O || 0) / .01)
      + .25 * Math.log1p((gas.CH4 || 0) / .000002)
      + .08 * (gas.H2 || 0) ** 2 * columnProxy;
    const rawTau = columnProxy * absorption;
    const opticalDepthIR = clamp(rawTau, 0, 180);
    const teq = Number.isFinite(equilibriumK) && equilibriumK > 0 ? equilibriumK : NaN;
    const surface = Number.isFinite(teq) ? Math.min(2500, teq * (1 + .75 * opticalDepthIR) ** .25) : NaN;
    return { opticalDepthIR, index: opticalDepthIR / (1 + opticalDepthIR), columnProxy,
      equilibriumK: teq, greenhouseK: surface, warmingK: surface - teq, capped: rawTau > 180 };
  }
  function stellarFlux(luminosity, distance) {
    return Number.isFinite(luminosity) && luminosity > 0 && Number.isFinite(distance) && distance > 0
      ? Math.min(1e12, luminosity / (distance * distance)) : 0;
  }
  function equilibriumK(primaryLuminosity, primaryDistance, secondaryLuminosity, secondaryDistance, bondAlbedo) {
    const flux = stellarFlux(primaryLuminosity, primaryDistance) + stellarFlux(secondaryLuminosity, secondaryDistance);
    return flux > 0 ? (1361 * flux * (1 - clamp(bondAlbedo, 0, .98)) / (4 * 5.670374419e-8)) ** .25 : 0;
  }
  function isEarth(planet) { return /^(земля|earth)$/i.test(String(planet && planet.name || '').trim()); }
  function earthReference(catalog) {
    const planets = (catalog && catalog.systems || []).flatMap(s => s.planets || []);
    const earth = planets.find(isEarth) || null;
    const known = earth && estimate(earth.atmosphere, earth.composition, earth.temperatureC);
    // Old Earth catalog lists only N2/O2/Ar: no IR absorbers. Use an explicitly
    // disclosed canonical trace-gas reference, not zero division or invented bars.
    const fromCatalog = !!(known && known.opticalDepthIR > 0);
    const climate = fromCatalog ? known : estimate('moderate', EARTH_GASES, 15);
    return { planet: earth, climate, source: fromCatalog ? 'catalog' : 'fallback',
      composition: fromCatalog ? compositionText(earth.composition) : EARTH_GASES.join(','),
      opticalDepthIR: climate.opticalDepthIR };
  }
  function compareEarth(planet, reference) {
    const ref = reference || earthReference(null);
    const earth = isEarth(planet);
    const atmosphere = key(planet && planet.atmosphere);
    const gas = fractions(planet && planet.composition);
    const available = !!planet && !planet.mystery && (earth || atmosphere === 'none'
      || (Object.hasOwn(DENSITY, atmosphere) && Object.keys(gas).length > 0));
    const climate = earth ? ref.climate : estimate(atmosphere, planet && planet.composition, planet && planet.temperatureC);
    return { ...climate, available, relativeEarth: available ? (earth ? 1 : climate.opticalDepthIR / ref.opticalDepthIR) : null,
      referenceSource: ref.source, earthOpticalDepthIR: ref.opticalDepthIR,
      noAtmosphere: atmosphere === 'none', noListedAbsorbers: available && atmosphere !== 'none' && climate.opticalDepthIR === 0 };
  }
  const API = { density, fractions, estimate, equilibriumK, isEarth, earthReference, compareEarth, DENSITY, EARTH_GASES };
  if (typeof window !== 'undefined') window.EUPlanetClimate = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
