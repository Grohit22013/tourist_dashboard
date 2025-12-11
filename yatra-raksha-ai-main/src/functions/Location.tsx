export default async function getLocationName(lat: number, lon: number) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
    { headers: { "User-Agent": "YatraRaksha/1.0" } }
  );
  return await res.json();
}