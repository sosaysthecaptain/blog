import sharp from 'sharp';
import { writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

// The Hindenburg/Dirigible SVG path (from user's tracing in Sidebar)
// Using the filled outline version for favicon
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 728 387">
  <path fill="#1a1a1a" d="M148.677 123.244C173.807 115.461 198.003 109.086 216.472 105.725C271.902 95.6382 308.571 92.5347 405.787 90.2071C503.003 87.8794 593.823 109.604 607.893 115.811C621.964 122.018 659.486 145.295 669.719 157.709C673.841 164.175 682.852 178.968 685.922 186.417C688.992 193.865 689.191 195.727 688.907 195.727C687.485 200.124 683.875 210.314 680.805 215.9C677.735 221.487 670.146 233.746 666.735 239.177C657.78 249.263 632.963 269.71 591.264 281.85C548.626 294.264 503.856 298.144 393.422 298.92C282.988 299.696 206.665 284.954 140.576 267.884C104.189 258.487 67.87 239.975 42.3196 224.54C30.7439 217.547 21.3785 211.186 15.2188 206.59C8.82298 202.71 1.83031 190.762 25.0256 174.003C29.2604 170.943 35.1597 167.536 42.3196 163.916L42.9338 159.261C44.7814 138.312 48.6473 95.1727 49.3295 90.2071C50.0117 85.2414 53.0249 84 54.4462 84C72.2122 84.5173 108.256 85.5518 110.303 85.5518C112.861 85.5518 119.683 87.1035 121.389 87.8794C123.094 88.6553 131.195 94.0865 138.87 103.397C145.01 110.846 147.967 119.732 148.677 123.244ZM42.3196 224.54C44.0878 244.678 47.7092 285.575 48.0504 288.057C48.3915 290.54 62.9739 295.816 70.2224 298.144C82.1612 300.73 107.83 305.437 114.993 303.575C123.947 301.247 133.754 295.04 137.165 290.385C140.576 285.73 145.692 277.195 147.824 270.988L140.576 267.884C67.87 239.975 42.3196 224.54 42.3196 224.54Z"/>
</svg>`;

async function generateFavicon() {
  const sizes = [16, 32, 48];
  const pngBuffers = [];

  for (const size of sizes) {
    const pngBuffer = await sharp(Buffer.from(svgContent))
      .resize(size, size)
      .png()
      .toBuffer();
    pngBuffers.push({ size, buffer: pngBuffer });
  }

  // Create ICO file manually (ICO format is simple for small files)
  // ICO header: 6 bytes
  // ICO directory entries: 16 bytes each
  // Image data follows

  const numImages = pngBuffers.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  const dirSize = dirEntrySize * numImages;

  let dataOffset = headerSize + dirSize;
  const imageOffsets = [];

  for (const { buffer } of pngBuffers) {
    imageOffsets.push(dataOffset);
    dataOffset += buffer.length;
  }

  const totalSize = dataOffset;
  const icoBuffer = Buffer.alloc(totalSize);

  // ICO Header
  icoBuffer.writeUInt16LE(0, 0);      // Reserved, must be 0
  icoBuffer.writeUInt16LE(1, 2);      // Image type: 1 = ICO
  icoBuffer.writeUInt16LE(numImages, 4); // Number of images

  // ICO Directory entries
  let offset = headerSize;
  for (let i = 0; i < numImages; i++) {
    const { size, buffer } = pngBuffers[i];

    icoBuffer.writeUInt8(size === 256 ? 0 : size, offset);     // Width
    icoBuffer.writeUInt8(size === 256 ? 0 : size, offset + 1); // Height
    icoBuffer.writeUInt8(0, offset + 2);                        // Color palette
    icoBuffer.writeUInt8(0, offset + 3);                        // Reserved
    icoBuffer.writeUInt16LE(1, offset + 4);                     // Color planes
    icoBuffer.writeUInt16LE(32, offset + 6);                    // Bits per pixel
    icoBuffer.writeUInt32LE(buffer.length, offset + 8);         // Image size
    icoBuffer.writeUInt32LE(imageOffsets[i], offset + 12);      // Image offset

    offset += dirEntrySize;
  }

  // Write image data
  for (let i = 0; i < numImages; i++) {
    pngBuffers[i].buffer.copy(icoBuffer, imageOffsets[i]);
  }

  // Write the ICO file
  const faviconPath = join(projectRoot, 'src', 'app', 'favicon.ico');
  writeFileSync(faviconPath, icoBuffer);
  console.log(`Generated favicon.ico at ${faviconPath}`);

  // Also generate a 32x32 PNG for the public folder
  const png32 = await sharp(Buffer.from(svgContent))
    .resize(32, 32)
    .png()
    .toBuffer();

  writeFileSync(join(projectRoot, 'public', 'favicon-32.png'), png32);
  console.log('Generated favicon-32.png');
}

generateFavicon().catch(console.error);
