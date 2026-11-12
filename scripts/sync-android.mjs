import fs from 'node:fs';
import path from 'node:path';

const distDir = path.resolve('dist');
const androidAssetsDir = path.resolve('android/app/src/main/assets/www');

if (!fs.existsSync(distDir)) {
  console.error('Erro: pasta dist/ não encontrada. Execute "npm run build" primeiro.');
  process.exit(1);
}

fs.rmSync(androidAssetsDir, { recursive: true, force: true });
fs.mkdirSync(androidAssetsDir, { recursive: true });
fs.cpSync(distDir, androidAssetsDir, { recursive: true });

// Ajusta caminhos absolutos (/assets/, /pwa-...) para relativos dentro do WebViewAssetLoader em /assets/www/
const indexHtmlPath = path.join(androidAssetsDir, 'index.html');
if (fs.existsSync(indexHtmlPath)) {
  let html = fs.readFileSync(indexHtmlPath, 'utf8');
  html = html
    .replaceAll('href="/assets/', 'href="./assets/')
    .replaceAll('src="/assets/', 'src="./assets/')
    .replaceAll('href="/pwa-', 'href="./pwa-')
    .replaceAll('href="/apple-touch-icon.png"', 'href="./apple-touch-icon.png"')
    .replaceAll('href="/icon.svg"', 'href="./icon.svg"')
    .replaceAll('href="/manifest.webmanifest"', 'href="./manifest.webmanifest"');
  fs.writeFileSync(indexHtmlPath, html, 'utf8');
}

console.log('✅ Build Web sincronizado para android/app/src/main/assets/www com sucesso!');
