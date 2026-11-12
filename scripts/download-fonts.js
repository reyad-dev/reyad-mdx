const fs = require('fs');
const path = require('path');

const fontsDir = path.join(__dirname, '..', 'app', 'fonts');
fs.mkdirSync(fontsDir, { recursive: true });

const fontSources = [
  {
    file: 'cairo-arabic.woff2',
    url: 'https://fonts.gstatic.com/s/cairo/v31/SLXVc1nY6HkvangtZmpQdkhzfH5lkSscQyyS4J0.woff2'
  },
  {
    file: 'cairo-latin.woff2',
    url: 'https://fonts.gstatic.com/s/cairo/v31/SLXVc1nY6HkvangtZmpQdkhzfH5lkSscRiyS.woff2'
  },
  {
    file: 'cairo-latin-ext.woff2',
    url: 'https://fonts.gstatic.com/s/cairo/v31/SLXVc1nY6HkvangtZmpQdkhzfH5lkSscSCyS4J0.woff2'
  },
  {
    file: 'almarai-400-arabic.woff2',
    url: 'https://fonts.gstatic.com/s/almarai/v19/tsstApxBaigK_hnnQ1iFo0C3.woff2'
  },
  {
    file: 'almarai-400-latin.woff2',
    url: 'https://fonts.gstatic.com/s/almarai/v19/tsstApxBaigK_hnnQ12Fow.woff2'
  },
  {
    file: 'almarai-700-arabic.woff2',
    url: 'https://fonts.gstatic.com/s/almarai/v19/tssoApxBaigK_hnnS-agtnqWo572.woff2'
  },
  {
    file: 'almarai-700-latin.woff2',
    url: 'https://fonts.gstatic.com/s/almarai/v19/tssoApxBaigK_hnnS-agtn-Wow.woff2'
  },
  {
    file: 'tajawal-400-arabic.woff2',
    url: 'https://fonts.gstatic.com/s/tajawal/v12/Iura6YBj_oCad4k1nzSBC45I.woff2'
  },
  {
    file: 'tajawal-400-latin.woff2',
    url: 'https://fonts.gstatic.com/s/tajawal/v12/Iura6YBj_oCad4k1nzGBCw.woff2'
  },
  {
    file: 'tajawal-700-arabic.woff2',
    url: 'https://fonts.gstatic.com/s/tajawal/v12/Iurf6YBj_oCad4k1l4qkHrRpiYlJ.woff2'
  },
  {
    file: 'tajawal-700-latin.woff2',
    url: 'https://fonts.gstatic.com/s/tajawal/v12/Iurf6YBj_oCad4k1l4qkHrFpiQ.woff2'
  }
];

async function main() {
  console.log('Downloading fonts to', fontsDir);
  for (const item of fontSources) {
    const dest = path.join(fontsDir, item.file);
    console.log('Fetching', item.file, 'from', item.url);
    const res = await fetch(item.url);
    if (!res.ok) throw new Error(`Failed to fetch ${item.url}: ${res.statusText}`);
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(dest, buf);
    console.log('Saved', item.file, `(${buf.length} bytes)`);
  }
  console.log('All fonts downloaded successfully!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
