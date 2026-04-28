/**
 * One-time, idempotent migration: 13 main categories → 8 main categories.
 *
 * 1. Upsert the new 8-main tree (sets isMain:true, parentId:null on the 8 mains
 *    and isMain:false, parentId:<main.id> on each curated child).
 * 2. Demote the 5 obsolete main slugs to isMain:false. Their topics still resolve
 *    via /kategori/[slug] but they no longer appear in the homepage / picker.
 * 3. Re-parent specific orphan subcategories (e.g. frontend/backend used to live
 *    under "yazilim-gelistirme" — re-parent under "teknoloji").
 * 4. Sweep: any category whose slug is NOT in the new tree gets isMain:false.
 *    This guarantees the picker sees exactly the 8 curated mains.
 *
 * Safe to re-run. Never deletes a category — topic FKs remain valid throughout.
 *
 * Usage:
 *   cd server
 *   node scripts/migrate-categories-2026-04.js          # apply
 *   node scripts/migrate-categories-2026-04.js --dry    # preview only
 */

const { PrismaClient } = require('@prisma/client');
const { categoryTreeData } = require('../prisma/categoryTreeData');

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes('--dry') || process.argv.includes('--dry-run');

// Slugs whose category rows used to be main categories in the previous tree.
// Each one needs isMain:false so they leave the homepage picker.
const OBSOLETE_MAIN_SLUGS = [
  'bilim',
  'sanat-kultur',
  'saglik',
  'yazilim-gelistirme',
  'sunum-iletisim',
];

// Subcategories whose old parent is being demoted. Move them under the right new
// main so /kategori/[main]?sub= filters keep working.
// Map: child slug → new parent slug.
const REPARENT_MAP = {
  // Old parent: yazilim-gelistirme (now demoted) → Teknoloji & Yazılım
  frontend: 'teknoloji',
  backend: 'teknoloji',
  mobil: 'teknoloji',
  'test-ve-kalite': 'teknoloji',
  // Old parent: sunum-iletisim (demoted) → Tasarım & Sunum + Kişisel Gelişim
  'topluluk-onunde-konusma': 'tasarim',
  // hikaye-anlatimi & ikna-teknikleri are already in the new Kişisel Gelişim tree
  // so they will be re-parented automatically by Step 1.
};

function logChange(msg) {
  console.log(DRY_RUN ? `[dry-run] ${msg}` : `[apply] ${msg}`);
}

async function applyUpdate(where, data, label) {
  if (DRY_RUN) {
    logChange(`UPDATE category ${label}: ${JSON.stringify(data)}`);
    return null;
  }
  return prisma.category.update({ where, data });
}

async function applyCreate(data, label) {
  if (DRY_RUN) {
    logChange(`CREATE category ${label}: ${JSON.stringify(data)}`);
    return null;
  }
  return prisma.category.create({ data });
}

// Upsert that respects the global-unique constraint on Category.name.
async function upsertCategory({ name, slug, parentId, isMain, sortOrder }) {
  const [bySlug, byName] = await Promise.all([
    prisma.category.findUnique({ where: { slug } }),
    prisma.category.findUnique({ where: { name } }),
  ]);
  const target = byName || bySlug;

  if (target) {
    // Resolve slug conflict: if another row already owns the desired slug, keep
    // its slug stable to avoid breaking URLs and just update the metadata.
    const safeSlug =
      !bySlug || bySlug.id === target.id ? slug : target.slug;
    const update = {
      name,
      slug: safeSlug,
      parentId: parentId ?? null,
      isMain,
      isActive: true,
      sortOrder,
    };
    await applyUpdate({ id: target.id }, update, `id=${target.id} (${target.slug})`);
    return target.slug === safeSlug ? target : { ...target, slug: safeSlug };
  }

  const create = {
    name,
    slug,
    parentId: parentId ?? null,
    isMain,
    isActive: true,
    sortOrder,
  };
  await applyCreate(create, `slug=${slug}`);
  // In dry-run we won't have an id; subsequent steps that need the id will be
  // skipped silently. Real apply runs hit the DB so the next select works.
  return DRY_RUN ? null : prisma.category.findUnique({ where: { slug } });
}

