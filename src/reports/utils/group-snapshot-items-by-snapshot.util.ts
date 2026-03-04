import { SnapshotActivityItem } from '../entities/snapshot-activity-item.entity';

/**
 * Groups SnapshotActivityItem rows by parent snapshot pkid.
 * Requires item.snapshot relation to be loaded.
 */
export function groupSnapshotItemsBySnapshotPkid(
  items: SnapshotActivityItem[],
): Map<number, SnapshotActivityItem[]> {
  const grouped = new Map<number, SnapshotActivityItem[]>();

  for (const item of items) {
    const snapshotPkid = item.snapshot?.pkid;
    if (!Number.isInteger(snapshotPkid)) continue;

    const bucket = grouped.get(snapshotPkid) ?? [];
    bucket.push(item);
    grouped.set(snapshotPkid, bucket);
  }

  return grouped;
}
