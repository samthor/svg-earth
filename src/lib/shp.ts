export type Shape = {
  no: number;
  length: number;
  shape: ShapeInner;
};

export type ShapeInner = {
  type: ShapeType.POLYGON;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  parts: Int32Array;
  points: Float64Array;
};

export enum ShapeType {
  NULL = 0,
  POLYGON = 5,
}

export function parseShp(arr: Uint8Array) {
  const dv = new DataView(arr.buffer, arr.byteOffset, arr.byteLength);

  if (arr.length < 100) {
    throw new Error(`Not a SHP file, not big enough: ${arr.length}`);
  }

  const fileCode = dv.getInt32(0, false);
  if (fileCode !== 0x0000270a) {
    throw new Error(`Not a SHP file, wrong magic number`);
  }

  const byteLength = dv.getInt32(24, false) * 2; // 16-bit words
  const version = dv.getInt32(28, true);
  const shapeType = dv.getInt32(32, true) as ShapeType; // TODO: is this the bounding box type?

  let index = 36;
  const f64 = (by: number) => dv.getFloat64(index + by * 8, true);
  const minX = f64(0);
  const minY = f64(1);
  const maxX = f64(2);
  const maxY = f64(3);
  const minZ = f64(4);
  const maxZ = f64(5);
  const minM = f64(6);
  const maxM = f64(7);

  const shapes: Shape[] = [];

  index = 100; // data starts here
  while (index < byteLength) {
    const no = dv.getInt32(index, false);
    const length = dv.getInt32(index + 4, false) * 2; // 16-bit words

    const start = index + 8;
    const end = start + length;
    const sub = arr.subarray(start, end);

    const shape = parseShape(sub);
    if (shape) {
      shapes.push({ no, length, shape });
    }

    index = end;
  }

  return { shapes, version, shapeType };
}

function parseShape(arr: Uint8Array): ShapeInner | undefined {
  const dv = new DataView(arr.buffer, arr.byteOffset, arr.byteLength);

  const type = dv.getInt32(0, true) as ShapeType;

  switch (type) {
    case ShapeType.NULL:
      break;

    case ShapeType.POLYGON: {
      const minX = dv.getFloat64(4, true);
      const minY = dv.getFloat64(12, true);
      const maxX = dv.getFloat64(20, true);
      const maxY = dv.getFloat64(28, true);

      const partLength = dv.getInt32(36, true);
      const pointLength = dv.getInt32(40, true);
      const doubleLength = pointLength * 2;

      const parts = new Int32Array(arr.buffer, arr.byteOffset + 44, partLength);

      let points: Float64Array;
      const pointsAt = 44 + parts.byteLength;

      try {
        points = new Float64Array(arr.buffer, arr.byteOffset + pointsAt, doubleLength);
      } catch {
        // Have to copy this manually if it's not 8-byte aligned
        points = new Float64Array(doubleLength);
        for (let i = 0; i < doubleLength; ++i) {
          points[i] = dv.getFloat64(pointsAt + i * 8, true);
        }
      }

      return {
        type,
        minX,
        minY,
        maxX,
        maxY,
        parts,
        points,
      };
    }

    default:
      // TODO
      console.debug('ignoring type', type);
  }
}
