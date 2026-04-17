const URL_SCHEMES = ['http://', 'https://'];

function isValidUrl(value) {
  try {
    // eslint-disable-next-line no-new
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function isStrongJwt(secret) {
  return typeof secret === 'string' && secret.length >= 32;
}

function print(rows) {
  const width = Math.max(...rows.map((r) => r.key.length), 26);
  const header = `${'Variable'.padEnd(width)}  Status  Note`;
  const line = '-'.repeat(header.length);
  console.log(`\n${line}`);
  console.log(header);
  console.log(line);
  for (const row of rows) {
    console.log(`${row.key.padEnd(width)}  ${row.status.padEnd(6)}  ${row.note}`);
  }
  console.log(`${line}\n`);
}

function validateEnv() {
  const rows = [];
  const isProd = process.env.NODE_ENV === 'production';
  let hasFatal = false;

  const requiredAlways = ['DATABASE_URL', 'DIRECT_URL', 'JWT_SECRET'];
  const requiredProdOnly = [
    'REDIS_URL',
    'NEXT_PUBLIC_SITE_URL',
    'NEXT_PUBLIC_GA_MEASUREMENT_ID',
    'CLAMAV_REQUIRED',
    'STORAGE_DRIVER',
    'STORAGE_BUCKET',
    'STORAGE_ACCESS_KEY_ID',
    'STORAGE_SECRET_ACCESS_KEY',
    'SMTP_HOST',
    'SMTP_USER',
    'SMTP_PASS',
  ];

  for (const key of requiredAlways) {
    const value = process.env[key];
    if (!value) {
      rows.push({ key, status: 'FAIL', note: 'Missing (required)' });
      hasFatal = true;
    } else {
      rows.push({ key, status: 'OK', note: 'Present' });
    }
  }

  for (const key of requiredProdOnly) {
    const value = process.env[key];
    if (!value) {
      if (isProd) {
        rows.push({ key, status: 'FAIL', note: 'Missing (required in production)' });
        hasFatal = true;
      } else {
        rows.push({ key, status: 'WARN', note: 'Missing (required in production)' });
      }
    } else {
      rows.push({ key, status: 'OK', note: 'Present' });
    }
  }

  const dbUrl = process.env.DATABASE_URL || '';
  const directUrl = process.env.DIRECT_URL || '';
  const forbiddenSupabaseApiVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];

  const configuredForbiddenVars = forbiddenSupabaseApiVars.filter((key) => {
    const value = process.env[key];
    return typeof value === 'string' && value.trim().length > 0;
  });
  if (configuredForbiddenVars.length > 0) {
    rows.push({
      key: 'SUPABASE_DATA_API_POLICY',
      status: 'FAIL',
      note: `Forbidden vars configured: ${configuredForbiddenVars.join(', ')}. Use backend PostgreSQL connection only.`,
    });
    hasFatal = true;
  } else {
    rows.push({
      key: 'SUPABASE_DATA_API_POLICY',
      status: 'OK',
      note: 'No Supabase Data API/client keys configured.',
    });
  }

  if (dbUrl && !/^postgres(?:ql)?:\/\//i.test(dbUrl)) {
    rows.push({ key: 'DATABASE_URL(format)', status: 'FAIL', note: 'Must start with postgresql:// or postgres://' });
    hasFatal = true;
  } else if (dbUrl) {
    rows.push({ key: 'DATABASE_URL(format)', status: 'OK', note: 'Valid PostgreSQL URL' });
  }
  if (/[<[]SUPABASE_DB_PASSWORD[>\]]/i.test(dbUrl) || /[<[]SUPABASE_DB_PASSWORD[>\]]/i.test(directUrl)) {
    rows.push({
      key: 'SUPABASE_DB_PASSWORD',
      status: 'FAIL',
      note: 'Replace placeholder with actual Supabase DB password.',
    });
    hasFatal = true;
  }
  const usesSupabase = /supabase\.co/i.test(dbUrl) || /supabase\.co/i.test(directUrl);
  if (usesSupabase) {
    const dbHasSsl = /(?:\?|&)sslmode=require(?:&|$)/i.test(dbUrl);
    const directHasSsl = /(?:\?|&)sslmode=require(?:&|$)/i.test(directUrl);
    if (!dbHasSsl || !directHasSsl) {
      rows.push({
        key: 'SUPABASE_SSLMODE',
        status: isProd ? 'FAIL' : 'WARN',
        note: 'Supabase PostgreSQL bağlantısında sslmode=require kullanın (DATABASE_URL ve DIRECT_URL).',
      });
      if (isProd) hasFatal = true;
    } else {
      rows.push({ key: 'SUPABASE_SSLMODE', status: 'OK', note: 'sslmode=require' });
    }
  }

  if (directUrl && !/^postgres(?:ql)?:\/\//i.test(directUrl)) {
    rows.push({ key: 'DIRECT_URL(format)', status: 'FAIL', note: 'Must start with postgresql:// or postgres://' });
    hasFatal = true;
  } else if (directUrl) {
    rows.push({ key: 'DIRECT_URL(format)', status: 'OK', note: 'Valid PostgreSQL URL' });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl) {
    if (!URL_SCHEMES.some((s) => siteUrl.startsWith(s)) || !isValidUrl(siteUrl)) {
      rows.push({ key: 'NEXT_PUBLIC_SITE_URL(format)', status: 'FAIL', note: 'Must be a valid http/https URL' });
      hasFatal = true;
    } else {
      rows.push({ key: 'NEXT_PUBLIC_SITE_URL(format)', status: 'OK', note: 'Valid URL' });
    }
  }

  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    if (!/^redis:\/\//i.test(redisUrl)) {
      rows.push({ key: 'REDIS_URL(format)', status: 'FAIL', note: 'Must start with redis://' });
      hasFatal = true;
    } else {
      rows.push({ key: 'REDIS_URL(format)', status: 'OK', note: 'Valid redis URL' });
    }
  }

  const jwt = process.env.JWT_SECRET;
  if (jwt && !isStrongJwt(jwt)) {
    rows.push({ key: 'JWT_SECRET(strength)', status: isProd ? 'FAIL' : 'WARN', note: 'Must be at least 32 characters' });
    if (isProd) hasFatal = true;
  } else if (jwt) {
    rows.push({ key: 'JWT_SECRET(strength)', status: 'OK', note: `${jwt.length} chars` });
  }

  const clam = process.env.CLAMAV_REQUIRED;
  if (clam && !['true', 'false'].includes(String(clam).toLowerCase())) {
    rows.push({ key: 'CLAMAV_REQUIRED(format)', status: 'FAIL', note: 'Must be true or false' });
    hasFatal = true;
  } else if (clam) {
    rows.push({ key: 'CLAMAV_REQUIRED(format)', status: 'OK', note: String(clam).toLowerCase() });
  }
  if (isProd && String(clam || '').toLowerCase() !== 'true') {
    rows.push({
      key: 'CLAMAV_REQUIRED(production)',
      status: 'FAIL',
      note: 'Must be true in production',
    });
    hasFatal = true;
  }

  const storageDriver = String(process.env.STORAGE_DRIVER || '').toLowerCase();
  const storageRegion = String(process.env.STORAGE_REGION || '').trim();
  const storageEndpoint = String(process.env.STORAGE_ENDPOINT || '').trim();
  if (storageDriver) {
    if (!['s3', 'r2'].includes(storageDriver)) {
      rows.push({
        key: 'STORAGE_DRIVER(format)',
        status: 'FAIL',
        note: 'Must be s3 or r2',
      });
      hasFatal = true;
    } else {
      rows.push({ key: 'STORAGE_DRIVER(format)', status: 'OK', note: storageDriver });
    }
  }

  if (storageDriver === 's3' && storageRegion.toLowerCase() === 'auto') {
    rows.push({
      key: 'STORAGE_REGION(s3)',
      status: 'FAIL',
      note: 'S3 icin STORAGE_REGION=auto gecersiz. Gercek AWS region kullanin (ornek: eu-central-1).',
    });
    hasFatal = true;
  } else if (storageDriver === 's3' && storageRegion) {
    rows.push({
      key: 'STORAGE_REGION(s3)',
      status: 'OK',
      note: storageRegion,
    });
  }

  if (storageDriver === 'r2') {
    if (!storageEndpoint || !/^https?:\/\//i.test(storageEndpoint)) {
      rows.push({
        key: 'STORAGE_ENDPOINT(r2)',
        status: 'FAIL',
        note: 'R2 icin STORAGE_ENDPOINT zorunlu ve tam URL olmali (https://<account>.r2.cloudflarestorage.com).',
      });
      hasFatal = true;
    } else {
      rows.push({
        key: 'STORAGE_ENDPOINT(r2)',
        status: 'OK',
        note: storageEndpoint,
      });
    }
    if (storageRegion && storageRegion.toLowerCase() !== 'auto') {
      rows.push({
        key: 'STORAGE_REGION(r2)',
        status: isProd ? 'FAIL' : 'WARN',
        note: 'R2 ile STORAGE_REGION=auto onerilir.',
      });
      if (isProd) hasFatal = true;
    }
  }

  print(rows);

  if (hasFatal) {
    console.error('FATAL: Environment validation failed.');
    process.exit(1);
  }
}

module.exports = validateEnv;
