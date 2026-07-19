// One-time backfill: convert legacy free-text Child.schoolName values into
// real School rows, linking each child via schoolId. Safe to re-run:
// children already linked (schoolId set) are skipped, and schools are
// looked up by canonical name (case-insensitive trim) so re-runs don't
// create duplicates.
//
// Run: `npx ts-node prisma/backfill-schools.ts`

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const candidates = await prisma.child.findMany({
    where: {
      schoolId: null,
      schoolName: { not: null },
    },
    select: { id: true, schoolName: true },
  });

  console.log(`Found ${candidates.length} children with legacy schoolName and no schoolId.`);
  if (candidates.length === 0) return;

  // Group by canonical name so we create one School per distinct name and
  // link every child sharing that name to it.
  const groups = new Map<string, string[]>();
  for (const c of candidates) {
    const key = (c.schoolName ?? '').trim();
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c.id);
  }

  for (const [name, childIds] of groups) {
    // Case-insensitive lookup for pre-existing schools with the same name.
    const existing = await prisma.school.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
      select: { id: true, name: true },
    });
    const school =
      existing ??
      (await prisma.school.create({
        data: { name },
        select: { id: true, name: true },
      }));

    await prisma.child.updateMany({
      where: { id: { in: childIds } },
      data: { schoolId: school.id },
    });

    console.log(
      `  ${existing ? '↻ reused' : '＋ created'} "${school.name}" → linked ${childIds.length} child(ren)`,
    );
  }

  console.log('Done.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
