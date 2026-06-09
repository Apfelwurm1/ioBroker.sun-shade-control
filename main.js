/**
 * ioBroker.sun-shade-control
 *
 * Sun position based shading and venetian blind slat tracking control
 */

'use strict';

const utils = require('@iobroker/adapter-core');
const shading = require('./lib/shading');

class SunShadeControl extends utils.Adapter {
  /**
   * @param {Partial<utils.AdapterOptions>} [options]
   */
  constructor(options) {
    super({
      ...options,
      name: 'sun-shade-control',
    });
    this.on('ready', this.onReady.bind(this));
    this.on('stateChange', this.onStateChange.bind(this));
    this.on('unload', this.onUnload.bind(this));
    this.on('message', this.onMessage.bind(this));

    this.updateInterval = null;
    this.recalcTimeout = null;
    this.statesCache = {};
    
    // Tracking adapter commands to detect manual override
    this.lastCommands = {};
    this.targetValues = {};
    this.preOpenStates = {};
    this.globalShadingActive = false;
    this.lastShadingTarget = false;
    this.shadingTargetChangeTime = 0;
    this.firstRunDone = false;
    this.windAlarmActive = false;
    this.windResetTimeout = null;
  }

  /**
   * Helper to check if the wind sensor value triggers a wind alarm.
   * @param {any} windVal
   * @returns {boolean}
   */
  isWindAlarm(windVal) {
    if (windVal === undefined || windVal === null) return false;
    if (typeof windVal === 'boolean') {
      return windVal;
    } else if (typeof windVal === 'string' && (windVal === 'true' || windVal === '1')) {
      return true;
    } else {
      const windSpeed = parseFloat(windVal);
      const threshold = parseFloat(this.config.windThreshold) || 15;
      if (!isNaN(windSpeed)) {
        return windSpeed >= threshold;
      }
    }
    return false;
  }

  /**
   * Is called when databases are connected and adapter received configuration.
   */
  async onReady() {
    this.log.info('Starting Sun Shade Control adapter...');

    // 1. Resolve coordinates
    let lat = parseFloat(this.config.latitude);
    let lon = parseFloat(this.config.longitude);

    if (isNaN(lat) || isNaN(lon) || this.config.latitude === '' || this.config.longitude === '') {
      this.log.info('Coordinates not set in config, trying to fetch from system configuration...');
      try {
        const systemConfig = await this.getForeignObjectAsync('system.config');
        if (systemConfig && systemConfig.common) {
          lat = parseFloat(systemConfig.common.latitude);
          lon = parseFloat(systemConfig.common.longitude);
        }
      } catch (err) {
        this.log.error(`Failed to get system coordinates: ${err.message}`);
      }
    }

    if (isNaN(lat) || isNaN(lon)) {
      this.log.error('Invalid or missing coordinates! Latitude and Longitude must be configured either in the adapter settings or the ioBroker system settings.');
      this.terminate ? this.terminate() : process.exit(1);
      return;
    }

    this.latitude = lat;
    this.longitude = lon;
    this.log.info(`Using coordinates: Latitude ${this.latitude}, Longitude ${this.longitude}`);

    // 2. Initialize device states and subscribe
    if (!this.config.devices || this.config.devices.length === 0) {
      this.log.warn('No devices configured.');
    } else {
      await this.initDevices();
    }

    // 3. Subscribe to global sensors
    if (this.config.tempSensorId) {
      this.log.info(`Subscribing to temperature sensor: ${this.config.tempSensorId}`);
      await this.subscribeForeignStatesAsync(this.config.tempSensorId);
      const tempState = await this.getForeignStateAsync(this.config.tempSensorId);
      if (tempState) {
        this.statesCache[this.config.tempSensorId] = tempState.val;
      }
    }

    if (this.config.luxSensorId) {
      this.log.info(`Subscribing to brightness sensor: ${this.config.luxSensorId}`);
      await this.subscribeForeignStatesAsync(this.config.luxSensorId);
      const luxState = await this.getForeignStateAsync(this.config.luxSensorId);
      if (luxState) {
        this.statesCache[this.config.luxSensorId] = luxState.val;
      }
    }

    if (this.config.windSensorId) {
      this.log.info(`Subscribing to wind sensor: ${this.config.windSensorId}`);
      await this.subscribeForeignStatesAsync(this.config.windSensorId);
      const windState = await this.getForeignStateAsync(this.config.windSensorId);
      if (windState) {
        this.statesCache[this.config.windSensorId] = windState.val;
        this.windAlarmActive = this.isWindAlarm(windState.val);
      }
    }

    if (this.config.fireSensorId) {
      this.log.info(`Subscribing to fire sensor: ${this.config.fireSensorId}`);
      await this.subscribeForeignStatesAsync(this.config.fireSensorId);
      const fireState = await this.getForeignStateAsync(this.config.fireSensorId);
      if (fireState) {
        this.statesCache[this.config.fireSensorId] = fireState.val;
      }
    }

    if (this.config.holidaySensorId) {
      this.log.info(`Subscribing to holiday sensor: ${this.config.holidaySensorId}`);
      await this.subscribeForeignStatesAsync(this.config.holidaySensorId);
      const holidayState = await this.getForeignStateAsync(this.config.holidaySensorId);
      if (holidayState) {
        this.statesCache[this.config.holidaySensorId] = holidayState.val;
      }
    }

    if (this.config.frostStateId) {
      this.log.info(`Subscribing to frost warning state: ${this.config.frostStateId}`);
      await this.subscribeForeignStatesAsync(this.config.frostStateId);
      const frostState = await this.getForeignStateAsync(this.config.frostStateId);
      if (frostState) {
        this.statesCache[this.config.frostStateId] = frostState.val;
      }
    }

    if (this.config.rainSensorId) {
      this.log.info(`Subscribing to rain sensor: ${this.config.rainSensorId}`);
      await this.subscribeForeignStatesAsync(this.config.rainSensorId);
      const rainState = await this.getForeignStateAsync(this.config.rainSensorId);
      if (rainState) {
        this.statesCache[this.config.rainSensorId] = rainState.val;
      }
    }

    if (this.config.presenceSensorId) {
      this.log.info(`Subscribing to presence sensor: ${this.config.presenceSensorId}`);
      await this.subscribeForeignStatesAsync(this.config.presenceSensorId);
      const presenceState = await this.getForeignStateAsync(this.config.presenceSensorId);
      if (presenceState) {
        this.statesCache[this.config.presenceSensorId] = presenceState.val;
      }
    }

    // Subscribe to area In-Bed states
    if (this.config.areas && this.config.areas.length > 0) {
      for (const area of this.config.areas) {
        if (area.inBedId) {
          this.log.info(`Subscribing to In-Bed sensor for zone ${area.name || area.id}: ${area.inBedId}`);
          await this.subscribeForeignStatesAsync(area.inBedId);
          const inBedState = await this.getForeignStateAsync(area.inBedId);
          if (inBedState) {
            this.statesCache[area.inBedId] = inBedState.val;
          }
        }
      }
    }

    // 4. Run first calculation
    await this.runCalculation();

    // 5. Start periodic update timer
    const intervalMs = (this.config.updateInterval || 2) * 60 * 1000;
    this.log.info(`Shading calculation timer started. Interval: ${this.config.updateInterval || 2} minutes.`);
    this.updateInterval = this.setInterval(async () => {
      await this.runCalculation();
    }, intervalMs);
  }

