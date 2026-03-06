import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { TimelineEntry, ElectionData, Candidate } from '../types/election';

interface ElectionDB extends DBSchema {
  timeline: {
    key: number;
    value: TimelineEntry;
    indexes: { 'by-timestamp': Date };
  };
  snapshots: {
    key: string;
    value: {
      url: string;
      data: ElectionData;
      timestamp: Date;
    };
    indexes: { 'by-timestamp': Date };
  };
}

let db: IDBPDatabase<ElectionDB> | null = null;

async function getDB(): Promise<IDBPDatabase<ElectionDB>> {
  if (!db) {
    db = await openDB<ElectionDB>('eleicoes-timeline', 1, {
      upgrade(db) {
        const timelineStore = db.createObjectStore('timeline', {
          keyPath: 'timestamp',
          autoIncrement: true
        });
        timelineStore.createIndex('by-timestamp', 'timestamp');
        
        const snapshotStore = db.createObjectStore('snapshots', {
          keyPath: 'url'
        });
        snapshotStore.createIndex('by-timestamp', 'timestamp');
      }
    });
  }
  return db;
}

export async function saveSnapshot(url: string, data: ElectionData): Promise<void> {
  const database = await getDB();
  await database.put('snapshots', {
    url,
    data,
    timestamp: new Date()
  });
}

export async function getLatestSnapshot(url: string): Promise<ElectionData | null> {
  const database = await getDB();
  const snapshot = await database.get('snapshots', url);
  return snapshot?.data ?? null;
}

export async function saveTimelineEntry(entry: TimelineEntry): Promise<void> {
  const database = await getDB();
  await database.put('timeline', entry);
}

export async function getTimelineEntries(): Promise<TimelineEntry[]> {
  const database = await getDB();
  const entries = await database.getAllFromIndex('timeline', 'by-timestamp');
  return entries;
}

export async function saveEA20Snapshot(data: ElectionData): Promise<void> {
  const entry: TimelineEntry = {
    timestamp: new Date(),
    totalVotes: data.v,
    percentageTotalized: data.vp,
    candidates: data.carg[0]?.cand.map((c: Candidate) => ({
      candidateId: c.sqcand,
      name: c.nm,
      party: c.cc,
      votes: c.vap,
      percentage: c.pvap
    })) ?? []
  };
  
  await saveTimelineEntry(entry);
}

export async function getCachedTimeline(): Promise<TimelineEntry[]> {
  return getTimelineEntries();
}

export function processElectionDataForTimeline(data: ElectionData): TimelineEntry {
  return {
    timestamp: new Date(),
    totalVotes: data.v,
    percentageTotalized: data.vp,
    candidates: data.carg[0]?.cand.map((c: Candidate) => ({
      candidateId: c.sqcand,
      name: c.nm,
      party: c.cc,
      votes: c.vap,
      percentage: c.pvap
    })) ?? []
  };
}
