#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ICONS_DIR = path.join(__dirname, '../assets/icons');
const SVG_PATH = path.join(ICONS_DIR, 'icon.svg');

const LINUX_SIZES = [16, 24, 32, 48, 64, 128, 256, 512];

async function generateIcons() {
  console.log('Generating icons from SVG...\n');

  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    console.error('Error: sharp is not installed.');
    console.error('Run: npm install --save-dev sharp');
    process.exit(1);
  }

  if (!fs.existsSync(SVG_PATH)) {
    console.error(`Error: SVG not found at ${SVG_PATH}`);
    process.exit(1);
  }

  const svgBuffer = fs.readFileSync(SVG_PATH);

  console.log('Generating PNG sizes for Linux...');
  for (const size of LINUX_SIZES) {
    const outputPath = path.join(ICONS_DIR, `${size}x${size}.png`);
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`  ✓ ${size}x${size}.png`);
  }

  console.log('\nGenerating main icon.png (512x512)...');
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(ICONS_DIR, 'icon.png'));
  console.log('  ✓ icon.png');

  console.log('\n✅ Icon generation complete!');
  console.log('\nGenerated files:');
  console.log('  - icon.png (512x512)');
  LINUX_SIZES.forEach(size => {
    console.log(`  - ${size}x${size}.png`);
  });

  console.log('\n⚠️  Note: For .ico and .icns files, use:');
  console.log('  - Windows (.ico): https://icoconvert.com/');
  console.log('  - macOS (.icns): iconutil or https://cloudconvert.com/');
  console.log('\nOr install png-to-ico and png2icns packages for automation.');
}

generateIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