  /**
   * Initializes state objects for each configured device and subscribes to state changes.
   */
  async initDevices() {
    for (const device of this.config.devices) {
      if (!device.name) continue;

      const cleanName = device.name.replace(/[^a-zA-Z0-9_-]/g, '_');
      
      // Create auto control channel & states
      await this.extendObjectAsync(`devices.${cleanName}`, {
        type: 'channel',
        common: {
          name: device.name
        },
        native: {}
      });

      await this.extendObjectAsync(`devices.${cleanName}.auto`, {
        type: 'state',
        common: {
          name: 'Automatic shading control active',
          type: 'boolean',
          role: 'switch.enable',
          read: true,
          write: true,
          def: true
        },
        native: {}
      });

      await this.extendObjectAsync(`devices.${cleanName}.shadingActive`, {
        type: 'state',
        common: {
          name: 'Shading currently active',
          type: 'boolean',
          role: 'indicator',
          read: true,
          write: false,
          def: false
        },
        native: {}
      });

      await this.extendObjectAsync(`devices.${cleanName}.manualOverride`, {
        type: 'state',
        common: {
          name: 'Manual override detected',
          type: 'boolean',
          role: 'indicator',
          read: true,
          write: false,
          def: false
        },
        native: {}
      });

      // Subscribe to our own auto control state
      await this.subscribeStatesAsync(`devices.${cleanName}.auto`);

      // Read current values of our states
      const autoState = await this.getStateAsync(`devices.${cleanName}.auto`);
      this.statesCache[`${this.namespace}.devices.${cleanName}.auto`] = autoState ? autoState.val : true;

      // Subscribe to foreign actuator states (to detect manual adjustment)
      if (device.stateHeight) {
        this.log.debug(`Subscribing to actuator height: ${device.stateHeight}`);
        await this.subscribeForeignStatesAsync(device.stateHeight);
        const heightState = await this.getForeignStateAsync(device.stateHeight);
        if (heightState) {
          this.statesCache[device.stateHeight] = heightState.val;
          this.targetValues[device.stateHeight] = heightState.val;
        }
      }

      if (device.type === 'venetian' && device.stateTilt) {
        this.log.debug(`Subscribing to actuator tilt: ${device.stateTilt}`);
        await this.subscribeForeignStatesAsync(device.stateTilt);
        const tiltState = await this.getForeignStateAsync(device.stateTilt);
        if (tiltState) {
          this.statesCache[device.stateTilt] = tiltState.val;
          this.targetValues[device.stateTilt] = tiltState.val;
        }
      }

      // Subscribe to contact sensors
      if (device.contactId) {
        this.log.debug(`Subscribing to window contact: ${device.contactId}`);
        await this.subscribeForeignStatesAsync(device.contactId);
        const contactState = await this.getForeignStateAsync(device.contactId);
        if (contactState) {
          this.statesCache[device.contactId] = contactState.val;
        }
      }
    }
  }

