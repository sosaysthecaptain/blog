import sharp from 'sharp';
import { writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

// The zeppelin SVG path (extracted and centered for favicon use)
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <g transform="translate(-2, 4) scale(0.36)">
    <path fill="#1a1a1a" d="M42.271,30.159c-7.701,0-14.695,1.856-19.819,4.894c-5.125,3.037-8.409,7.312-8.409,12.178c0,4.836,3.284,9.139,8.409,12.178c4.247,2.502,9.768,4.162,15.884,4.668l1.047,3.516c0.396,1.35,1.671,2.25,3.115,2.25H55.89c1.415,0,2.746-0.9,3.114-2.25v-0.029l1.67-5.623c3.087-0.703,6.116-1.52,8.976-2.477c2.747-0.898,5.323-1.939,7.56-3.064l7.503,5.146c0.481,0.309,1.246-0.084,1.246-0.646V33.562c0-0.253-0.142-0.478-0.34-0.647c-0.368-0.281-0.623-0.197-0.906,0l-7.503,5.091c-2.236-1.097-4.813-2.109-7.56-3.038C60.73,31.987,50,30.159,42.271,30.159z"/>
  </g>
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
