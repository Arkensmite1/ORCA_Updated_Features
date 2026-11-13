import { openDB } from "idb";

// v2: drops tiles cached from OpenStreetMap (bulk download is against its usage policy).
const dbPromise = openDB("orca-offline", 2, {
  upgrade(db, oldVersion, _newVersion, tx) {
    if (oldVersion < 1) {
      db.createObjectStore("tiles");
      db.createObjectStore("kv");
      db.createObjectStore("sos", { keyPath: "emergency_id" });
    }
    if (oldVersion === 1) {
      tx.objectStore("tiles").clear();
      tx.objectStore("kv").delete("kit");
    }
  },
});

export const kvGet = async (key) => (await dbPromise).get("kv", key);
export const kvSet = async (key, value) => (await dbPromise).put("kv", value, key);

export const tileGet = async (key) => (await dbPromise).get("tiles", key);
export const tilePut = async (key, blob) => (await dbPromise).put("tiles", blob, key);
export const tileKeys = async () => (await dbPromise).getAllKeys("tiles");
export const tileCount = async () => (await dbPromise).count("tiles");

export const sosAll = async () => {
  const items = await (await dbPromise).getAll("sos");
  return items.sort((a, b) => b.captured_at.localeCompare(a.captured_at));
};
export const sosPut = async (item) => (await dbPromise).put("sos", item);