  /**
   * Run calculation and update all actuators.
   */
  async runCalculation() {
    const now = new Date();
    const sunPos = shading.calculateSunPosition(this.latitude, this.longitude, now);

    // Update solar info states
    await this.setStateAsync('sun.azimuth', sunPos.azimuth, true);
    await this.setStateAsync('sun.elevation', sunPos.elevation, true);
    await this.setStateAsync('sun.lastUpdate', now.toISOString(), true);

    this.log.debug(`Calculated solar position: Azimuth ${sunPos.azimuth}°, Elevation ${sunPos.elevation}°`);

    // Check Frost Protection
    let frostProtectionActive = false;
    if (this.config.frostStateId) {
      const frostVal = this.statesCache[this.config.frostStateId];
      frostProtectionActive = frostVal === true || frostVal === 'true' || frostVal === 1 || frostVal === '1';
    }
    // Also check temperature against frostTempThreshold
    if (this.config.tempSensorId) {
      const currentTemp = parseFloat(this.statesCache[this.config.tempSensorId]);
      const threshold = parseFloat(this.config.frostTempThreshold) || 0;
      if (!isNaN(currentTemp) && currentTemp <= threshold) {
        frostProtectionActive = true;
      }
    }
    if (frostProtectionActive) {
      this.log.debug('Frost protection is active. Movements will be blocked for non-emergency situations.');
    }

    // Check global safety conditions
    let fireAlarmActive = false;
    if (this.config.fireSensorId) {
      const fireVal = this.statesCache[this.config.fireSensorId];
      fireAlarmActive = fireVal === true || fireVal === 'true' || fireVal === 1 || fireVal === '1' || fireVal === 'fire' || fireVal === 'alarm';
    }

    let windAlarmActive = this.windAlarmActive;

    if (fireAlarmActive) {
      this.log.warn('FIRE ALARM TRIGGERED! All blinds and shutters will be raised for safety.');
    }
    if (windAlarmActive) {
      this.log.warn('WIND ALARM TRIGGERED! Blinds will be raised to prevent damage.');
    }

    // Check Rain Sensor
    let rainActive = false;
    if (this.config.rainSensorId) {
      const rainVal = this.statesCache[this.config.rainSensorId];
      rainActive = rainVal === true || rainVal === 'true' || rainVal === 1 || rainVal === '1';
    }

    // Check Presence Sensor
    let isPresent = true;
    if (this.config.presenceSensorId) {
      const presenceVal = this.statesCache[this.config.presenceSensorId];
      if (presenceVal !== undefined && presenceVal !== null) {
        isPresent = presenceVal === true || presenceVal === 'true' || presenceVal === 1 || presenceVal === '1';
      }
    }

    // Check global shading conditions
    let tempConditionMet = true;
    if (this.config.tempSensorId) {
      const currentTemp = parseFloat(this.statesCache[this.config.tempSensorId]);
      const threshold = parseFloat(this.config.tempThreshold) || 23;
      if (!isNaN(currentTemp)) {
        tempConditionMet = currentTemp >= threshold;
        this.log.debug(`Temperature check: current ${currentTemp}°C, threshold ${threshold}°C -> met: ${tempConditionMet}`);
      } else {
        this.log.debug(`Temperature sensor value not available. Assuming met.`);
      }
    }

    let luxConditionMet = true;
    if (this.config.luxSensorId) {
      const currentLux = parseFloat(this.statesCache[this.config.luxSensorId]);
      const threshold = parseFloat(this.config.luxThreshold) || 20000;
      if (!isNaN(currentLux)) {
        luxConditionMet = currentLux >= threshold;
        this.log.debug(`Lux check: current ${currentLux}, threshold ${threshold} -> met: ${luxConditionMet}`);
      } else {
        this.log.debug(`Lux sensor value not available. Assuming met.`);
      }
    }

    const globalShadingTriggeredTarget = tempConditionMet && luxConditionMet;

    // Apply delays (hysteresis) to shading trigger
    if (!this.firstRunDone) {
      this.globalShadingActive = globalShadingTriggeredTarget;
      this.lastShadingTarget = globalShadingTriggeredTarget;
      this.shadingTargetChangeTime = Date.now();
      this.firstRunDone = true;
    } else {
      if (globalShadingTriggeredTarget !== this.lastShadingTarget) {
        this.lastShadingTarget = globalShadingTriggeredTarget;
        this.shadingTargetChangeTime = Date.now();
        this.log.debug(`Shading trigger target changed to ${globalShadingTriggeredTarget}. Waiting for delay filter...`);
      }

      if (globalShadingTriggeredTarget !== this.globalShadingActive) {
        const timeDiffMins = (Date.now() - this.shadingTargetChangeTime) / 60000;
        const delayLimit = globalShadingTriggeredTarget ? (parseFloat(this.config.shadingStartDelay) || 2) : (parseFloat(this.config.shadingEndDelay) || 15);
        if (timeDiffMins >= delayLimit) {
          this.globalShadingActive = globalShadingTriggeredTarget;
          this.log.info(`Shading state successfully transitioned to ${this.globalShadingActive} after waiting ${timeDiffMins.toFixed(1)} minutes.`);
        } else {
          this.log.debug(`Shading state waiting to transition to ${globalShadingTriggeredTarget}. Elapsed: ${timeDiffMins.toFixed(1)} / ${delayLimit} mins.`);
        }
      }
    }

    const globalShadingTriggered = this.globalShadingActive;

    // Process each device
    for (const device of this.config.devices) {
      if (!device.name || !device.enabled) continue;

      const cleanName = device.name.replace(/[^a-zA-Z0-9_-]/g, '_');
      const isAuto = this.statesCache[`${this.namespace}.devices.${cleanName}.auto`] !== false;

      // 1. Check window contact (Aussperrschutz)
      let contactOpen = false;
      if (device.contactId) {
        const contactVal = this.statesCache[device.contactId];
        // Handle boolean true or 'open' string or number 1 as open
        contactOpen = contactVal === true || contactVal === 'open' || contactVal === 1 || contactVal === '1';
      }

      // Check Rain Action
      let rainTriggered = false;
      let rainHeight = 100;
      let rainTilt = 0;
      if (rainActive && device.rainAction && device.rainAction !== 'none') {
        rainTriggered = true;
        if (device.rainAction === 'open') {
          rainHeight = 100;
          rainTilt = shading.mapSlatAngleToPercent(0, device.invertTilt);
        } else if (device.rainAction === 'close') {
          rainHeight = 0;
          rainTilt = 0;
        }
      }

      // Check Presence / Away Action
      let presenceTriggered = false;
      let presenceHeight = 100;
      let presenceTilt = 0;
      if (!isPresent && this.config.awayAction && this.config.awayAction !== 'none') {
        presenceTriggered = true;
        if (this.config.awayAction === 'closeAll' || this.config.awayAction === 'lockClosed') {
          presenceHeight = 0;
          presenceTilt = 0;
        } else if (this.config.awayAction === 'lockOpen') {
          presenceHeight = 100;
          presenceTilt = shading.mapSlatAngleToPercent(0, device.invertTilt);
        }
      }

      // Safety alarms always run, even if auto control is disabled for a device
      const forceSafety = fireAlarmActive || windAlarmActive || contactOpen || rainTriggered || presenceTriggered;

      if (!isAuto && !forceSafety) {
        this.log.debug(`Device ${device.name} is in manual mode, skipping.`);
        continue;
      }

      // 2. Resolve Area/Zone configuration
      let area = null;
      if (this.config.areas && this.config.areas.length > 0) {
        area = this.config.areas.find(a => a.id === device.areaId) || this.config.areas.find(a => a.id === 'global') || this.config.areas[0];
      }

      const isDaytime = this.isItDaytime(area, now);

      let targetHeight = 100; // default fully open
      let targetTilt = 100;   // default fully open/horizontal
      let shadingActive = false;

      if (fireAlarmActive) {
        // Fire -> safety open to clear escape routes
        targetHeight = 100;
        targetTilt = shading.mapSlatAngleToPercent(0, device.invertTilt); // horizontal/open
        this.log.debug(`Device ${device.name}: FIRE ALARM -> raising to 100%`);
      } else if (windAlarmActive) {
        // Wind -> safety open to prevent physical damage
        targetHeight = 100;
        targetTilt = shading.mapSlatAngleToPercent(0, device.invertTilt); // horizontal/open
        this.log.debug(`Device ${device.name}: WIND ALARM -> raising to 100%`);
      } else if (contactOpen) {
        // Window is open -> safety override (Aussperrschutz)
        targetHeight = (device.contactOpenPos !== undefined && device.contactOpenPos !== '') ? parseInt(device.contactOpenPos, 10) : 100;
        if (isNaN(targetHeight)) targetHeight = 100;
        targetTilt = shading.mapSlatAngleToPercent(0, device.invertTilt); // horizontal/open
        this.log.debug(`Device ${device.name}: window contact open -> moving to safety position (${targetHeight}%)`);
      } else if (rainTriggered) {
        targetHeight = rainHeight;
        targetTilt = rainTilt;
        this.log.debug(`Device ${device.name}: rain protection active -> executing action "${device.rainAction}" (Height: ${targetHeight}%)`);
      } else if (presenceTriggered) {
        targetHeight = presenceHeight;
        targetTilt = presenceTilt;
        this.log.debug(`Device ${device.name}: presence active (Away) -> executing action "${this.config.awayAction}" (Height: ${targetHeight}%)`);
      } else if (frostProtectionActive) {
        // Frost active, and no emergency safety -> block movement
        this.log.debug(`Device ${device.name}: Frost protection warning -> movement blocked (keeping current position)`);
        continue;
      } else if (!isDaytime) {
        // Nighttime -> Close completely
        targetHeight = 0;
        targetTilt = 0;
        this.log.debug(`Device ${device.name}: Nighttime -> closing`);
      } else {
        // Daytime -> Calculate shading
        const minElevation = (device.minElevation !== undefined && device.minElevation !== '') ? parseFloat(device.minElevation) : 5;
        const elevationOk = sunPos.elevation >= minElevation;

        const tolerance = (device.azimuthTolerance !== undefined && device.azimuthTolerance !== '') ? parseFloat(device.azimuthTolerance) : 90;
        const diff = Math.abs(sunPos.azimuth - parseFloat(device.facadeAzimuth));
        const normalizedDiff = diff > 180 ? 360 - diff : diff;
        const azimuthOk = normalizedDiff <= tolerance;

        const profileAngle = shading.calculateProfileAngle(sunPos.azimuth, sunPos.elevation, parseFloat(device.facadeAzimuth));

        if (profileAngle !== null && globalShadingTriggered && elevationOk && azimuthOk) {
          // Sun is on the facade and thresholds are met
          shadingActive = true;
          targetHeight = (device.shadingHeight !== undefined && device.shadingHeight !== '') ? parseInt(device.shadingHeight, 10) : 80;
          if (isNaN(targetHeight)) targetHeight = 80;

          if (device.type === 'venetian') {
            const slatAngleDeg = shading.calculateSlatAngle(profileAngle, parseFloat(device.slatWidth) || 80, parseFloat(device.slatSpacing) || 72);
            let rawTilt = shading.mapSlatAngleToPercent(slatAngleDeg, device.invertTilt);
            const minTilt = (device.minTiltPercent !== undefined && device.minTiltPercent !== '') ? parseFloat(device.minTiltPercent) : 0;
            const maxTilt = (device.maxTiltPercent !== undefined && device.maxTiltPercent !== '') ? parseFloat(device.maxTiltPercent) : 100;
            targetTilt = Math.max(minTilt, Math.min(maxTilt, rawTilt));
            this.log.debug(`Device ${device.name}: Shading active -> profile angle: ${profileAngle.toFixed(1)}°, slat angle: ${slatAngleDeg.toFixed(1)}° -> tilt target: ${targetTilt}% (clamped from ${rawTilt}%)`);
          } else {
            this.log.debug(`Device ${device.name}: Shading active -> target height: ${targetHeight}%`);
          }
        } else {
          // Daytime, but no shading triggered
          targetHeight = 100; // open
          // Tilt for venetian when open should be horizontal (0° tilt)
          targetTilt = shading.mapSlatAngleToPercent(0, device.invertTilt);
          this.log.debug(`Device ${device.name}: Daytime, no shading -> opening`);
        }
      }

      // Apply mapping for inverted height (Shelly / standard config)
      // Standard: 100% = open, 0% = closed.
      // If device.invertHeight is true: 0% = open, 100% = closed.
      let actualTargetHeight = targetHeight;
      if (device.invertHeight) {
        actualTargetHeight = 100 - targetHeight;
      }

      // Set states in ioBroker
      await this.setStateAsync(`devices.${cleanName}.shadingActive`, shadingActive, true);

      // Write target position to actuator if changed
      if (device.stateHeight) {
        const currentPos = this.statesCache[device.stateHeight];
        if (currentPos === undefined || Math.abs(currentPos - actualTargetHeight) > 1) {
          this.log.info(`Setting height for ${device.name} (${device.stateHeight}) to ${actualTargetHeight}% (shading: ${shadingActive})`);
          this.lastCommands[device.stateHeight] = Date.now();
          this.targetValues[device.stateHeight] = actualTargetHeight;
          await this.setForeignStateAsync(device.stateHeight, actualTargetHeight);
        }
      }

      // Write target tilt to venetian actuator if changed
      if (device.type === 'venetian' && device.stateTilt) {
        const currentTilt = this.statesCache[device.stateTilt];
        if (currentTilt === undefined || Math.abs(currentTilt - targetTilt) > 1) {
          this.log.info(`Setting tilt for ${device.name} (${device.stateTilt}) to ${targetTilt}%`);
          this.lastCommands[device.stateTilt] = Date.now();
          this.targetValues[device.stateTilt] = targetTilt;
          await this.setForeignStateAsync(device.stateTilt, targetTilt);
        }
      }
    }
  }

