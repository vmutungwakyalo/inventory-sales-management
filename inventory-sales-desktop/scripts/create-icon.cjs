const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const pngToIco = require('png-to-ico');

const root = path.resolve(__dirname, '..');
const svgPath = path.join(root, 'assets', 'inventory-icon.svg');
const pngPath = path.join(root, 'assets', 'inventory-icon.png');
const icoPath = path.join(root, 'assets', 'inventory-icon.ico');

async function main() {
  fs.mkdirSync(path.dirname(icoPath), { recursive: true });
  await sharp(svgPath).resize(256, 256).png().toFile(pngPath);
  const ico = await pngToIco(pngPath);
  fs.writeFileSync(icoPath, ico);
  fs.rmSync(pngPath, { force: true });
  console.log(`Created ${icoPath}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});