import { Jimp } from 'jimp';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logoPath = path.join(__dirname, '../public/logo.png');
const out192Path = path.join(__dirname, '../public/pwa-192x192.png');
const out512Path = path.join(__dirname, '../public/pwa-512x512.png');

console.log('Resizing PWA icons...');

try {
  const image = await Jimp.read(logoPath);

  // 192x192
  const img192 = image.clone();
  img192.resize({ w: 192, h: 192 });
  await img192.write(out192Path);
  console.log('Generated: pwa-192x192.png');

  // 512x512
  const img512 = image.clone();
  img512.resize({ w: 512, h: 512 });
  await img512.write(out512Path);
  console.log('Generated: pwa-512x512.png');
} catch (err) {
  console.error('Error processing images:', err);
}