  /**
   * Run calculations debounced to prevent rapid consecutive runs on multiple sensor changes.
   */
  runCalculationDebounced() {
    if (this.recalcTimeout) {
      clearTimeout(this.recalcTimeout);
    }
    this.recalcTimeout = this.setTimeout(() => {
      this.recalcTimeout = null;
      this.runCalculation().catch(err => {
        this.log.error(`Error in shading calculation: ${err.message}`);
      });
    }, 5000);
  }

  /**
   * Is called if a subscribed state changes
   * @param {string} id
   * @param {ioBroker.State | null | undefined} state
   */
  async onStateChange(id, state) {
    if (!state) {
      // State was deleted
      delete this.statesCache[id];
      return;
    }

    this.log.debug(`State changed: ${id} = ${state.val} (ack: ${state.ack})`);
    
    const oldVal = this.statesCache[id];
    this.statesCache[id] = state.val;

    // Check if it's one of our own control states
    if (id.startsWith(`${this.namespace}.devices.`)) {
      const parts = id.split('.');
      const cleanName = parts[3];
      const stateName = parts[4];

      if (stateName === 'auto') {
        if (state.val !== oldVal) {
          this.log.info(`Auto mode for device ${cleanName} changed to: ${state.val}`);
          if (state.val) {
            // Reset manual override flag
            await this.setStateAsync(`devices.${cleanName}.manualOverride`, false, true);
          }
          this.runCalculationDebounced();
        }
      }
    } else {
      // It's a foreign state (sensor, window contact, or actuator height/tilt)
      let needsRecalc = false;

      // Global sensors trigger recalculation
      if (id === this.config.tempSensorId || id === this.config.luxSensorId || 
          id === this.config.fireSensorId || id === this.config.holidaySensorId || id === this.config.frostStateId ||
          id === this.config.rainSensorId || id === this.config.presenceSensorId) {
        if (state.val !== oldVal) {
          needsRecalc = true;
        }
      }

      // Wind sensor triggers recalculation with hysteresis delay
      if (id === this.config.windSensorId) {
        if (state.val !== oldVal) {
          const isAlarm = this.isWindAlarm(state.val);
          if (isAlarm) {
            if (this.windResetTimeout) {
              this.clearTimeout(this.windResetTimeout);
              this.windResetTimeout = null;
            }
            if (!this.windAlarmActive) {
              this.windAlarmActive = true;
              this.log.warn(`Wind alarm active: wind speed/state exceeded threshold.`);
              needsRecalc = true;
            }
          } else {
            // Alarm cleared, but apply hysteresis delay
            if (this.windAlarmActive && !this.windResetTimeout) {
              const delayMin = parseFloat(this.config.windAlarmEndDelay);
              const delayMs = (!isNaN(delayMin) ? delayMin : 5) * 60 * 1000;
              this.log.info(`Wind alarm cleared. Waiting ${!isNaN(delayMin) ? delayMin : 5} minutes hysteresis before clearing wind alarm.`);
              this.windResetTimeout = this.setTimeout(async () => {
                this.windResetTimeout = null;
                this.windAlarmActive = false;
                this.log.info(`Wind hysteresis ended. Clearing wind alarm.`);
                await this.runCalculation();
              }, delayMs);
            }
          }
        }
      }

      // Check In-Bed states for recalculation
      if (this.config.areas && this.config.areas.length > 0) {
        for (const area of this.config.areas) {
          if (id === area.inBedId) {
            if (state.val !== oldVal) {
              this.log.info(`In-Bed state for zone ${area.name || area.id} changed to ${state.val}`);
              needsRecalc = true;
            }
          }
        }
      }

      // Check device-specific triggers
      for (const device of this.config.devices) {
        if (!device.name || !device.enabled) continue;
        const cleanName = device.name.replace(/[^a-zA-Z0-9_-]/g, '_');

        if (id === device.contactId) {
          if (state.val !== oldVal) {
            const contactOpen = state.val === true || state.val === 'open' || state.val === 1 || state.val === '1';
            const wasOpen = oldVal === true || oldVal === 'open' || oldVal === 1 || oldVal === '1';
            
            this.log.info(`Window contact for ${device.name} changed to ${state.val}`);
            
            // Capture or restore manual states on transitions
            if (contactOpen && !wasOpen) {
              // Capture pre-open state
              if (device.stateHeight) {
                const currentHeight = this.statesCache[device.stateHeight];
                this.preOpenStates[device.stateHeight] = currentHeight !== undefined ? currentHeight : 100;
              }
              if (device.type === 'venetian' && device.stateTilt) {
                const currentTilt = this.statesCache[device.stateTilt];
                this.preOpenStates[device.stateTilt] = currentTilt !== undefined ? currentTilt : 100;
              }
            } else if (!contactOpen && wasOpen) {
              // Contact closed. If device is in manual mode, restore captured state
              const isAuto = this.statesCache[`${this.namespace}.devices.${cleanName}.auto`] !== false;
              if (!isAuto) {
                if (device.stateHeight) {
                  const savedHeight = this.preOpenStates[device.stateHeight];
                  if (savedHeight !== undefined) {
                    this.log.info(`Window contact closed: Restoring height for manual device ${device.name} to ${savedHeight}%`);
                    this.lastCommands[device.stateHeight] = Date.now();
                    this.targetValues[device.stateHeight] = savedHeight;
                    await this.setForeignStateAsync(device.stateHeight, savedHeight);
                  }
                }
                if (device.type === 'venetian' && device.stateTilt) {
                  const savedTilt = this.preOpenStates[device.stateTilt];
                  if (savedTilt !== undefined) {
                    this.log.info(`Window contact closed: Restoring tilt for manual device ${device.name} to ${savedTilt}%`);
                    this.lastCommands[device.stateTilt] = Date.now();
                    this.targetValues[device.stateTilt] = savedTilt;
                    await this.setForeignStateAsync(device.stateTilt, savedTilt);
                  }
                }
              }
              // Clean up pre-open state
              if (device.stateHeight) delete this.preOpenStates[device.stateHeight];
              if (device.stateTilt) delete this.preOpenStates[device.stateTilt];
            }

            needsRecalc = true;
          }
        }

        // Manual override detection
        if (id === device.stateHeight || id === device.stateTilt) {
          const isAuto = this.statesCache[`${this.namespace}.devices.${cleanName}.auto`] !== false;
          if (isAuto) {
            const lastCommandTime = this.lastCommands[id] || 0;
            const timeDiff = Date.now() - lastCommandTime;

            // If the actuator position changed significantly, and we didn't send a command in the last 15 seconds
            const targetVal = this.targetValues[id];
            if (targetVal !== undefined && Math.abs(state.val - targetVal) > 2) {
              if (timeDiff > 15000) {
                this.log.info(`Manual override detected for device ${device.name} via state ${id} (current: ${state.val}%, expected: ${targetVal}%). Disabling auto mode.`);
                await this.setStateAsync(`devices.${cleanName}.manualOverride`, true, true);
                await this.setStateAsync(`devices.${cleanName}.auto`, false, true);
                this.statesCache[`${this.namespace}.devices.${cleanName}.auto`] = false;
              }
            }
          }
        }
      }

      if (needsRecalc) {
        this.runCalculationDebounced();
      }
    }
  }

