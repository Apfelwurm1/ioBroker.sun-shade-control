/* eslint-disable no-unused-vars */
/* global systemDictionary */
'use strict';

// @ts-ignore
const systemDictionary = {
  "Global Settings": {
    "en": "Global Settings",
    "de": "Globale Einstellungen"
  },
  "Location & Calculation settings": {
    "en": "Location & Calculation settings",
    "de": "Standort- & Berechnungs-Einstellungen"
  },
  "Update Interval (minutes)": {
    "en": "Update Interval (minutes)",
    "de": "Aktualisierungsintervall (Minuten)"
  },
  "Latitude (Breitengrad)": {
    "en": "Latitude",
    "de": "Breitengrad"
  },
  "Longitude (Längengrad)": {
    "en": "Longitude",
    "de": "Längengrad"
  },
  "Note: Leave Latitude and Longitude empty to automatically use the coordinates configured in the ioBroker system settings.": {
    "en": "Note: Leave Latitude and Longitude empty to automatically use the coordinates configured in the ioBroker system settings.",
    "de": "Hinweis: Lassen Sie Breitengrad und Längengrad leer, um automatisch die in den ioBroker-Systemeinstellungen konfigurierten Koordinaten zu verwenden."
  },
  "Global Shading Triggers (Optional)": {
    "en": "Global Shading Triggers (Optional)",
    "de": "Globale Beschattungsauslöser (Optional)"
  },
  "Temperature Sensor State ID": {
    "en": "Temperature Sensor State ID",
    "de": "Datenpunkt Außentemperatursensor"
  },
  "Shading Temp Threshold (°C)": {
    "en": "Shading Temp Threshold (°C)",
    "de": "Hitzeschutz Temperaturschwelle (°C)"
  },
  "Brightness Sensor State ID": {
    "en": "Brightness Sensor State ID",
    "de": "Datenpunkt Helligkeitssensor (Lux)"
  },
  "Shading Lux Threshold": {
    "en": "Shading Lux Threshold",
    "de": "Helligkeitsschwelle (Lux)"
  },
  "Shading Devices": {
    "en": "Shading Devices",
    "de": "Geräte / Aktoren"
  },
  "Blinds, Raffstores & Shutters": {
    "en": "Blinds, Raffstores & Shutters",
    "de": "Rolladen & Raffstoren (Jalousien)"
  },
  "Device Name": {
    "en": "Device Name",
    "de": "Name"
  },
  "Type": {
    "en": "Type",
    "de": "Typ"
  },
  "Roller Shutter (Rolladen)": {
    "en": "Roller Shutter (Rolladen)",
    "de": "Rollade"
  },
  "Venetian Blind (Raffstore)": {
    "en": "Venetian Blind (Raffstore)",
    "de": "Raffstore (Jalousie)"
  },
  "Facade Orientation (0-360°)": {
    "en": "Facade Orientation (0-360°)",
    "de": "Ausrichtung der Fassade (0-360°)"
  },
  "Enabled": {
    "en": "Enabled",
    "de": "Aktiviert"
  },
  "State ID Height/Pos": {
    "en": "State ID Height/Pos",
    "de": "Datenpunkt Höhe/Position"
  },
  "State ID Slat/Tilt (Raffstore only)": {
    "en": "State ID Slat/Tilt",
    "de": "Datenpunkt Lamellenwinkel"
  },
  "Invert Height (0% = Closed)": {
    "en": "Invert Height (0% = Closed)",
    "de": "Höhe invertieren (0% = geschlossen)"
  },
  "Invert Tilt": {
    "en": "Invert Tilt",
    "de": "Lamellenwinkel invertieren"
  },
  "Slat Width L (mm)": {
    "en": "Slat Width L (mm)",
    "de": "Lamellenbreite L (mm)"
  },
  "Slat Spacing d (mm)": {
    "en": "Slat Spacing d (mm)",
    "de": "Lamellenabstand d (mm)"
  },
  "Shading Height (%)": {
    "en": "Shading Height (%)",
    "de": "Beschattungshöhe (%)"
  },
  "Window Contact State ID": {
    "en": "Window Contact State ID",
    "de": "Datenpunkt Fensterkontakt"
  },
  "Safety Height Open (%)": {
    "en": "Safety Height Open (%)",
    "de": "Sicherheitshöhe offen (%)"
  },
  "Safety & Protection Triggers": {
    "en": "Safety & Protection Triggers",
    "de": "Sicherheits- & Schutz-Auslöser"
  },
  "Fire Alarm State ID (e.g. Rauchmelder)": {
    "en": "Fire Alarm State ID (e.g. smoke detector)",
    "de": "Datenpunkt Feueralarm (z.B. Rauchmelder-Gruppe)"
  },
  "Wind Sensor State ID": {
    "en": "Wind Sensor State ID",
    "de": "Datenpunkt Windsensor"
  },
  "Wind Speed Threshold (Alarm active above)": {
    "en": "Wind Speed Threshold (Alarm active above)",
    "de": "Windstärke-Schwelle (Alarm aktiv darüber)"
  },
  "Time Settings": {
    "en": "Time Settings",
    "de": "Zeit-Einstellungen"
  },
  "Opening Settings (Daytime / Öffnen)": {
    "en": "Opening Settings (Daytime / Open)",
    "de": "Öffnungs-Einstellungen (Tag / Öffnen)"
  },
  "Opening Trigger Type": {
    "en": "Opening Trigger Type",
    "de": "Auslöser zum Öffnen"
  },
  "Sunrise (Sonnenaufgang)": {
    "en": "Sunrise",
    "de": "Sonnenaufgang"
  },
  "Fixed Time (Festzeit)": {
    "en": "Fixed Time",
    "de": "Festzeit"
  },
  "None / Manual Only": {
    "en": "None / Manual Only",
    "de": "Keine / Nur manuell"
  },
  "Sunrise Offset (minutes)": {
    "en": "Sunrise Offset (minutes)",
    "de": "Sonnenaufgang Offset (Minuten)"
  },
  "Fixed Opening Time (HH:MM)": {
    "en": "Fixed Opening Time (HH:MM)",
    "de": "Feste Öffnungszeit (HH:MM)"
  },
  "Earliest Opening Workdays (HH:MM)": {
    "en": "Earliest Opening Workdays (HH:MM)",
    "de": "Frühestes Öffnen Werktags (HH:MM)"
  },
  "Latest Opening Workdays (HH:MM)": {
    "en": "Latest Opening Workdays (HH:MM)",
    "de": "Spätestes Öffnen Werktags (HH:MM)"
  },
  "Earliest Opening Weekends (HH:MM)": {
    "en": "Earliest Opening Weekends (HH:MM)",
    "de": "Frühestes Öffnen Wochenende (HH:MM)"
  },
  "Latest Opening Weekends (HH:MM)": {
    "en": "Latest Opening Weekends (HH:MM)",
    "de": "Spätestes Öffnen Wochenende (HH:MM)"
  },
  "Closing Settings (Nighttime / Schließen)": {
    "en": "Closing Settings (Nighttime / Close)",
    "de": "Schließungs-Einstellungen (Nacht / Schließen)"
  },
  "Closing Trigger Type": {
    "en": "Closing Trigger Type",
    "de": "Auslöser zum Schließen"
  },
  "Sunset (Sonnenuntergang)": {
    "en": "Sunset",
    "de": "Sonnenuntergang"
  },
  "Sunset Offset (minutes)": {
    "en": "Sunset Offset (minutes)",
    "de": "Sonnenuntergang Offset (Minuten)"
  },
  "Fixed Closing Time (HH:MM)": {
    "en": "Fixed Closing Time (HH:MM)",
    "de": "Feste Schließzeit (HH:MM)"
  },
  "Earliest Closing Time (HH:MM)": {
    "en": "Earliest Closing Time (HH:MM)",
    "de": "Frühestes Schließen (HH:MM)"
  },
  "Latest Closing Time (HH:MM)": {
    "en": "Latest Closing Time (HH:MM)",
    "de": "Spätestes Schließen (HH:MM)"
  },
  "Earliest Closing Workdays (HH:MM)": {
    "en": "Earliest Closing Workdays (HH:MM)",
    "de": "Frühestes Schließen Werktags (HH:MM)"
  },
  "Latest Closing Workdays (HH:MM)": {
    "en": "Latest Closing Workdays (HH:MM)",
    "de": "Spätestes Schließen Werktags (HH:MM)"
  },
  "Earliest Closing Weekends (HH:MM)": {
    "en": "Earliest Closing Weekends (HH:MM)",
    "de": "Frühestes Schließen Wochenende (HH:MM)"
  },
  "Latest Closing Weekends (HH:MM)": {
    "en": "Latest Closing Weekends (HH:MM)",
    "de": "Spätestes Schließen Wochenende (HH:MM)"
  },
  "Zones & Time Settings": {
    "en": "Zones & Time Settings",
    "de": "Zonen- & Zeit-Einstellungen"
  },
  "Custom Shading Zones & Times": {
    "en": "Custom Shading Zones & Times",
    "de": "Benutzerdefinierte Beschattungszonen & Zeiten"
  },
  "Zone ID (e.g. living)": {
    "en": "Zone ID (e.g. living)",
    "de": "Zonen-ID (z. B. wohnbereich)"
  },
  "Zone Name (e.g. Wohnbereich)": {
    "en": "Zone Name (e.g. Living Area)",
    "de": "Zonenname (z. B. Wohnbereich)"
  },
  "In-Bed Sensor State ID": {
    "en": "In-Bed Sensor State ID",
    "de": "Datenpunkt In-Bett-Sensor"
  },
  "Opening Trigger": {
    "en": "Opening Trigger",
    "de": "Auslöser zum Öffnen"
  },
  "Sunrise Offset (min)": {
    "en": "Sunrise Offset (min)",
    "de": "Sonnenaufgang Offset (Min)"
  },
  "Fixed Open (HH:MM)": {
    "en": "Fixed Open (HH:MM)",
    "de": "Feste Öffnungszeit (HH:MM)"
  },
  "Earliest Open Workdays (HH:MM)": {
    "en": "Earliest Open Workdays (HH:MM)",
    "de": "Frühestes Öffnen Werktags (HH:MM)"
  },
  "Latest Open Workdays (HH:MM)": {
    "en": "Latest Open Workdays (HH:MM)",
    "de": "Spätestes Öffnen Werktags (HH:MM)"
  },
  "Earliest Open Weekend (HH:MM)": {
    "en": "Earliest Open Weekend (HH:MM)",
    "de": "Frühestes Öffnen Wochenende (HH:MM)"
  },
  "Latest Open Weekend (HH:MM)": {
    "en": "Latest Open Weekend (HH:MM)",
    "de": "Spätestes Öffnen Wochenende (HH:MM)"
  },
  "Closing Trigger": {
    "en": "Closing Trigger",
    "de": "Auslöser zum Schließen"
  },
  "Sunset Offset (min)": {
    "en": "Sunset Offset (min)",
    "de": "Sonnenuntergang Offset (Min)"
  },
  "Fixed Close (HH:MM)": {
    "en": "Fixed Close (HH:MM)",
    "de": "Feste Schließzeit (HH:MM)"
  },
  "Earliest Close Workdays (HH:MM)": {
    "en": "Earliest Close Workdays (HH:MM)",
    "de": "Frühestes Schließen Werktags (HH:MM)"
  },
  "Latest Close Workdays (HH:MM)": {
    "en": "Latest Close Workdays (HH:MM)",
    "de": "Spätestes Schließen Werktags (HH:MM)"
  },
  "Earliest Close Weekend (HH:MM)": {
    "en": "Earliest Close Weekend (HH:MM)",
    "de": "Frühestes Schließen Wochenende (HH:MM)"
  },
  "Latest Close Weekend (HH:MM)": {
    "en": "Latest Close Weekend (HH:MM)",
    "de": "Spätestes Schließen Wochenende (HH:MM)"
  },
  "Zone ID": {
    "en": "Zone ID",
    "de": "Zonen-ID"
  },
  "Shading Start Delay (minutes)": {
    "en": "Shading Start Delay (minutes)",
    "de": "Beschattung Startverzögerung (Minuten)"
  },
  "Shading End Delay / Cloud Filter (minutes)": {
    "en": "Shading End Delay / Cloud Filter (minutes)",
    "de": "Beschattung Endverzögerung / Wolkenfilter (Minuten)"
  },
  "Holiday & Vacation Settings (Optional)": {
    "en": "Holiday & Vacation Settings (Optional)",
    "de": "Urlaubs- & Feiertags-Einstellungen (Optional)"
  },
  "Holiday/Vacation State ID": {
    "en": "Holiday/Vacation State ID",
    "de": "Datenpunkt Feiertag / Urlaub"
  },
  "Use Weekend Settings on Holidays": {
    "en": "Use Weekend Settings on Holidays",
    "de": "Wochenend-Zeiten an Feiertagen nutzen"
  },
  "Frost Protection Warning State ID": {
    "en": "Frost Protection Warning State ID",
    "de": "Datenpunkt Frostschutz / Frostwarnung"
  },
  "Frost Temp Threshold (°C)": {
    "en": "Frost Temp Threshold (°C)",
    "de": "Frost Temperaturschwelle (°C)"
  },
  "Note: The Frost Temp Threshold uses the Temperature Sensor State ID configured in 'Global Shading Triggers' above.": {
    "en": "Note: The Frost Temp Threshold uses the Temperature Sensor State ID configured in 'Global Shading Triggers' above.",
    "de": "Hinweis: Die Frost-Temperaturschwelle verwendet den Außentemperatursensor aus 'Globale Beschattungsauslöser' (oben)."
  },
  "Sunrise": {
    "en": "Sunrise",
    "de": "Sonnenaufgang"
  },
  "Fixed Time": {
    "en": "Fixed Time",
    "de": "Festzeit"
  },
  "None": {
    "en": "None",
    "de": "Keine"
  },
  "Sunset": {
    "en": "Sunset",
    "de": "Sonnenuntergang"
  },
  "Facade Orientation (0-360°)": {
    "en": "Facade Orientation (0-360°)",
    "de": "Ausrichtung der Fassade (0-360°)"
  }
};
