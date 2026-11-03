/*
 * Cities with Jewish communities, for choosing a place in Settings (components/YourPlace.tsx).
 * Coordinates are to two decimal places, near each community's center; for exact times a person
 * can use their device's location instead. Safe to use on the device.
 */

export interface City {
  name: string;
  /** "New York", "Israel", "England": shown beside the name and searched. */
  region: string;
  lat: number;
  lon: number;
  tz: string;
  il?: boolean;
}

const IL = (name: string, lat: number, lon: number): City => ({ name, region: "Israel", lat, lon, tz: "Asia/Jerusalem", il: true });
const C = (name: string, region: string, lat: number, lon: number, tz: string): City => ({ name, region, lat, lon, tz });
const NY = "America/New_York";
const CHI = "America/Chicago";
const LA = "America/Los_Angeles";

export const CITIES: City[] = [
  // Israel
  IL("Jerusalem", 31.78, 35.22),
  IL("Bnei Brak", 32.08, 34.83),
  IL("Tel Aviv", 32.08, 34.78),
  IL("Beit Shemesh", 31.75, 34.99),
  IL("Modi'in", 31.89, 35.01),
  IL("Modi'in Illit", 31.93, 35.04),
  IL("Beitar Illit", 31.7, 35.12),
  IL("Elad", 32.05, 34.95),
  IL("Petah Tikva", 32.09, 34.89),
  IL("Ramat Gan", 32.08, 34.82),
  IL("Givat Shmuel", 32.08, 34.85),
  IL("Ra'anana", 32.18, 34.87),
  IL("Herzliya", 32.16, 34.84),
  IL("Netanya", 32.32, 34.86),
  IL("Rishon LeZion", 31.96, 34.8),
  IL("Rehovot", 31.89, 34.81),
  IL("Ashdod", 31.8, 34.65),
  IL("Ashkelon", 31.67, 34.57),
  IL("Be'er Sheva", 31.25, 34.79),
  IL("Haifa", 32.79, 34.99),
  IL("Zikhron Ya'akov", 32.57, 34.95),
  IL("Tzfat (Safed)", 32.97, 35.5),
  IL("Tiberias", 32.79, 35.53),
  IL("Karmiel", 32.92, 35.3),
  IL("Nahariya", 33.01, 35.1),
  IL("Efrat", 31.65, 35.15),
  IL("Ma'ale Adumim", 31.78, 35.3),
  IL("Kiryat Arba (Hebron)", 31.53, 35.12),
  IL("Eilat", 29.56, 34.95),

  // United States
  C("Manhattan, New York", "New York", 40.71, -74.01, NY),
  C("Brooklyn", "New York", 40.65, -73.95, NY),
  C("Queens (Kew Gardens Hills)", "New York", 40.73, -73.82, NY),
  C("Riverdale, Bronx", "New York", 40.89, -73.91, NY),
  C("Staten Island", "New York", 40.58, -74.15, NY),
  C("Five Towns (Lawrence)", "New York", 40.62, -73.73, NY),
  C("West Hempstead", "New York", 40.7, -73.65, NY),
  C("Monsey", "New York", 41.11, -74.07, NY),
  C("New Square", "New York", 41.14, -74.03, NY),
  C("Kiryas Joel", "New York", 41.34, -74.17, NY),
  C("Albany", "New York", 42.65, -73.75, NY),
  C("Rochester", "New York", 43.16, -77.61, NY),
  C("Buffalo", "New York", 42.89, -78.88, NY),
  C("Lakewood", "New Jersey", 40.1, -74.22, NY),
  C("Teaneck", "New Jersey", 40.89, -74.01, NY),
  C("Englewood", "New Jersey", 40.89, -73.97, NY),
  C("Passaic", "New Jersey", 40.86, -74.13, NY),
  C("Elizabeth", "New Jersey", 40.66, -74.21, NY),
  C("Highland Park and Edison", "New Jersey", 40.5, -74.42, NY),
  C("Deal", "New Jersey", 40.25, -74.0, NY),
  C("Philadelphia", "Pennsylvania", 39.95, -75.17, NY),
  C("Pittsburgh (Squirrel Hill)", "Pennsylvania", 40.44, -79.92, NY),
  C("Scranton", "Pennsylvania", 41.41, -75.66, NY),
  C("Baltimore", "Maryland", 39.36, -76.7, NY),
  C("Silver Spring", "Maryland", 39.0, -77.03, NY),
  C("Potomac and Rockville", "Maryland", 39.08, -77.15, NY),
  C("Washington", "D.C.", 38.91, -77.04, NY),
  C("Richmond", "Virginia", 37.54, -77.44, NY),
  C("Boston (Brookline)", "Massachusetts", 42.33, -71.12, NY),
  C("Sharon", "Massachusetts", 42.12, -71.18, NY),
  C("Providence", "Rhode Island", 41.82, -71.41, NY),
  C("New Haven", "Connecticut", 41.31, -72.92, NY),
  C("Stamford", "Connecticut", 41.05, -73.54, NY),
  C("West Hartford", "Connecticut", 41.76, -72.74, NY),
  C("Cleveland (University Heights)", "Ohio", 41.5, -81.54, NY),
  C("Columbus", "Ohio", 39.96, -83.0, NY),
  C("Cincinnati", "Ohio", 39.1, -84.51, NY),
  C("Detroit (Oak Park and Southfield)", "Michigan", 42.47, -83.2, "America/Detroit"),
  C("Atlanta (Toco Hills)", "Georgia", 33.81, -84.31, NY),
  C("Charlotte", "North Carolina", 35.23, -80.84, NY),
  C("Miami Beach", "Florida", 25.79, -80.13, NY),
  C("North Miami Beach and Aventura", "Florida", 25.96, -80.14, NY),
  C("Hollywood", "Florida", 26.01, -80.15, NY),
  C("Boca Raton", "Florida", 26.37, -80.13, NY),
  C("Orlando", "Florida", 28.54, -81.38, NY),
  C("Tampa", "Florida", 27.95, -82.46, NY),
  C("Jacksonville", "Florida", 30.33, -81.66, NY),
  C("Chicago (West Rogers Park)", "Illinois", 42.0, -87.7, CHI),
  C("Skokie", "Illinois", 42.03, -87.74, CHI),
  C("Milwaukee", "Wisconsin", 43.04, -87.91, CHI),
  C("Minneapolis (St. Louis Park)", "Minnesota", 44.95, -93.35, CHI),
  C("St. Louis (University City)", "Missouri", 38.66, -90.31, CHI),
  C("Kansas City (Overland Park)", "Kansas", 38.98, -94.67, CHI),
  C("Omaha", "Nebraska", 41.26, -95.94, CHI),
  C("Memphis", "Tennessee", 35.15, -90.05, CHI),
  C("Nashville", "Tennessee", 36.16, -86.78, CHI),
  C("New Orleans", "Louisiana", 29.95, -90.07, CHI),
  C("Houston (Meyerland)", "Texas", 29.69, -95.46, CHI),
  C("Dallas", "Texas", 32.78, -96.8, CHI),
  C("Austin", "Texas", 30.27, -97.74, CHI),
  C("Denver", "Colorado", 39.74, -104.99, "America/Denver"),
  C("Phoenix and Scottsdale", "Arizona", 33.49, -111.93, "America/Phoenix"),
  C("Las Vegas", "Nevada", 36.17, -115.14, LA),
  C("Los Angeles (Pico-Robertson)", "California", 34.05, -118.38, LA),
  C("Los Angeles (Hancock Park)", "California", 34.07, -118.33, LA),
  C("Los Angeles (Valley Village)", "California", 34.16, -118.4, LA),
  C("San Diego", "California", 32.72, -117.16, LA),
  C("San Francisco", "California", 37.77, -122.42, LA),
  C("Berkeley and Oakland", "California", 37.87, -122.27, LA),
  C("Seattle", "Washington", 47.61, -122.33, LA),
  C("Portland", "Oregon", 45.52, -122.68, LA),
  C("Honolulu", "Hawaii", 21.31, -157.86, "Pacific/Honolulu"),
  C("Anchorage", "Alaska", 61.22, -149.9, "America/Anchorage"),

  // Canada, Mexico and Latin America
  C("Toronto", "Canada", 43.72, -79.43, "America/Toronto"),
  C("Montreal", "Canada", 45.5, -73.57, "America/Toronto"),
  C("Ottawa", "Canada", 45.42, -75.69, "America/Toronto"),
  C("Winnipeg", "Canada", 49.9, -97.14, "America/Winnipeg"),
  C("Calgary", "Canada", 51.05, -114.07, "America/Edmonton"),
  C("Vancouver", "Canada", 49.26, -123.12, "America/Vancouver"),
  C("Mexico City", "Mexico", 19.43, -99.13, "America/Mexico_City"),
  C("Panama City", "Panama", 8.98, -79.52, "America/Panama"),
  C("Bogotá", "Colombia", 4.71, -74.07, "America/Bogota"),
  C("Caracas", "Venezuela", 10.48, -66.9, "America/Caracas"),
  C("Lima", "Peru", -12.05, -77.04, "America/Lima"),
  C("São Paulo", "Brazil", -23.55, -46.63, "America/Sao_Paulo"),
  C("Rio de Janeiro", "Brazil", -22.91, -43.17, "America/Sao_Paulo"),
  C("Buenos Aires", "Argentina", -34.6, -58.38, "America/Argentina/Buenos_Aires"),
  C("Montevideo", "Uruguay", -34.9, -56.16, "America/Montevideo"),
  C("Santiago", "Chile", -33.45, -70.67, "America/Santiago"),

  // Britain and Ireland
  C("London (Golders Green)", "England", 51.57, -0.2, "Europe/London"),
  C("London (Stamford Hill)", "England", 51.57, -0.07, "Europe/London"),
  C("Manchester (Prestwich and Salford)", "England", 53.53, -2.28, "Europe/London"),
  C("Gateshead", "England", 54.95, -1.6, "Europe/London"),
  C("Leeds", "England", 53.8, -1.55, "Europe/London"),
  C("Glasgow", "Scotland", 55.86, -4.25, "Europe/London"),
  C("Dublin", "Ireland", 53.35, -6.26, "Europe/Dublin"),

  // Europe
  C("Paris", "France", 48.86, 2.35, "Europe/Paris"),
  C("Strasbourg", "France", 48.58, 7.75, "Europe/Paris"),
  C("Lyon", "France", 45.76, 4.84, "Europe/Paris"),
  C("Marseille", "France", 43.3, 5.37, "Europe/Paris"),
  C("Nice", "France", 43.7, 7.27, "Europe/Paris"),
  C("Antwerp", "Belgium", 51.22, 4.4, "Europe/Brussels"),
  C("Brussels", "Belgium", 50.85, 4.35, "Europe/Brussels"),
  C("Amsterdam", "Netherlands", 52.37, 4.9, "Europe/Amsterdam"),
  C("Zurich", "Switzerland", 47.38, 8.54, "Europe/Zurich"),
  C("Basel", "Switzerland", 47.56, 7.59, "Europe/Zurich"),
  C("Geneva", "Switzerland", 46.2, 6.15, "Europe/Zurich"),
  C("Berlin", "Germany", 52.52, 13.4, "Europe/Berlin"),
  C("Frankfurt", "Germany", 50.11, 8.68, "Europe/Berlin"),
  C("Munich", "Germany", 48.14, 11.58, "Europe/Berlin"),
  C("Vienna", "Austria", 48.21, 16.37, "Europe/Vienna"),
  C("Prague", "Czech Republic", 50.08, 14.44, "Europe/Prague"),
  C("Budapest", "Hungary", 47.5, 19.04, "Europe/Budapest"),
  C("Warsaw", "Poland", 52.23, 21.01, "Europe/Warsaw"),
  C("Kraków", "Poland", 50.06, 19.94, "Europe/Warsaw"),
  C("Milan", "Italy", 45.46, 9.19, "Europe/Rome"),
  C("Rome", "Italy", 41.89, 12.48, "Europe/Rome"),
  C("Madrid", "Spain", 40.42, -3.7, "Europe/Madrid"),
  C("Barcelona", "Spain", 41.39, 2.17, "Europe/Madrid"),
  C("Gibraltar", "Gibraltar", 36.14, -5.35, "Europe/Gibraltar"),
  C("Lisbon", "Portugal", 38.72, -9.14, "Europe/Lisbon"),
  C("Copenhagen", "Denmark", 55.68, 12.57, "Europe/Copenhagen"),
  C("Stockholm", "Sweden", 59.33, 18.07, "Europe/Stockholm"),
  C("Oslo", "Norway", 59.91, 10.75, "Europe/Oslo"),
  C("Helsinki", "Finland", 60.17, 24.94, "Europe/Helsinki"),
  C("Athens", "Greece", 37.98, 23.73, "Europe/Athens"),
  C("Istanbul", "Turkey", 41.01, 28.98, "Europe/Istanbul"),
  C("Bucharest", "Romania", 44.43, 26.1, "Europe/Bucharest"),
  C("Kyiv", "Ukraine", 50.45, 30.52, "Europe/Kiev"),
  C("Odesa", "Ukraine", 46.48, 30.72, "Europe/Kiev"),
  C("Dnipro", "Ukraine", 48.46, 35.05, "Europe/Kiev"),
  C("Uman", "Ukraine", 48.75, 30.22, "Europe/Kiev"),
  C("Minsk", "Belarus", 53.9, 27.56, "Europe/Minsk"),
  C("Riga", "Latvia", 56.95, 24.11, "Europe/Riga"),
  C("Vilnius", "Lithuania", 54.69, 25.28, "Europe/Vilnius"),
  C("Moscow", "Russia", 55.76, 37.62, "Europe/Moscow"),
  C("St. Petersburg", "Russia", 59.93, 30.34, "Europe/Moscow"),

  // Africa, Asia and the Pacific
  C("Johannesburg", "South Africa", -26.2, 28.05, "Africa/Johannesburg"),
  C("Cape Town", "South Africa", -33.92, 18.42, "Africa/Johannesburg"),
  C("Durban", "South Africa", -29.86, 31.02, "Africa/Johannesburg"),
  C("Casablanca", "Morocco", 33.57, -7.59, "Africa/Casablanca"),
  C("Djerba", "Tunisia", 33.81, 10.86, "Africa/Tunis"),
  C("Cairo", "Egypt", 30.04, 31.24, "Africa/Cairo"),
  C("Dubai", "United Arab Emirates", 25.2, 55.27, "Asia/Dubai"),
  C("Tbilisi", "Georgia", 41.72, 44.79, "Asia/Tbilisi"),
  C("Baku", "Azerbaijan", 40.41, 49.87, "Asia/Baku"),
  C("Tashkent", "Uzbekistan", 41.3, 69.24, "Asia/Tashkent"),
  C("Almaty", "Kazakhstan", 43.24, 76.89, "Asia/Almaty"),
  C("Mumbai", "India", 19.08, 72.88, "Asia/Kolkata"),
  C("New Delhi", "India", 28.61, 77.21, "Asia/Kolkata"),
  C("Kathmandu", "Nepal", 27.72, 85.32, "Asia/Kathmandu"),
  C("Bangkok", "Thailand", 13.76, 100.5, "Asia/Bangkok"),
  C("Singapore", "Singapore", 1.29, 103.85, "Asia/Singapore"),
  C("Hong Kong", "China", 22.28, 114.16, "Asia/Hong_Kong"),
  C("Shanghai", "China", 31.23, 121.47, "Asia/Shanghai"),
  C("Beijing", "China", 39.9, 116.41, "Asia/Shanghai"),
  C("Seoul", "South Korea", 37.57, 126.98, "Asia/Seoul"),
  C("Tokyo", "Japan", 35.68, 139.69, "Asia/Tokyo"),
  C("Sydney (Bondi)", "Australia", -33.89, 151.27, "Australia/Sydney"),
  C("Melbourne (Caulfield)", "Australia", -37.88, 145.02, "Australia/Melbourne"),
  C("Brisbane", "Australia", -27.47, 153.03, "Australia/Brisbane"),
  C("Adelaide", "Australia", -34.93, 138.6, "Australia/Adelaide"),
  C("Perth", "Australia", -31.95, 115.86, "Australia/Perth"),
  C("Auckland", "New Zealand", -36.85, 174.76, "Pacific/Auckland"),
];

