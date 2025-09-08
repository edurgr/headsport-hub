/*
  CSV Importer for ALL PRODUCT TABLES
  - Reads all CSV files from csv/ directory
  - Upserts into corresponding tables: accessories, bindings, boots, goggles, helmet, ski, snowboards_*

  Env required:
  - NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL
  - SUPABASE_SERVICE_ROLE_KEY
*/

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.resolve(__dirname, '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    'Missing Supabase env. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

function parseCsv(content) {
  const lines = content.split(/\r?\n/).filter(Boolean);
  const header = lines[0].split(',').map((h) => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const row = [];
    let cur = '';
    let inQ = false;
    for (let c of lines[i]) {
      if (c === '"') {
        inQ = !inQ;
        continue;
      }
      if (c === ',' && !inQ) {
        row.push(cur);
        cur = '';
      } else {
        cur += c;
      }
    }
    row.push(cur);
    const obj = {};
    header.forEach((h, idx) => {
      obj[h] = (row[idx] || '').trim();
    });
    rows.push(obj);
  }
  return rows;
}

function toNumberEU(val) {
  if (!val) return null;
  const cleaned = String(val)
    .replace(/[^0-9,\.\-]/g, '')
    .replace(/,(?=\d{1,2}(\D|$))/g, '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function extractSidecut(text) {
  // e.g., 101/65/84 @ Length 193
  if (!text)
    return { sidecut_top: null, sidecut_mid: null, sidecut_tail: null, sidecut_length: null };
  const match = text.match(/(\d+[\.,]?\d?)\/(\d+[\.,]?\d?)\/(\d+[\.,]?\d?)\s*@\s*Length\s*(\d+)/i);
  if (!match)
    return { sidecut_top: null, sidecut_mid: null, sidecut_tail: null, sidecut_length: null };
  return {
    sidecut_top: match[1],
    sidecut_mid: match[2],
    sidecut_tail: match[3],
    sidecut_length: match[4],
  };
}

function extractRadius(text) {
  // e.g., 30,5 @ Length 193
  if (!text) return { radius_value: null, radius_length: null };
  const match = text.match(/([0-9][0-9\.,]*)\s*@\s*Length\s*(\d+)/i);
  if (!match) return { radius_value: null, radius_length: null };
  return {
    radius_value: toNumberEU(match[1]),
    radius_length: match[2],
  };
}

function extractDinRange(text) {
  // e.g., "3 - 11" or "3,5 - 12"
  if (!text) return { din_min: null, din_max: null };
  const match = text.match(/([0-9][0-9\.,]*)\s*[-–]\s*([0-9][0-9\.,]*)/);
  if (!match) return { din_min: null, din_max: null };
  return { din_min: toNumberEU(match[1]), din_max: toNumberEU(match[2]) };
}

async function tableExists(table) {
  const { error } = await supabase.from(table).select('*').limit(1);
  return !error;
}

async function upsertIntoProducts(rows, isSki) {
  for (const r of rows) {
    const article = r['article'];
    if (!article) continue;
    const verLang = r['ver.lang'] || '';
    const [ver, lang] = verLang.includes('.') ? verLang.split('.') : ['', verLang];

    const base = {
      article: String(article),
      name: r['name'] || '',
      lang: lang || 'EN',
      is_active: true,
      meta: isSki ? 'TYPE:SKI.SKIS' : 'TYPE:SKI.BINDINGS',
    };

    const payload = isSki
      ? {
          ...base,
          length_list: r['length'] || null,
          radius: r['radius'] || null,
          sidecut: r['sidecut'] || null,
          plate: r['plate'] || null,
          bindings: r['binding'] || null,
        }
      : {
          ...base,
          stand_height: r['stand_height'] || null,
          din: r['din'] || null,
          weight: r['weight'] || null,
        };

    const { error } = await supabase.from('products').upsert(payload, { onConflict: 'article' });
    if (error) {
      console.error('Upsert products error for', article, error.message);
    }
  }
}

async function importSkis(csvPath) {
  console.log('Importing SKIS from', csvPath);
  const content = fs.readFileSync(csvPath, 'utf-8');
  const rows = parseCsv(content);
  // Prefer normalized table if exists
  if (await tableExists('ski')) {
    for (const r of rows) {
      const article = r['article'];
      if (!article) continue;
      const verLang = r['ver.lang'] || '';
      const [ver, lang] = verLang.includes('.') ? verLang.split('.') : ['', verLang];
      const length_list = r['length'] || '';
      const { radius_value, radius_length } = extractRadius(r['radius']);
      const { sidecut_top, sidecut_mid, sidecut_tail, sidecut_length } = extractSidecut(
        r['sidecut'],
      );

      const payload = {
        article: String(article),
        ver: ver || null,
        lang: lang || 'EN',
        name: r['name'] || '',
        category: 'ski',
        length: r['length'] || null,
        radius: r['radius'] || null,
        sidecut: r['sidecut'] || null,
        plate: r['plate'] || null,
        bindings: r['binding'] || null,
        length_list: length_list || null,
        radius_value,
        radius_length,
        sidecut_top,
        sidecut_mid,
        sidecut_tail,
        sidecut_length,
        is_active: true,
      };

      const { error } = await supabase.from('ski').upsert(payload, { onConflict: 'article' });
      if (error) {
        console.error('Upsert ski error for', article, error.message);
      }
    }
    return;
  }
  if (await tableExists('products')) {
    await upsertIntoProducts(rows, true);
    return;
  }
  for (const r of rows) {
    const article = r['article'];
    if (!article) continue;
    const verLang = r['ver.lang'] || '';
    const [ver, lang] = verLang.includes('.') ? verLang.split('.') : ['', verLang];
    const length_list = r['length'] || '';
    const { radius_value, radius_length } = extractRadius(r['radius']);
    const { sidecut_top, sidecut_mid, sidecut_tail, sidecut_length } = extractSidecut(r['sidecut']);

    const payload = {
      article: String(article),
      ver: ver || null,
      lang: lang || 'EN',
      name: r['name'] || '',
      category: 'ski',
      length: r['length'] || null,
      radius: r['radius'] || null,
      sidecut: r['sidecut'] || null,
      plate: r['plate'] || null,
      bindings: r['binding'] || null,
      length_list: length_list || null,
      radius_value,
      radius_length,
      sidecut_top,
      sidecut_mid,
      sidecut_tail,
      sidecut_length,
      is_active: true,
    };

    const { error } = await supabase.from('ski').upsert(payload, { onConflict: 'article' });
    if (error) {
      console.error('Upsert ski error for', article, error.message);
    }
  }
}

async function importBindings(csvPath) {
  console.log('Importing BINDINGS from', csvPath);
  const content = fs.readFileSync(csvPath, 'utf-8');
  const rows = parseCsv(content);
  if (await tableExists('bindings')) {
    for (const r of rows) {
      const article = r['article'];
      if (!article) continue;
      const verLang = r['ver.lang'] || '';
      const [ver, lang] = verLang.includes('.') ? verLang.split('.') : ['', verLang];
      const { din_min, din_max } = extractDinRange(r['din']);
      const weight_value = toNumberEU(r['weight']);

      const payload = {
        article: String(article),
        ver: ver || null,
        lang: lang || 'EN',
        name: r['name'] || '',
        category: 'bindings',
        stand_height: r['stand_height'] || null,
        din: r['din'] || null,
        weight: r['weight'] || null,
        din_min,
        din_max,
        weight_value,
        is_active: true,
      };

      const { error } = await supabase.from('bindings').upsert(payload, { onConflict: 'article' });
      if (error) {
        console.error('Upsert bindings error for', article, error.message);
      }
    }
    return;
  }
  if (await tableExists('products')) {
    await upsertIntoProducts(rows, false);
    return;
  }
  for (const r of rows) {
    const article = r['article'];
    if (!article) continue;
    const verLang = r['ver.lang'] || '';
    const [ver, lang] = verLang.includes('.') ? verLang.split('.') : ['', verLang];
    const { din_min, din_max } = extractDinRange(r['din']);
    const weight_value = toNumberEU(r['weight']);

    const payload = {
      article: String(article),
      ver: ver || null,
      lang: lang || 'EN',
      name: r['name'] || '',
      category: 'bindings',
      stand_height: r['stand_height'] || null,
      din: r['din'] || null,
      weight: r['weight'] || null,
      din_min,
      din_max,
      weight_value,
      is_active: true,
    };

    const { error } = await supabase.from('bindings').upsert(payload, { onConflict: 'article' });
    if (error) {
      console.error('Upsert bindings error for', article, error.message);
    }
  }
}

// Import functions for other product tables
async function importAccessories(csvPath) {
  console.log('Importing ACCESSORIES from', csvPath);
  const content = fs.readFileSync(csvPath, 'utf-8');
  const rows = parseCsv(content);

  for (const r of rows) {
    const article = r['article'];
    if (!article) continue;

    const payload = {
      article: String(article),
      ver: r['ver'] || null,
      lang: r['lang'] || 'EN',
      name: r['name'] || '',
      category: 'accessories',
      length: r['length'] || null,
      colors: r['colors'] || null,
      diameter: r['diameter'] || null,
      is_active: true,
    };

    const { error } = await supabase.from('accessories').upsert(payload, { onConflict: 'article' });
    if (error) {
      console.error('Upsert accessories error for', article, error.message);
    }
  }
}

async function importBoots(csvPath) {
  console.log('Importing BOOTS from', csvPath);
  const content = fs.readFileSync(csvPath, 'utf-8');
  const rows = parseCsv(content);

  for (const r of rows) {
    const article = r['article'];
    if (!article) continue;

    const payload = {
      article: String(article),
      category: r['category'] || 'BOOTS',
      name: r['name'] || '',
      flex: r['flex'] || null,
      sizes: r['sizes'] || null,
      colors: r['colors'] || null,
      shell: r['shell'] || null,
      ergo_balance: r['ergo_balance'] || null,
      forward_lean: r['forward_lean'] || null,
      ramp_angle: r['ramp_angle'] || null,
      last1: r['last1'] || null,
      last2: r['last2'] || null,
      size: r['size'] || null,
      is_active: true,
    };

    const { error } = await supabase.from('boots').upsert(payload, { onConflict: 'article' });
    if (error) {
      console.error('Upsert boots error for', article, error.message);
    }
  }
}

async function importGoggles(csvPath) {
  console.log('Importing GOGGLES from', csvPath);
  const content = fs.readFileSync(csvPath, 'utf-8');
  const rows = parseCsv(content);

  for (const r of rows) {
    const article = r['article'];
    if (!article) continue;

    const payload = {
      article: String(article),
      ver: r['ver'] || null,
      lang: r['lang'] || 'EN',
      name: r['name'] || '',
      category: 'goggles',
      length: r['length'] || null,
      color: r['color'] || null,
      weather: r['weather'] || null,
      is_active: true,
    };

    const { error } = await supabase.from('goggles').upsert(payload, { onConflict: 'article' });
    if (error) {
      console.error('Upsert goggles error for', article, error.message);
    }
  }
}

async function importHelmets(csvPath) {
  console.log('Importing HELMETS from', csvPath);
  const content = fs.readFileSync(csvPath, 'utf-8');
  const rows = parseCsv(content);

  for (const r of rows) {
    const article = r['article'];
    if (!article) continue;

    const payload = {
      article: String(article),
      ver: r['ver'] || null,
      lang: r['lang'] || 'EN',
      name: r['name'] || '',
      category: 'helmet',
      sizes: r['sizes'] || null,
      colors: r['colors'] || null,
      visor: r['visor'] || null,
      is_active: true,
    };

    const { error } = await supabase.from('helmet').upsert(payload, { onConflict: 'article' });
    if (error) {
      console.error('Upsert helmet error for', article, error.message);
    }
  }
}

async function importSnowboardsBoots(csvPath) {
  console.log('Importing SNOWBOARDS_BOOTS from', csvPath);
  const content = fs.readFileSync(csvPath, 'utf-8');
  const rows = parseCsv(content);

  for (const r of rows) {
    const article = r['article'];
    if (!article) continue;

    const payload = {
      article: String(article),
      ver: r['ver'] || null,
      lang: r['lang'] || 'EN',
      name: r['name'] || '',
      category: 'snowboard_boots',
      sizes: r['sizes'] || null,
      colors: r['colors'] || null,
      flex: r['flex'] || null,
      forward_lean: r['forward_lean'] || null,
      is_active: true,
    };

    const { error } = await supabase
      .from('snowboards_boots')
      .upsert(payload, { onConflict: 'article' });
    if (error) {
      console.error('Upsert snowboards_boots error for', article, error.message);
    }
  }
}

async function importSnowboardsAccessories(csvPath) {
  console.log('Importing SNOWBOARDS_ACCESSORIES from', csvPath);
  const content = fs.readFileSync(csvPath, 'utf-8');
  const rows = parseCsv(content);

  for (const r of rows) {
    const article = r['article'];
    if (!article) continue;

    const payload = {
      article: String(article),
      ver: r['ver'] || null,
      lang: r['lang'] || 'EN',
      name: r['name'] || '',
      category: 'snowboard_accessories',
      colors: r['colors'] || null,
      volume: r['volume'] || null,
      dimensions: r['dimensions'] || null,
      is_active: true,
    };

    const { error } = await supabase
      .from('snowboards_accessories')
      .upsert(payload, { onConflict: 'article' });
    if (error) {
      console.error('Upsert snowboards_accessories error for', article, error.message);
    }
  }
}

async function importSnowboardsBindings(csvPath) {
  console.log('Importing SNOWBOARDS_BINDINGS from', csvPath);
  const content = fs.readFileSync(csvPath, 'utf-8');
  const rows = parseCsv(content);

  for (const r of rows) {
    const article = r['article'];
    if (!article) continue;

    const payload = {
      article: String(article),
      ver: r['ver'] || null,
      lang: r['lang'] || 'EN',
      name: r['name'] || '',
      category: 'snowboard_bindings',
      sizes: r['sizes'] || null,
      colors: r['colors'] || null,
      skills: r['skills'] || null,
      flex: r['flex'] || null,
      is_active: true,
    };

    const { error } = await supabase
      .from('snowboards_bindings')
      .upsert(payload, { onConflict: 'article' });
    if (error) {
      console.error('Upsert snowboards_bindings error for', article, error.message);
    }
  }
}

async function importSnowboardsBoards(csvPath) {
  console.log('Importing SNOWBOARDS_BOARDS from', csvPath);
  const content = fs.readFileSync(csvPath, 'utf-8');
  const rows = parseCsv(content);

  for (const r of rows) {
    const article = r['article'];
    if (!article) continue;

    const payload = {
      article: String(article),
      ver: r['ver'] || null,
      lang: r['lang'] || 'EN',
      name: r['name'] || '',
      category: 'snowboard_boards',
      shape: r['shape'] || null,
      skill: r['skill'] || null,
      camber: r['camber'] || null,
      architecture: r['architecture'] || null,
      graphene_or_bamboo: r['graphene_or_bamboo'] || null,
      flex: r['flex'] || null,
      base: r['base'] || null,
      is_active: true,
    };

    const { error } = await supabase
      .from('snowboards_boards')
      .upsert(payload, { onConflict: 'article' });
    if (error) {
      console.error('Upsert snowboards_boards error for', article, error.message);
    }
  }
}

async function main() {
  try {
    const csvDir = path.resolve(__dirname, '../csv');
    if (!fs.existsSync(csvDir)) {
      throw new Error('CSV directory not found under ../csv');
    }

    // Import all CSV files
    const csvFiles = [
      { file: 'accessories.csv', importFn: importAccessories },
      { file: 'bindings.csv', importFn: importBindings },
      { file: 'boots.csv', importFn: importBoots },
      { file: 'goggles.csv', importFn: importGoggles },
      { file: 'helmets.csv', importFn: importHelmets },
      { file: 'skis.csv', importFn: importSkis },
      { file: 'snowboards_boots.csv', importFn: importSnowboardsBoots },
      { file: 'snowboards_accessories.csv', importFn: importSnowboardsAccessories },
      { file: 'snowboards_bindings.csv', importFn: importSnowboardsBindings },
      { file: 'snowboards_boards.csv', importFn: importSnowboardsBoards },
    ];

    for (const { file, importFn } of csvFiles) {
      const csvPath = path.resolve(csvDir, file);
      if (fs.existsSync(csvPath)) {
        await importFn(csvPath);
      } else {
        console.log(`⚠️  CSV file not found: ${file}`);
      }
    }

    console.log('✅ Import completed for all available CSV files');
  } catch (e) {
    console.error('❌ Import failed:', e.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  importSkis,
  importBindings,
  importAccessories,
  importBoots,
  importGoggles,
  importHelmets,
  importSnowboardsBoots,
  importSnowboardsAccessories,
  importSnowboardsBindings,
  importSnowboardsBoards,
};