  /**
   * Helper to parse "HH:MM" time string into a Date object on a reference day.
   * @param {string} timeStr - Time string "HH:MM"
   * @param {Date} referenceDate - Reference Date object
   * @returns {Date|null} Parsed Date object or null
   */
  parseTimeString(timeStr, referenceDate) {
    if (!timeStr) return null;
    const parts = timeStr.split(':');
    if (parts.length < 2) return null;
    const d = new Date(referenceDate);
    d.setHours(parseInt(parts[0], 10), parseInt(parts[1], 10), 0, 0);
    return d;
  }

  /**
   * Determines if a given date is daytime based on the config for a specific area/zone.
   * @param {object|null|undefined} area - Configured Area object
   * @param {Date} now - Current time
   * @returns {boolean} True if it is daytime
   */
  isItDaytime(area, now) {
    if (!area) {
      // Fallback if no area is defined
      const hour = now.getHours();
      return hour >= 7 && hour < 21;
    }

    // Determine weekend/holiday status
    let isWeekend = now.getDay() === 0 || now.getDay() === 6; // 0 = Sunday, 6 = Saturday
    if (!isWeekend && this.config.holidaySensorId) {
      const holidayVal = this.statesCache[this.config.holidaySensorId];
      const holidayActive = holidayVal === true || holidayVal === 'true' || holidayVal === 1 || holidayVal === '1';
      if (holidayActive && this.config.useWeekendOnHoliday) {
        this.log.debug(`Holiday mode active via ${this.config.holidaySensorId} -> applying weekend limits.`);
        isWeekend = true;
      }
    }

    // 1. Calculate opening time
    let openTime = null;
    const openType = area.openType || 'sunrise';

    if (openType === 'sunrise') {
      const SunCalc = require('suncalc');
      const times = SunCalc.getTimes(now, this.latitude, this.longitude);
      if (times && times.sunrise) {
        // Base is sunrise
        openTime = new Date(times.sunrise);
        // Add offset (in minutes)
        const offset = parseInt(area.sunriseOffset, 10) || 0;
        openTime.setMinutes(openTime.getMinutes() + offset);

        // Apply limits
        const minStr = isWeekend ? area.minTimeWeekend : area.minTimeWorkdays;
        const maxStr = isWeekend ? area.maxTimeWeekend : area.maxTimeWorkdays;

        const minDate = this.parseTimeString(minStr, now);
        const maxDate = this.parseTimeString(maxStr, now);

        if (minDate && openTime < minDate) {
          openTime = minDate;
        }
        if (maxDate && openTime > maxDate) {
          openTime = maxDate;
        }
      }
    } else if (openType === 'fixed') {
      openTime = this.parseTimeString(area.fixedOpenTime || '07:00', now);
    }

    // 2. Calculate closing time
    let closeTime = null;
    const closeType = area.closeType || 'sunset';

    if (closeType === 'sunset') {
      const SunCalc = require('suncalc');
      const times = SunCalc.getTimes(now, this.latitude, this.longitude);
      if (times && times.sunset) {
        // Base is sunset
        closeTime = new Date(times.sunset);
        // Add offset
        const offset = parseInt(area.sunsetOffset, 10) || 0;
        closeTime.setMinutes(closeTime.getMinutes() + offset);

        // Apply limits
        const minStr = isWeekend ? area.closeMinTimeWeekend : area.closeMinTimeWorkdays;
        const maxStr = isWeekend ? area.closeMaxTimeWeekend : area.closeMaxTimeWorkdays;

        const minDate = this.parseTimeString(minStr, now);
        const maxDate = this.parseTimeString(maxStr, now);

        if (minDate && closeTime < minDate) {
          closeTime = minDate;
        }
        if (maxDate && closeTime > maxDate) {
          closeTime = maxDate;
        }
      }
    } else if (closeType === 'fixed') {
      closeTime = this.parseTimeString(area.fixedCloseTime || '21:00', now);
    }

    // If both times could be calculated
    if (openTime && closeTime) {
      this.log.debug(`Zone ${area.name || area.id} time check: openTime = ${openTime.toLocaleTimeString()}, closeTime = ${closeTime.toLocaleTimeString()}`);
      
      const isTimeDaytime = now >= openTime && now < closeTime;
      if (isTimeDaytime && area.inBedId) {
        // If it's daytime, check if person is still in bed (Spät-Aufsteher)
        const inBedVal = this.statesCache[area.inBedId];
        const inBedActive = inBedVal === true || inBedVal === 'true' || inBedVal === 1 || inBedVal === '1';
        if (inBedActive) {
          this.log.debug(`Zone ${area.name || area.id}: Person still in bed -> delaying daytime opening (treating as night)`);
          return false;
        }
      }
      return isTimeDaytime;
    }

    // Default fallback if time calculations are disabled or failed
    if (openType === 'none' && closeType === 'none') {
      return true; // assume daytime
    }
    if (openType === 'none') {
      // only close
      if (closeTime) return now < closeTime;
    }
    if (closeType === 'none') {
      // only open
      if (openTime) return now >= openTime;
    }

    // fallback to solar elevation if anything else is missing
    const SunCalc = require('suncalc');
    const sunPos = SunCalc.getPosition(now, this.latitude, this.longitude);
    return sunPos.altitude > 0;
  }

