/**
 * Shading and Venetian Blind (Raffstore) Slat Tilt Calculations
 * Based on solar geometry.
 */

'use strict';

const SunCalc = require('suncalc');

/**
 * Calculates solar position (Azimuth & Elevation) in compass degrees.
 * 
 * @param {number} latitude - Latitude in degrees
 * @param {number} longitude - Longitude in degrees
 * @param {Date} [date] - Calculation date/time (default: now)
 * @returns {{azimuth: number, elevation: number}} Solar position in degrees
 */
function calculateSunPosition(latitude, longitude, date) {
  const d = date || new Date();
  const sunPos = SunCalc.getPosition(d, latitude, longitude);

  // Convert elevation (altitude) from radians to degrees
  const elevation = sunPos.altitude * 180 / Math.PI;

  // SunCalc Azimuth is in radians: 0 is South, positive is West, negative is East.
  // We convert it to standard compass degrees: 0° = North, 90° = East, 180° = South, 270° = West.
  let azimuth = (sunPos.azimuth * 180 / Math.PI + 180) % 360;
  if (azimuth < 0) {
    azimuth += 360;
  }

  return {
    azimuth: Math.round(azimuth * 100) / 100,
    elevation: Math.round(elevation * 100) / 100
  };
}

/**
 * Calculates the solar profile angle for a specific window/facade orientation.
 * The profile angle represents the vertical angle of the sun's rays projected
 * onto a plane perpendicular to the facade.
 * 
 * @param {number} sunAzimuth - Solar azimuth in degrees (0-360)
 * @param {number} sunElevation - Solar elevation in degrees (-90 to 90)
 * @param {number} facadeAzimuth - Facade compass orientation in degrees (0-360)
 * @returns {number|null} Profile angle in degrees, or null if the sun is behind the facade
 */
function calculateProfileAngle(sunAzimuth, sunElevation, facadeAzimuth) {
  // If sun is below the horizon, there's no shading calculation needed.
  if (sunElevation <= 0) {
    return null;
  }

  // Convert inputs to radians
  const alphaS = sunElevation * Math.PI / 180;
  const gammaS = sunAzimuth * Math.PI / 180;
  const gammaW = facadeAzimuth * Math.PI / 180;

  // Difference in azimuth
  const deltaGamma = gammaS - gammaW;

  // Sun is behind the facade if the absolute difference is greater than 90 degrees (pi/2 radians)
  // We allow a small tolerance of 90 degrees since direct rays cannot hit the window then.
  const cosDeltaGamma = Math.cos(deltaGamma);
  if (cosDeltaGamma <= 0) {
    return null; // Sun is behind the window plane
  }

  // Calculate profile angle (beta_p)
  // beta_p = arctan( tan(elevation) / cos(sun_azimuth - facade_azimuth) )
  const tanAlphaS = Math.tan(alphaS);
  const betaPRad = Math.atan(tanAlphaS / cosDeltaGamma);
  
  return betaPRad * 180 / Math.PI;
}

/**
 * Calculates the optimal slat tilt angle for a venetian blind (Raffstore) to block direct sun.
 * Slat angle: 0° is horizontal (fully open), 90° is vertical (fully closed down).
 * 
 * @param {number} profileAngle - Solar profile angle in degrees (0-90)
 * @param {number} slatWidth - Width of a single slat in mm (L)
 * @param {number} slatSpacing - Spacing between two slats in mm (d)
 * @returns {number} Optimal slat tilt angle in degrees (0-90)
 */
function calculateSlatAngle(profileAngle, slatWidth, slatSpacing) {
  if (profileAngle === null || profileAngle === undefined || profileAngle < 0) {
    return 0; // default horizontal/open
  }

  // Convert profile angle to radians
  const betaP = profileAngle * Math.PI / 180;

  // Formula: theta = arcsin( (d / L) * cos(beta_p) ) - beta_p
  // Ratio: d/L * cos(beta_p)
  const ratio = (slatSpacing / slatWidth) * Math.cos(betaP);

  // If the ratio is >= 1, the sun is so low (or spacing so large) that the slats
  // must be fully closed to block direct sun.
  if (ratio >= 1) {
    return 90;
  }

  // Calculate the tilt angle
  const thetaRad = Math.asin(ratio) - betaP;
  let thetaDeg = thetaRad * 180 / Math.PI;

  // Clamp angle to valid physical range: 0° (fully open/horizontal) to 90° (fully closed down)
  if (thetaDeg < 0) {
    thetaDeg = 0;
  }
  if (thetaDeg > 90) {
    thetaDeg = 90;
  }

  return Math.round(thetaDeg * 100) / 100;
}

/**
 * Maps a slat angle in degrees (0° = open, 90° = closed) to a target state percentage (0-100%).
 * 
 * Many actuators use 0% = closed, 100% = open, or 50% = open, 0% = closed.
 * To support multiple mappings:
 * - standard: 0% = open (horizontal), 100% = closed (vertical).
 * - inverted: 100% = open (horizontal), 0% = closed (vertical).
 * 
 * @param {number} slatAngleDeg - Slat angle in degrees (0-90)
 * @param {boolean} [invert] - If true, inverts the output percentage
 * @returns {number} Percentage value (0-100)
 */
function mapSlatAngleToPercent(slatAngleDeg, invert) {
  // Slat angle is 0 (open) to 90 (closed)
  // Linear mapping: 0° -> 0%, 90° -> 100%
  let percent = (slatAngleDeg / 90) * 100;

  if (invert) {
    percent = 100 - percent;
  }

  return Math.round(percent);
}

module.exports = {
  calculateSunPosition,
  calculateProfileAngle,
  calculateSlatAngle,
  mapSlatAngleToPercent
};