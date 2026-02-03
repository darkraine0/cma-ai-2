/**
 * Migration: Set parentCommunityId on child communities.
 * Parent names match Community.name (exact or without " (City, ST)" suffix).
 */

import mongoose from 'mongoose';
import connectDB from '../../app/lib/mongodb';
import Community from '../../app/models/Community';

const PARENT_CHILD_MAP: { parentName: string; childNames: string[] }[] = [
  { parentName: 'Cambridge Crossing (Celina, TX)', childNames: ['Green Meadows', 'Hillside Village', 'Cross Creek Meadows', 'Ten Mile Creek'] },
  { parentName: 'Creekside Estates (Royse City, TX)', childNames: ['Creekshaw'] },
  { parentName: 'Edgewater (Fate, TX)', childNames: ['Avondale', 'Sonoma Verde', 'Monterra'] },
  { parentName: 'Milrany Ranch (Melissa, TX)', childNames: ['Liberty', 'Legacy Ranch', 'Meadow Run', 'Brookfield'] },
  { parentName: 'Reunion (Rhome, TX)', childNames: ['Bluestem', 'Wildflower Ranch', 'Springhill South', 'Treeline'] },
  { parentName: 'Walden Pond (Forney, TX)', childNames: ['Devonshire'] },
  { parentName: 'Lake Breeze (Lavon, TX)', childNames: ['Lakepointe', 'Grand Heritage'] },
  { parentName: 'Three Rivers', childNames: [] },
  { parentName: 'Maddox Landing (Hoschton, GA)', childNames: ['Twin Lakes', 'Liberty Park', 'Crossvine', 'Hellen Valley', 'Rosewood Lake Estates', 'Traditions of Braselton', 'Wehunt Meadows'] },
  { parentName: 'Echo Park (Suwanee, GA)', childNames: ['Millcroft', 'Park Ridge', 'Evanshire', 'Wards Crossing', 'Waterside', 'Skyview on Broad', 'Victoria Oaks'] },
  { parentName: 'Pickens Bluff (Hiram, GA)', childNames: ['Riverwood', 'Mt. Tabor Ridge', 'Creekside Landing', 'Laurel Farms', 'Sage Woods'] },
];

export async function up() {
  await connectDB();

  for (const { parentName, childNames } of PARENT_CHILD_MAP) {
    const parent =
      (await Community.findOne({ name: parentName })) ||
      (await Community.findOne({ name: parentName.replace(/\s*\([^)]*\)\s*$/, '').trim() }));
    if (!parent) {
      console.warn('Parent not found:', parentName);
      continue;
    }

    for (const childName of childNames) {
      const child = await Community.findOne({ name: childName });
      if (!child) {
        console.warn('Child not found:', childName);
        continue;
      }
      child.parentCommunityId = parent._id as mongoose.Types.ObjectId;
      await child.save();
    }
  }
}
