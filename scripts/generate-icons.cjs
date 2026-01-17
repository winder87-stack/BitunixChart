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

  // Generate .icns and .ico using png2icons
  try {
    const png2icons = require('png2icons');
    const mainIconBuffer = fs.readFileSync(path.join(ICONS_DIR, 'icon.png'));
    
    console.log('\nGenerating icon.icns...');
    const icnsBuffer = png2icons.createICNS(mainIconBuffer, png2icons.BILINEAR, 0);
    if (icnsBuffer) {
      fs.writeFileSync(path.join(ICONS_DIR, 'icon.icns'), icnsBuffer);
      console.log('  ✓ icon.icns');
    } else {
      console.error('  ✗ Failed to generate icon.icns');
    }

    console.log('\nGenerating icon.ico...');
    const icoBuffer = png2icons.createICO(mainIconBuffer, png2icons.BILINEAR, 0, false);
    if (icoBuffer) {
      fs.writeFileSync(path.join(ICONS_DIR, 'icon.ico'), icoBuffer);
      console.log('  ✓ icon.ico');
    } else {
      console.error('  ✗ Failed to generate icon.ico');
    }
  } catch (e) {
    console.error('\n⚠️  Could not generate .icns/.ico (png2icons not installed?)', e.message);
  }

  console.log('\n✅ Icon generation complete!');
}

generateIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
