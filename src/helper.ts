export type LatLng = {
  lat: number;
  lng: number;
};

export type Vector = {
  x: number;
  y: number;
  z: number;
};

/**
 * Convert to normal vector
 */
export const convertToVec = (arg: LatLng): Vector => {
  const cosLat = Math.cos(arg.lat);

  // right-handed vector: x -> 0°E,0°N; y -> 90°E,0°N, z -> 90°N
  const x = cosLat * Math.cos(arg.lng);
  const y = cosLat * Math.sin(arg.lng);
  const z = Math.sin(arg.lat);

  return { x, y, z };
};

/**
 * Great circle distance in meters
 */
export const distance = (
  { lat: lat1, lng: lng1 }: LatLng,
  { lat: lat2, lng: lng2 }: LatLng,
): number => {
  const R = 6371.01 * 1000; // Earth radius in meters.

  // Calculate the difference in latitude and longitude.
  const deltaLat = lat2 - lat1;
  const deltaLng = lng2 - lng1;

  // Calculate the haversine of the central angle.
  const haversine =
    Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;

  // Calculate the great circle distance.
  const distance = 2 * R * Math.asin(Math.sqrt(haversine));

  return distance;
};

export const interpolate = (
  { lat: lat1, lng: lng1 }: LatLng,
  { lat: lat2, lng: lng2 }: LatLng,
  t: number,
) => {
  // Calculate the difference in latitude and longitude.
  const deltaLat = lat2 - lat1;
  const deltaLng = lng2 - lng1;

  // Calculate the interpolated latitude and longitude.
  const lat = lat1 + t * deltaLat;
  const lng = lng1 + t * deltaLng;

  return { lat, lng };
};

export const lineBetween = (p1: Vector, p2: Vector): Vector => {
  return { x: p2.x - p1.x, y: p2.y - p1.y, z: p2.z - p1.y };
};

export const lengthVector = (v: Vector): number => Math.hypot(v.x, v.y, v.z);

export const unitVector = (p: Vector): Vector => {
  const mag = lengthVector(p);
  if (mag === 0) {
    throw new Error(`cannot convert undirected vector to unit vector`);
  }
  return { x: p.x / mag, y: p.y / mag, z: p.z / mag };
};

export const crossProduct = (v1: Vector, v2: Vector): Vector => {
  return {
    x: v1.y * v2.z - v1.z * v2.y,
    y: v1.z * v2.x - v1.x * v2.z,
    z: v1.x * v2.y - v1.y * v2.x,
  };
};

export const dotProduct = (v1: Vector, v2: Vector): number => {
  let result = 0;
  result += v1.x * v2.x;
  result += v1.y * v2.y;
  result += v1.z * v2.z;
  return result;
};

export const multiplyVector = (v: Vector, by: number) => {
  return {
    x: v.x * by,
    y: v.y * by,
    z: v.z * by,
  };
};

export const vecToString = (v: Vector, prec = 2) =>
  `${v.x.toFixed(prec)},${v.y.toFixed(prec)},${v.z.toFixed(prec)}`;

export const locToString = (v: LatLng, prec = 2) => `${v.lat.toFixed(prec)},${v.lng.toFixed(prec)}`;
