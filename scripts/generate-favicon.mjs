import { mkdir, readFile, writeFile } from "node:fs/promises";

const width = 64;
const height = 64;
const radius = 15;
const bitmapHeaderSize = 40;
const xorRowSize = width * 4;
const andRowSize = Math.ceil(width / 32) * 4;
const imageSize = bitmapHeaderSize + xorRowSize * height + andRowSize * height;
const output = Buffer.alloc(6 + 16 + imageSize);

function insideRoundedSquare(x, y) {
  if (x >= radius && x < width - radius) return true;
  if (y >= radius && y < height - radius) return true;
  const centerX = x < radius ? radius : width - radius - 1;
  const centerY = y < radius ? radius : height - radius - 1;
  return Math.hypot(x - centerX, y - centerY) <= radius;
}

const knight = [
  [40, 12],
  [32, 15],
  [26, 22],
  [30, 29],
  [19, 37],
  [15, 43],
  [15, 49],
  [50, 49],
  [50, 43],
  [27, 43],
  [42, 33],
  [34, 27],
  [37, 22],
  [42, 22],
  [48, 27],
  [56, 22],
  [50, 15],
];

function insidePolygon(x, y, polygon) {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const [currentX, currentY] = polygon[index];
    const [previousX, previousY] = polygon[previous];
    const intersects =
      currentY > y !== previousY > y &&
      x < ((previousX - currentX) * (y - currentY)) / (previousY - currentY) + currentX;
    if (intersects) inside = !inside;
  }
  return inside;
}

function pixelAt(x, y) {
  if (!insideRoundedSquare(x, y)) return [0, 0, 0, 0];
  if (Math.hypot(x - 42, y - 20) <= 2) return [23, 63, 53, 255];
  if (insidePolygon(x + 0.5, y + 0.5, knight)) return [223, 240, 109, 255];
  return [23, 63, 53, 255];
}

output.writeUInt16LE(0, 0);
output.writeUInt16LE(1, 2);
output.writeUInt16LE(1, 4);
output[6] = width;
output[7] = height;
output.writeUInt16LE(1, 10);
output.writeUInt16LE(32, 12);
output.writeUInt32LE(imageSize, 14);
output.writeUInt32LE(22, 18);

const bitmapOffset = 22;
output.writeUInt32LE(bitmapHeaderSize, bitmapOffset);
output.writeInt32LE(width, bitmapOffset + 4);
output.writeInt32LE(height * 2, bitmapOffset + 8);
output.writeUInt16LE(1, bitmapOffset + 12);
output.writeUInt16LE(32, bitmapOffset + 14);
output.writeUInt32LE(xorRowSize * height, bitmapOffset + 20);

const xorOffset = bitmapOffset + bitmapHeaderSize;
const andOffset = xorOffset + xorRowSize * height;
for (let sourceY = 0; sourceY < height; sourceY += 1) {
  const targetY = height - sourceY - 1;
  for (let x = 0; x < width; x += 1) {
    const [red, green, blue, alpha] = pixelAt(x, sourceY);
    const pixelOffset = xorOffset + targetY * xorRowSize + x * 4;
    output[pixelOffset] = blue;
    output[pixelOffset + 1] = green;
    output[pixelOffset + 2] = red;
    output[pixelOffset + 3] = alpha;
    if (alpha === 0) {
      output[andOffset + targetY * andRowSize + Math.floor(x / 8)] |= 1 << (7 - (x % 8));
    }
  }
}

const destination = new URL("../public/favicon.ico", import.meta.url);
if (process.argv.includes("--check")) {
  const committed = await readFile(destination).catch(() => null);
  if (!committed?.equals(output)) {
    console.error("Committed favicon.ico does not match the deterministic generator.");
    process.exitCode = 1;
  } else {
    console.log("Verified deterministic Chess Lab favicon (64x64).");
  }
} else {
  await mkdir(new URL("../public/", import.meta.url), { recursive: true });
  await writeFile(destination, output);
  console.log(`Generated ${destination.pathname} (${output.length} bytes, 64x64).`);
}
