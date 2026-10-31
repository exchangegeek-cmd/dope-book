// Point-mass (3DOF) ballistic solver. Imperial units throughout:
// feet, seconds, fps, inches, yards, °F, inHg.
(function (root) {
  "use strict";

  // Standard drag functions: [Mach, Cd]. Same tables used by JBM and py-ballisticcalc.
  const G1 = [
    [0.00, 0.2629], [0.05, 0.2558], [0.10, 0.2487], [0.15, 0.2413], [0.20, 0.2344],
    [0.25, 0.2278], [0.30, 0.2214], [0.35, 0.2155], [0.40, 0.2104], [0.45, 0.2061],
    [0.50, 0.2032], [0.55, 0.2020], [0.60, 0.2034], [0.70, 0.2165], [0.725, 0.2230],
    [0.75, 0.2313], [0.775, 0.2417], [0.80, 0.2546], [0.825, 0.2706], [0.85, 0.2901],
    [0.875, 0.3136], [0.90, 0.3415], [0.925, 0.3734], [0.95, 0.4084], [0.975, 0.4448],
    [1.00, 0.4805], [1.025, 0.5136], [1.05, 0.5427], [1.075, 0.5677], [1.10, 0.5883],
    [1.125, 0.6053], [1.15, 0.6191], [1.20, 0.6393], [1.25, 0.6518], [1.30, 0.6589],
    [1.35, 0.6621], [1.40, 0.6625], [1.45, 0.6607], [1.50, 0.6573], [1.55, 0.6528],
    [1.60, 0.6474], [1.65, 0.6413], [1.70, 0.6347], [1.75, 0.6280], [1.80, 0.6210],
    [1.85, 0.6141], [1.90, 0.6072], [1.95, 0.6003], [2.00, 0.5934], [2.05, 0.5867],
    [2.10, 0.5804], [2.15, 0.5743], [2.20, 0.5685], [2.25, 0.5630], [2.30, 0.5577],
    [2.35, 0.5527], [2.40, 0.5481], [2.45, 0.5438], [2.50, 0.5397], [2.60, 0.5325],
    [2.70, 0.5264], [2.80, 0.5211], [2.90, 0.5168], [3.00, 0.5133], [3.10, 0.5105],
    [3.20, 0.5084], [3.30, 0.5067], [3.40, 0.5054], [3.50, 0.5040], [3.60, 0.5030],
    [3.70, 0.5022], [3.80, 0.5016], [3.90, 0.5010], [4.00, 0.5006], [4.20, 0.4998],
    [4.40, 0.4995], [4.60, 0.4992], [4.80, 0.4990], [5.00, 0.4988],
  ];
  const G7 = [
    [0.00, 0.1198], [0.05, 0.1197], [0.10, 0.1196], [0.15, 0.1194], [0.20, 0.1193],
    [0.25, 0.1194], [0.30, 0.1194], [0.35, 0.1194], [0.40, 0.1193], [0.45, 0.1193],
    [0.50, 0.1194], [0.55, 0.1193], [0.60, 0.1194], [0.65, 0.1197], [0.70, 0.1202],
    [0.725, 0.1207], [0.75, 0.1215], [0.775, 0.1226], [0.80, 0.1242], [0.825, 0.1266],
    [0.85, 0.1306], [0.875, 0.1368], [0.90, 0.1464], [0.925, 0.1660], [0.95, 0.2054],
    [0.975, 0.2993], [1.00, 0.3803], [1.025, 0.4015], [1.05, 0.4043], [1.075, 0.4034],
    [1.10, 0.4014], [1.125, 0.3987], [1.15, 0.3955], [1.20, 0.3884], [1.25, 0.3810],
    [1.30, 0.3732], [1.35, 0.3657], [1.40, 0.3580], [1.50, 0.3440], [1.55, 0.3376],
    [1.60, 0.3315], [1.65, 0.3260], [1.70, 0.3209], [1.75, 0.3160], [1.80, 0.3117],
    [1.85, 0.3078], [1.90, 0.3042], [1.95, 0.3010], [2.00, 0.2980], [2.05, 0.2951],
    [2.10, 0.2922], [2.15, 0.2892], [2.20, 0.2864], [2.25, 0.2835], [2.30, 0.2807],
    [2.35, 0.2779], [2.40, 0.2752], [2.45, 0.2725], [2.50, 0.2697], [2.55, 0.2670],
    [2.60, 0.2643], [2.65, 0.2615], [2.70, 0.2588], [2.75, 0.2561], [2.80, 0.2533],
    [2.85, 0.2506], [2.90, 0.2479], [2.95, 0.2451], [3.00, 0.2424], [3.10, 0.2368],
    [3.20, 0.2313], [3.30, 0.2258], [3.40, 0.2205], [3.50, 0.2154], [3.60, 0.2106],
    [3.70, 0.2060], [3.80, 0.2017], [3.90, 0.1975], [4.00, 0.1935], [4.20, 0.1861],
    [4.40, 0.1793], [4.60, 0.1730], [4.80, 0.1672], [5.00, 0.1618],
  ];
  const TABLES = { G1, G7 };

  const GRAVITY = 32.174;          // ft/s²
  const STD_PRESSURE = 29.921;     // inHg, sea level
  const STD_TEMP_R = 518.67;       // 59 °F in Rankine
  // ½·ρ_std·(π/4 in² → ft²) for the 1 lb, 1 in standard projectile; divide by BC.
  const DRAG_K = 0.0764742 * Math.PI / (8 * 144);

  function cd(table, mach) {
    if (mach <= table[0][0]) return table[0][1];
    const last = table[table.length - 1];
    if (mach >= last[0]) return last[1];
    let lo = 0, hi = table.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (table[mid][0] <= mach) lo = mid; else hi = mid;
    }
    const [m0, c0] = table[lo], [m1, c1] = table[hi];
    return c0 + (c1 - c0) * (mach - m0) / (m1 - m0);
  }

  // Station pressure from altitude when the shooter has no barometer reading.
  function pressureAtAltitude(altFt) {
    return STD_PRESSURE * Math.pow(1 - 6.8756e-6 * altFt, 5.2559);
  }

  function atmosphere(env) {
    const tempR = (env.tempF ?? 59) + 459.67;
    const pressure = env.pressureInHg > 0 ? env.pressureInHg : pressureAtAltitude(env.altFt || 0);
    return {
      densityRatio: (pressure / STD_PRESSURE) * (STD_TEMP_R / tempR),
      speedOfSound: 49.0223 * Math.sqrt(tempR),
      pressure,
    };
  }

  // Wind clock: the hour the wind blows FROM. 12 = from the target (headwind),
  // 3 = from the right, 9 = from the left. Returns air velocity in ft/s
  // along x (downrange) and z (right positive).
  function windVector(mph, clock) {
    if (!mph || clock == null) return { x: 0, z: 0 };
    const fps = mph * 5280 / 3600;
    const a = (clock % 12) * Math.PI / 6;
    return { x: -fps * Math.cos(a), z: -fps * Math.sin(a) };
  }

  // Integrates one trajectory out to maxYd, sampling at each yardage in `atYd`.
  // Works in the line-of-sight frame: x along the sight line, y square to it.
  // slopeRad tilts the sight line (+ = uphill), so gravity gets a component along x.
  function fly(load, atm, angle, wind, atYd, slopeRad = 0) {
    const table = TABLES[load.model];
    const k = DRAG_K * atm.densityRatio / load.bc;
    const maxFt = atYd[atYd.length - 1] * 3;
    let x = 0, y = -load.sightHeightIn / 12, z = 0, t = 0;
    let vx = load.mv * Math.cos(angle), vy = load.mv * Math.sin(angle), vz = 0;
    const out = [];
    let next = 0;
    const dt = 0.0005;
    const cs = Math.cos(slopeRad), sn = Math.sin(slopeRad);
    const gx = -GRAVITY * sn, gy = -GRAVITY * cs;
    // Wind is horizontal; rotate its downrange part into the sight-line frame.
    const wx = wind.x * cs, wy = -wind.x * sn;

    function accel(vx, vy, vz) {
      const rx = vx - wx, ry = vy - wy, rz = vz - wind.z;
      const vr = Math.sqrt(rx * rx + ry * ry + rz * rz);
      const f = k * cd(table, vr / atm.speedOfSound) * vr;
      return [-f * rx + gx, -f * ry + gy, -f * rz];
    }

    while (next < atYd.length && t < 10) {
      const px = x, py = y, pz = z, pv = Math.hypot(vx, vy, vz), pt = t;
      // RK4 step
      const a1 = accel(vx, vy, vz);
      const a2 = accel(vx + a1[0] * dt / 2, vy + a1[1] * dt / 2, vz + a1[2] * dt / 2);
      const a3 = accel(vx + a2[0] * dt / 2, vy + a2[1] * dt / 2, vz + a2[2] * dt / 2);
      const a4 = accel(vx + a3[0] * dt, vy + a3[1] * dt, vz + a3[2] * dt);
      const nvx = vx + dt / 6 * (a1[0] + 2 * a2[0] + 2 * a3[0] + a4[0]);
      const nvy = vy + dt / 6 * (a1[1] + 2 * a2[1] + 2 * a3[1] + a4[1]);
      const nvz = vz + dt / 6 * (a1[2] + 2 * a2[2] + 2 * a3[2] + a4[2]);
      x += dt * (vx + nvx) / 2; y += dt * (vy + nvy) / 2; z += dt * (vz + nvz) / 2;
      vx = nvx; vy = nvy; vz = nvz; t += dt;

      while (next < atYd.length && x >= atYd[next] * 3) {
        const target = atYd[next] * 3;
        const f = (target - px) / (x - px);
        const v = pv + (Math.hypot(vx, vy, vz) - pv) * f;
        out.push({
          yd: atYd[next],
          y: py + (y - py) * f,
          z: pz + (z - pz) * f,
          v,
          t: pt + (t - pt) * f,
        });
        next++;
      }
      if (x > maxFt + 3) break;
    }
    return out;
  }

  // Launch angle that puts the bullet on the line of sight at the zero range (no wind).
  function zeroAngle(load, atm) {
    const noWind = { x: 0, z: 0 };
    const yAt = (a) => fly(load, atm, a, noWind, [load.zeroYd])[0].y;
    let a0 = 0, a1 = 0.002;
    let y0 = yAt(a0), y1 = yAt(a1);
    for (let i = 0; i < 20 && Math.abs(y1) > 1e-6; i++) {
      const a2 = a1 - y1 * (a1 - a0) / (y1 - y0);
      a0 = a1; y0 = y1; a1 = a2; y1 = yAt(a1);
    }
    return a1;
  }

  /**
   * load: { mv, bc, model: "G1"|"G7", sightHeightIn, zeroYd }
   * env:  { tempF, altFt, pressureInHg?, windMph, windClock, slopeDeg? }
   * yards: ascending list of ranges to report, measured along the sight line
   * (what a rangefinder reads). slopeDeg: + = target above, - = below.
   * The zero is always solved on level ground.
   * Returns rows with elevation (mils, + = dial up), wind hold (mils, + = hold right),
   * drop and drift in inches, velocity (fps) and time of flight (s).
   */
  function solve(load, env, yards) {
    const atm = atmosphere(env);
    const angle = zeroAngle(load, atm);
    const slope = (env.slopeDeg || 0) * Math.PI / 180;
    const rows = fly(load, atm, angle, windVector(env.windMph, env.windClock), yards, slope);
    return rows.map((r) => {
      const xFt = r.yd * 3;
      return {
        yd: r.yd,
        elevMil: -Math.atan2(r.y, xFt) * 1000,
        windMil: -Math.atan2(r.z, xFt) * 1000,
        dropIn: r.y * 12,
        driftIn: r.z * 12,
        velocity: r.v,
        tof: r.t,
        mach: r.v / atm.speedOfSound,
      };
    });
  }

  // Sight-line angle in degrees for a target heightFt above (+) or below (-)
  // the shooter at a line-of-sight distance of yd yards.
  function slopeFromHeight(heightFt, yd) {
    const r = heightFt / (yd * 3);
    return Math.abs(r) >= 1 ? NaN : Math.asin(r) * 180 / Math.PI;
  }

  const api = { solve, slopeFromHeight, atmosphere, pressureAtAltitude, windVector, cd, G1, G7 };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Ballistics = api;
})(typeof window !== "undefined" ? window : globalThis);