  /**
   * Generates a detailed simulation report based on current config and sensor values.
   * @param {Date} now
   * @returns {string}
   */
  getSimulationReport(now) {
    const sunPos = shading.calculateSunPosition(this.latitude, this.longitude, now);
    
    let report = '=== BESCHATTUNGS-SIMULATION ===\n';
    report += `Datum/Uhrzeit: ${now.toLocaleString()}\n`;
    report += `Sonnenstand: Azimut ${sunPos.azimuth.toFixed(1)}°, Elevation ${sunPos.elevation.toFixed(1)}°\n\n`;

    // 1. Global Safety & Triggers
    let frostActive = false;
    if (this.config.frostStateId) {
      const frostVal = this.statesCache[this.config.frostStateId];
      frostActive = frostVal === true || frostVal === 'true' || frostVal === 1 || frostVal === '1';
    }
    if (this.config.tempSensorId) {
      const currentTemp = parseFloat(this.statesCache[this.config.tempSensorId]);
      const threshold = parseFloat(this.config.frostTempThreshold) || 0;
      if (!isNaN(currentTemp) && currentTemp <= threshold) {
        frostActive = true;
      }
    }

    let fireActive = false;
    if (this.config.fireSensorId) {
      const fireVal = this.statesCache[this.config.fireSensorId];
      fireActive = fireVal === true || fireVal === 'true' || fireVal === 1 || fireVal === '1' || fireVal === 'fire' || fireVal === 'alarm';
    }

    let windActive = this.windAlarmActive;

    let rainActive = false;
    if (this.config.rainSensorId) {
      const rainVal = this.statesCache[this.config.rainSensorId];
      rainActive = rainVal === true || rainVal === 'true' || rainVal === 1 || rainVal === '1';
    }

    let present = true;
    if (this.config.presenceSensorId) {
      const presVal = this.statesCache[this.config.presenceSensorId];
      present = presVal === true || presVal === 'true' || presVal === 1 || presVal === '1';
    }

    let tempConditionMet = true;
    if (this.config.tempSensorId) {
      const currentTemp = parseFloat(this.statesCache[this.config.tempSensorId]);
      const threshold = parseFloat(this.config.tempThreshold) || 23;
      if (!isNaN(currentTemp)) tempConditionMet = currentTemp >= threshold;
    }

    let luxConditionMet = true;
    if (this.config.luxSensorId) {
      const currentLux = parseFloat(this.statesCache[this.config.luxSensorId]);
      const threshold = parseFloat(this.config.luxThreshold) || 20000;
      if (!isNaN(currentLux)) luxConditionMet = currentLux >= threshold;
    }

    report += '=== SENSOR-ZUSTÄNDE ===\n';
    report += `• Feueralarm: ${fireActive ? 'AKTIV 🚨' : 'inaktiv'}\n`;
    report += `• Windalarm: ${windActive ? 'AKTIV 💨' : 'inaktiv'}\n`;
    report += `• Regen: ${rainActive ? 'AKTIV 🌧️' : 'inaktiv'}\n`;
    report += `• Anwesenheit: ${present ? 'Anwesend' : 'ABWESEND 🚪'}\n`;
    report += `• Frostschutz: ${frostActive ? 'AKTIV ❄️' : 'inaktiv'}\n`;
    report += `• Hitzeschutz (Temperatur): ${tempConditionMet ? 'erfüllt' : 'nicht erfüllt'}\n`;
    report += `• Hitzeschutz (Helligkeit): ${luxConditionMet ? 'erfüllt' : 'nicht erfüllt'}\n`;
    report += `• Beschattung global (gedämpft): ${this.globalShadingActive ? 'AKTIV ☀️' : 'inaktiv'}\n\n`;

    report += '=== SIMULIERTE GERÄTE-REAKTIONEN ===\n';
    if (this.config.devices && this.config.devices.length > 0) {
      for (const device of this.config.devices) {
        if (!device.name || !device.enabled) continue;

        const cleanName = device.name.replace(/[^a-zA-Z0-9_-]/g, '_');
        const isAuto = this.statesCache[`${this.namespace}.devices.${cleanName}.auto`] !== false;
        
        report += `➔ ${device.name} (${device.type === 'venetian' ? 'Raffstore' : 'Rollade'}):\n`;
        report += `   • Auto-Modus: ${isAuto ? 'AKTIV' : 'DEAKTIVIERT'}\n`;

        // Aussperrschutz
        let contactOpen = false;
        if (device.contactId) {
          const contactVal = this.statesCache[device.contactId];
          contactOpen = contactVal === true || contactVal === 'open' || contactVal === 1 || contactVal === '1';
        }

        // Safety checking
        let targetHeight = 100;
        let targetTilt = 100;
        let reason = 'Normaler Tagesbetrieb';

        // Check Rain Action
        let rainTriggered = false;
        let rainHeight = 100;
        let rainTilt = 0;
        if (rainActive && device.rainAction && device.rainAction !== 'none') {
          rainTriggered = true;
          if (device.rainAction === 'open') {
            rainHeight = 100;
            rainTilt = shading.mapSlatAngleToPercent(0, device.invertTilt);
          } else if (device.rainAction === 'close') {
            rainHeight = 0;
            rainTilt = 0;
          }
        }

        // Check Presence Action
        let presenceTriggered = false;
        let presenceHeight = 100;
        let presenceTilt = 0;
        if (!present && this.config.awayAction && this.config.awayAction !== 'none') {
          presenceTriggered = true;
          if (this.config.awayAction === 'closeAll' || this.config.awayAction === 'lockClosed') {
            presenceHeight = 0;
            presenceTilt = 0;
          } else if (this.config.awayAction === 'lockOpen') {
            presenceHeight = 100;
            presenceTilt = shading.mapSlatAngleToPercent(0, device.invertTilt);
          }
        }

        let skipped = false;

        if (fireActive) {
          targetHeight = 100;
          targetTilt = shading.mapSlatAngleToPercent(0, device.invertTilt);
          reason = 'FEUERALARM (Auffahren)';
        } else if (windActive) {
          targetHeight = 100;
          targetTilt = shading.mapSlatAngleToPercent(0, device.invertTilt);
          reason = 'WINDALARM (Auffahren)';
        } else if (contactOpen) {
          targetHeight = parseInt(device.contactOpenPos) !== undefined ? parseInt(device.contactOpenPos) : 100;
          targetTilt = shading.mapSlatAngleToPercent(0, device.invertTilt);
          reason = 'Aussperrschutz (Fenster offen)';
        } else if (rainTriggered) {
          targetHeight = rainHeight;
          targetTilt = rainTilt;
          reason = `Regenschutz-Aktion "${device.rainAction}"`;
        } else if (presenceTriggered) {
          targetHeight = presenceHeight;
          targetTilt = presenceTilt;
          reason = `Abwesenheits-Aktion "${this.config.awayAction}"`;
        } else if (frostActive) {
          reason = 'Frostschutz active (Fahrt gesperrt)';
          skipped = true;
        } else {
          // Resolve area
          let area = null;
          if (this.config.areas && this.config.areas.length > 0) {
            area = this.config.areas.find(a => a.id === device.areaId) || this.config.areas.find(a => a.id === 'global') || this.config.areas[0];
          }
          const isDaytime = this.isItDaytime(area, now);

          if (!isDaytime) {
            targetHeight = 0;
            targetTilt = 0;
            reason = `Nachtbetrieb (Zone: ${area ? (area.name || area.id) : 'Global'})`;
          } else {
            // Daytime shading
            const minElevation = typeof device.minElevation === 'number' ? device.minElevation : 5;
            const elevationOk = sunPos.elevation >= minElevation;

            const tolerance = typeof device.azimuthTolerance === 'number' ? device.azimuthTolerance : 90;
            const diff = Math.abs(sunPos.azimuth - parseFloat(device.facadeAzimuth));
            const normalizedDiff = diff > 180 ? 360 - diff : diff;
            const azimuthOk = normalizedDiff <= tolerance;

            const profileAngle = shading.calculateProfileAngle(sunPos.azimuth, sunPos.elevation, parseFloat(device.facadeAzimuth));

            if (profileAngle !== null && this.globalShadingActive && elevationOk && azimuthOk) {
              targetHeight = parseInt(device.shadingHeight) !== undefined ? parseInt(device.shadingHeight) : 80;
              if (device.type === 'venetian') {
                const slatAngleDeg = shading.calculateSlatAngle(profileAngle, parseFloat(device.slatWidth) || 80, parseFloat(device.slatSpacing) || 72);
                let rawTilt = shading.mapSlatAngleToPercent(slatAngleDeg, device.invertTilt);
                const minTilt = typeof device.minTiltPercent === 'number' ? device.minTiltPercent : 0;
                const maxTilt = typeof device.maxTiltPercent === 'number' ? device.maxTiltPercent : 100;
                targetTilt = Math.max(minTilt, Math.min(maxTilt, rawTilt));
                reason = `Hitzeschutz AKTIV (Lamelle: ${slatAngleDeg.toFixed(1)}°, gedämpft: ${targetTilt}%)`;
              } else {
                reason = 'Hitzeschutz AKTIV';
              }
            } else {
              targetHeight = 100;
              targetTilt = shading.mapSlatAngleToPercent(0, device.invertTilt);
              reason = `Tagbetrieb - Keine Beschattung (Höhe/Azimut/Gedämpft ok: ${elevationOk}/${azimuthOk}/${this.globalShadingActive})`;
            }
          }
        }

        if (skipped) {
          report += `   • Status: Keine Fahrt (Grund: ${reason})\n`;
        } else {
          report += `   • Berechneter Zustand: Höhe ${targetHeight}%` + (device.type === 'venetian' ? `, Lamelle ${targetTilt}%\n` : '\n');
          report += `   • Grund: ${reason}\n`;
        }
      }
    } else {
      report += 'Keine Geräte konfiguriert.\n';
    }

    return report;
  }

