
/**
 * Generate a random double in the range `[low,high)`. If the second parameter is unspecified,
 * treats it as `[0,range)`.
 */
export const randDouble = (low: number, high?: number) => {
  if (high === undefined) {
    high = low;
    low = 0;
  }
  const range = high - low;
  return (Math.random() * range) + low;
};

export const randomPoint = (): { lat: number; lng: number } => {
  const lng = randDouble(Math.PI * 2);
//  const lat = randDouble(Math.PI * 2);


  // gives a distribution 0-1 but x50 at .07 or so
  const offset = Math.sin(randDouble(0, Math.PI));

  // choose top/bottom of earth
  const sign = Math.random() < 0.5 ? -1 : +1;

  // invert offset, apply to -90,+90 on earth
  const lat = (1.0 - offset) * Math.PI / 3 * sign; // TODO: should be /2, gives gaps at top/bottom

  return { lat, lng };
};

export const randomPoints = (count: number): { lat: number; lng: number }[] => {
  const points: Array<{ lat: number; lng: number }> = new Array(count);
  for (let i = 0; i < count; ++i) {
    points[i] = randomPoint();
  }
  return points;
};