/** Fold a name for searching: no accents, apostrophes or case. */
export function foldPlace(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’`.()]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Cities matching what the person typed: names first, then regions. */
export function findCities(query: string, limit = 8): City[] {
  const q = foldPlace(query);
  if (!q) return [];
  const words = q.split(" ");
  const scored: Array<{ c: City; score: number }> = [];
  for (const c of CITIES) {
    const name = foldPlace(c.name);
    const region = foldPlace(c.region);
    const hay = `${name} ${region}`;
    if (!words.every((w) => hay.includes(w))) continue;
    const score = name.startsWith(q) ? 0 : name.split(" ").some((w) => w.startsWith(words[0])) ? 1 : 2;
    scored.push({ c, score });
  }
  return scored.sort((a, b) => a.score - b.score).slice(0, limit).map((s) => s.c);
}

/** The listed city nearest a point, within a distance (km), to name a device location. */
export function nearestCity(lat: number, lon: number, withinKm = 40): City | null {
  const rad = (d: number) => (d * Math.PI) / 180;
  let best: City | null = null;
  let bestKm = withinKm;
  for (const c of CITIES) {
    const dLat = rad(c.lat - lat);
    const dLon = rad(c.lon - lon);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat)) * Math.cos(rad(c.lat)) * Math.sin(dLon / 2) ** 2;
    const km = 6371 * 2 * Math.asin(Math.sqrt(h));
    if (km < bestKm) {
      best = c;
      bestKm = km;
    }
  }
  return best;
}

export function cityLabel(c: City): string {
  return c.region === "D.C." ? `${c.name}, D.C.` : `${c.name}, ${c.region}`;
}