  /**
   * Some message was sent to this instance over message box.
   * @param {ioBroker.Message} obj
   */
  onMessage(obj) {
    if (typeof obj === 'object' && obj.message) {
      if (obj.command === 'getZones') {
        let zones = [{ label: 'Global (global)', value: 'global' }];
        if (obj.message && obj.message.areas && Array.isArray(obj.message.areas)) {
          for (const area of obj.message.areas) {
            if (area.id && area.id !== 'global') {
              zones.push({
                label: area.name ? `${area.name} (${area.id})` : area.id,
                value: area.id
              });
            }
          }
        }
        if (obj.callback) {
          this.sendTo(obj.from, obj.command, zones, obj.callback);
        }
      } else if (obj.command === 'getDeviceStatuses') {
        let response = '=== SYSTEM STATUS ===\n';
        response += `Aktive Sonnenschutz-Steuerung: ${this.globalShadingActive ? 'JA' : 'NEIN'}\n`;
        response += `Windalarm aktiv: ${this.windAlarmActive ? 'JA' : 'NEIN'}\n`;
        // Check Rain
        let rainActive = false;
        if (this.config.rainSensorId) {
          const rainVal = this.statesCache[this.config.rainSensorId];
          rainActive = rainVal === true || rainVal === 'true' || rainVal === 1 || rainVal === '1';
        }
        response += `Regen aktiv: ${rainActive ? 'JA' : 'NEIN'}\n`;
        // Check Presence
        let present = true;
        if (this.config.presenceSensorId) {
          const presVal = this.statesCache[this.config.presenceSensorId];
          present = presVal === true || presVal === 'true' || presVal === 1 || presVal === '1';
        }
        response += `Anwesenheit aktiv: ${present ? 'JA (Anwesend)' : 'NEIN (Abwesend)'}\n\n`;

        response += '=== GERÄTEÜBERSICHT ===\n';
        if (this.config.devices && this.config.devices.length > 0) {
          for (const device of this.config.devices) {
            const cleanName = device.name.replace(/[^a-zA-Z0-9_-]/g, '_');
            const autoActive = this.statesCache[`${this.namespace}.devices.${cleanName}.auto`] !== false;
            const override = this.statesCache[`${this.namespace}.devices.${cleanName}.manualOverride`] === true;
            const currentHeight = this.statesCache[device.stateHeight];
            const currentTilt = device.type === 'venetian' ? this.statesCache[device.stateTilt] : 'N/A';

            response += `➔ ${device.name} (${device.type === 'venetian' ? 'Raffstore' : 'Rollade'}):\n`;
            response += `   • Modus: ${autoActive ? 'Automatisch' : 'Manuell'}\n`;
            response += `   • Manueller Override: ${override ? 'JA' : 'NEIN'}\n`;
            response += `   • Position: Höhe ${currentHeight}%` + (device.type === 'venetian' ? `, Lamelle ${currentTilt}%\n` : '\n');
          }
        } else {
          response += 'Keine Geräte konfiguriert.\n';
        }
        
        if (obj.callback) {
          this.sendTo(obj.from, obj.command, { result: response }, obj.callback);
        }
      } else if (obj.command === 'runSimulation') {
        const report = this.getSimulationReport(new Date());
        if (obj.callback) {
          this.sendTo(obj.from, obj.command, { result: report }, obj.callback);
        }
      }
    }
  }

  /**
   * Is called when adapter instance is stopped.
   * @param {() => void} callback
   */
  onUnload(callback) {
    try {
      if (this.updateInterval) {
        this.clearInterval(this.updateInterval);
      }
      if (this.recalcTimeout) {
        this.clearTimeout(this.recalcTimeout);
      }
      if (this.windResetTimeout) {
        this.clearTimeout(this.windResetTimeout);
      }
      this.log.info('Sun Shade Control adapter stopped.');
      callback();
    } catch (e) {
      callback();
    }
  }
}

if (require.main !== module) {
  // Export the constructor in compact mode
  /**
   * @param {Partial<utils.AdapterOptions>} [options]
   */
  module.exports = (options) => new SunShadeControl(options);
} else {
  // otherwise start the instance directly
  new SunShadeControl();
}