async function main() {
  console.log(DRY_RUN ? '🔍 Dry-run mode (no DB writes)' : '🚀 Applying migration');
  console.log('');

  // ── Step 1: Upsert new 8-main tree ────────────────────────────────────────
  console.log('Step 1: Upsert 8-main tree');
  const allTreeSlugs = new Set();
  const mainBySlug = {};

  for (const main of categoryTreeData) {
    allTreeSlugs.add(main.slug);
    const mainRow = await upsertCategory({
      name: main.name,
      slug: main.slug,
      parentId: null,
      isMain: true,
      sortOrder: Number(main.sortOrder || 0),
    });
    if (mainRow) mainBySlug[main.slug] = mainRow;

    for (const child of main.children || []) {
      allTreeSlugs.add(child.slug);
      const parentId = mainRow ? mainRow.id : null;
      await upsertCategory({
        name: child.name,
        slug: child.slug,
        parentId,
        isMain: false,
        sortOrder: Number(child.sortOrder || 0),
      });
    }
  }
  console.log(`  → ${allTreeSlugs.size} curated slug processed`);
  console.log('');

  // ── Step 2: Demote obsolete main categories ───────────────────────────────
  console.log('Step 2: Demote obsolete main categories');
  for (const slug of OBSOLETE_MAIN_SLUGS) {
    const cat = await prisma.category.findUnique({ where: { slug } });
    if (!cat) {
      console.log(`  ⊘ ${slug} not found, skipping`);
      continue;
    }
    if (!cat.isMain && cat.parentId === null) {
      console.log(`  ✓ ${slug} already demoted, skipping`);
      continue;
    }
    await applyUpdate(
      { id: cat.id },
      { isMain: false, parentId: null, sortOrder: 999 },
      `${slug} (demote)`
    );
  }
  console.log('');

  // ── Step 3: Re-parent orphan subcategories ────────────────────────────────
  console.log('Step 3: Re-parent orphan subcategories');
  for (const [childSlug, newParentSlug] of Object.entries(REPARENT_MAP)) {
    const child = await prisma.category.findUnique({ where: { slug: childSlug } });
    const parent = mainBySlug[newParentSlug]
      || (await prisma.category.findUnique({ where: { slug: newParentSlug } }));
    if (!child) {
      console.log(`  ⊘ child ${childSlug} not found, skipping`);
      continue;
    }
    if (!parent) {
      console.log(`  ⊘ new parent ${newParentSlug} not found, skipping ${childSlug}`);
      continue;
    }
    if (child.parentId === parent.id) {
      console.log(`  ✓ ${childSlug} already under ${newParentSlug}, skipping`);
      continue;
    }
    await applyUpdate(
      { id: child.id },
      { parentId: parent.id, isMain: false, isActive: true },
      `${childSlug} → parent=${newParentSlug}`
    );
  }
  console.log('');

  // ── Step 4: Sweep — any non-tree category becomes non-main ────────────────
  console.log('Step 4: Sweep — anything not in the new tree → isMain:false');
  const allMains = await prisma.category.findMany({
    where: { isMain: true },
    select: { id: true, slug: true, name: true },
  });
  let sweepCount = 0;
  for (const m of allMains) {
    if (allTreeSlugs.has(m.slug)) continue;
    sweepCount += 1;
    await applyUpdate(
      { id: m.id },
      { isMain: false, sortOrder: 999 },
      `${m.slug} (sweep demote)`
    );
  }
  console.log(`  → ${sweepCount} additional main(s) demoted`);
  console.log('');

  // ── Summary ───────────────────────────────────────────────────────────────
  if (!DRY_RUN) {
    const finalMains = await prisma.category.count({ where: { isMain: true } });
    const totalCats = await prisma.category.count();
    console.log(`✅ Done. Mains now: ${finalMains}, total categories: ${totalCats}`);
  } else {
    console.log('✅ Dry-run complete. Re-run without --dry to apply.');
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
