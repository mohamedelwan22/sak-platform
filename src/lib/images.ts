import heroLand from "@/assets/hero-land.jpg";
import goldBars from "@/assets/gold-bars.jpg";
import landTurkey from "@/assets/land-turkey.jpg";
import landEgypt from "@/assets/land-egypt.jpg";
import landResort from "@/assets/land-resort.jpg";

export { heroLand, goldBars };

const map: Record<string, string> = {
  "land-turkey": landTurkey,
  "land-egypt": landEgypt,
  "land-resort": landResort,
};

export function landImage(key?: string | null): string {
  if (key && map[key]) return map[key];
  if (key && key.startsWith("http")) return key;
  return heroLand;
}
