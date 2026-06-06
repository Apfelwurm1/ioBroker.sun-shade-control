# ioBroker.sun-shade-control

[![NPM version](https://img.shields.io/npm/v/iobroker.sun-shade-control.svg)](https://www.npmjs.com/package/iobroker.sun-shade-control)
[![Downloads](https://img.shields.io/npm/dm/iobroker.sun-shade-control.svg)](https://www.npmjs.com/package/iobroker.sun-shade-control)
![Number of Installations](https://iobroker.live/badges/sun-shade-control-installed.svg)
![Number of Installations (stable)](https://iobroker.live/badges/sun-shade-control-stable.svg)
[![Dependency Status](https://img.shields.io/david/Apfelwurm1/ioBroker.sun-shade-control.svg)](https://david-dm.org/Apfelwurm1/ioBroker.sun-shade-control)

[![NPM](https://nodei.co/npm/iobroker.sun-shade-control.png?downloads=true)](https://nodei.co/npm/iobroker.sun-shade-control/)

**Sun Shade Control** ist ein hochentwickelter, sonnenstandsabhängiger ioBroker-Adapter zur vollautomatischen Steuerung von Rolllläden (Shutters) und Jalousien/Raffstoren (Venetian Blinds). Neben der automatischen Höhensteuerung berechnet der Adapter kontinuierlich die optimale Lamellennachführung (Slat Tracking), um Blendung zu verhindern und gleichzeitig maximales Tageslicht zu garantieren.

---

## Hauptfunktionen (Features)

1. **Benutzerdefinierte Zonen (Areas/Zones)**:
   * Erstelle unbegrenzt viele eigene Zonen (z. B. *Wohnbereich*, *Schlafraum*, *Kinderzimmer*).
   * Jede Zone besitzt eigene Auf- und Zuvorgaben (Sonnenaufgang, Sonnenuntergang, Festzeiten) sowie individuelle Sicherheitsgrenzen für Werktage und Wochenenden.

2. **In-Bett-Erkennung (Spät-Aufsteher-Modus)**:
   * Pro Zone kann ein Datenpunkt (z. B. Drucksensor im Bett, Bewegungsmelder) definiert werden.
   * Solange dieser aktiv (`true`) ist, bleibt die Zone morgens geschlossen. Erst nach dem Aufstehen öffnen die Rollläden zeitverzögert.

3. **Intelligenter Aussperrschutz (Tür-Auf-Funktion)**:
   * Sobald eine Terrassentür oder ein Fenster geöffnet wird (über einen Fensterkontakt), fährt der entsprechende Behang auf eine konfigurierbare Sicherheitshöhe (z. B. `100%`).
   * **Zustandswiederherstellung im manuellen Modus**: Wird die Tür wieder geschlossen, stellt der Adapter den exakten Zustand (Höhe & Lamellenwinkel) wieder her, der *vor* dem Öffnen aktiv war (auch wenn sich das Gerät im manuellen Modus befand).

4. **Hitzeschutz-Hysterese (Wolken-Filter)**:
   * Um ständiges Auf- und Abfahren der Behänge bei vorbeiziehenden Wolken zu verhindern, sind getrennte Verzögerungszeiten für den Start (Hitzeschutz ein, Standard `2 Minuten`) und das Ende (Hitzeschutz aus, Standard `15 Minuten`) einstellbar.

5. **Feiertags- & Urlaubsmodus (Holiday Mode)**:
   * Über einen globalen Datenpunkt (z. B. Feiertagskalender) kann der Urlaubsmodus aktiviert werden. Der Adapter wendet dann an Feiertagen automatisch die Wochenend-Zeiten für alle Zonen an.

6. **Frostschutz (Sicherheits-Sperre)**:
   * Verhindert Beschädigungen an Motoren und Behang bei Minustemperaturen. Über einen Außentemperatursensor oder eine Frostwarnungs-ID wird die automatische Fahrt blockiert, um ein Abreißen festgefrorener Lamellen zu verhindern.

---

## Konfiguration (Admin UI)

Das Einstellungsmenü ist optimiert für hervorragende Usability und blendet nicht benötigte Spalten oder Felder automatisch aus.

### 1. Globale Einstellungen (Global Settings)
* **Standort- & Berechnungs-Einstellungen**: Angabe von Breitengrad und Längengrad. Bleiben die Felder leer, holt sich der Adapter die Koordinaten automatisch aus den ioBroker-Systemeinstellungen.
* **Globale Hitzeschutz-Trigger**: Zuweisung eines Helligkeitssensors (Lux) und Außentemperatursensors inklusive Schwellwerten.
* **Wolken-Filter**: Zeitverzögerungen zur Dämpfung schneller Lux-Schwankungen.
* **Frost- & Feiertagsschutz**: Verknüpfung der entsprechenden Datenpunkte und Schwellwerte.

### 2. Zonen & Zeit-Einstellungen (Zones & Times)
Hier konfigurierst du die Steuerungsprofile in einer übersichtlichen Tabelle:
* **Zonen-ID / Name**: Eindeutige Kennung (z. B. `living`) und Anzeigename.
* **Öffnungs-/Schließungs-Trigger**: Auswahl zwischen `Sonnenaufgang` (mit konfigurierbarem Offset in Minuten), `Festzeit` oder `Keine` (nur manuelle Fahrt).
* **Frühestens / Spätestens (Werktags & Wochenende)**: Verhindert beispielsweise, dass Rollläden im Sommer bereits um 05:00 Uhr öffnen oder im Winter zu spät schließen.
* **In-Bett Sensor**: Zuweisung des Triggers für den Spät-Aufsteher-Modus.

### 3. Geräte / Aktoren (Shading Devices)
* **Gerätetyp**: Wahl zwischen **Rollade** und **Raffstore (Jalousie)**. 
  * *Hinweis*: Raffstore-spezifische Felder (Lamellenbreite, Lamellenabstand, Lamellenwinkel-Datenpunkt) werden bei Rolläden automatisch ausgeblendet, um die Tabelle sauber zu halten!
* **Fassadenausrichtung (0-360°)**: Himmelsrichtung des Fensters (z. B. `180°` für Süden). Die Beschattung wird nur aktiv, wenn die Sonne direkt auf das Fenster scheint.
* **Verknüpfte Datenpunkte**: IDs für Höhe (und Lamellenwinkel bei Jalousien) sowie optionale Invertierungseinstellungen.
* **Fensterkontakt & Sicherheitshöhe**: Datenpunkt für die Türöffnung und Vorgabe der Höhe, auf die gefahren werden soll.

---

## Funktionsweise der Lamellennachführung (Slat Tracking)

Bei Raffstoren berechnet der Adapter anhand der Sonnenhöhe (Elevation) und der Ausrichtung deines Fensters den idealen Lamellenwinkel:
$$\text{Winkel} = \arctan\left(\frac{L}{d} \cdot \tan(\text{Sonnenhöhe})\right)$$
Dadurch wird die Lamelle immer exakt so weit geschlossen, dass keine direkten Sonnenstrahlen in den Raum dringen (Hitzeschutz & Blendschutz), aber dennoch das Maximum an indirektem Tageslicht hereingelassen wird.

---

## Installation

Deine Tester können den Adapter wie folgt installieren:

1. Öffne die **ioBroker Admin-Oberfläche**.
2. Klicke im linken Menü auf **Adapter**.
3. Klicke oben in der Menüleiste auf das **GitHub-Symbol ("Installieren aus eigener URL")**.
4. Wähle den Reiter **Beliebig** (Custom) aus.
5. Füge die folgende URL ein:
   `https://github.com/Apfelwurm1/ioBroker.sun-shade-control`
6. Klicke auf **Installieren**.
7. Erstelle anschließend über das blaue `+` eine Instanz des Adapters (`sun-shade-control.0`).

---

## Lizenz & Entwickler

* **Entwickelt von**: Bengel.Bytes by Vollbrause Haus & Hof
* **Lizenz**: MIT License — freie Nutzung für private und gewerbliche Zwecke.

---

*Entwickelt mit ❤️ für ein smartes Zuhause.*
