/**
 * The width of a run of Urbanist text, from the font's own advance widths
 * (hmtx in assets/fonts, 2000 units per em), for printable ASCII.
 *
 * SVG text can't be measured before it is drawn, and a label that mixes two
 * sizes can't use a nested <TSpan> with a middle or end anchor (Phase A spike
 * report §3). Charts lay such labels out as separate texts from these widths.
 * Kerning is ignored; for the digits, `S$`, `k` and `%` the charts draw, that
 * is well under a point.
 */

const UNITS_PER_EM = 2000;

// Advance widths for U+0020 (space) through U+007E (~), in order.
const LIGHT = [
  480, 348, 511, 1504, 1176, 1254, 1415, 248, 628, 628, 702, 1160, 389, 880,
  349, 692, 1189, 514, 1083, 978, 1083, 1101, 1074, 1066, 1048, 1048, 349, 398,
  1160, 1160, 1160, 990, 1718, 1340, 1108, 1398, 1343, 1069, 958, 1496, 1248,
  427, 793, 1053, 998, 1757, 1262, 1500, 1039, 1551, 1103, 1090, 1259, 1322,
  1254, 1666, 1303, 1188, 1292, 526, 693, 527, 764, 1240, 719, 1198, 1198, 1019,
  1198, 1117, 660, 1169, 1066, 367, 436, 971, 387, 1777, 1066, 1120, 1198, 1198,
  708, 858, 687, 1026, 1011, 1616, 1049, 1019, 1014, 801, 407, 801, 1214,
];
const REGULAR = [
  480, 373, 530, 1521, 1184, 1317, 1419, 260, 660, 660, 708, 1160, 418, 880,
  374, 721, 1194, 550, 1098, 989, 1102, 1113, 1080, 1074, 1058, 1060, 374, 425,
  1160, 1160, 1160, 1019, 1747, 1369, 1124, 1398, 1343, 1076, 960, 1496, 1263,
  456, 816, 1082, 1010, 1785, 1281, 1500, 1056, 1556, 1130, 1098, 1259, 1331,
  1312, 1715, 1338, 1222, 1292, 554, 721, 555, 812, 1240, 796, 1208, 1208, 1019,
  1208, 1116, 677, 1183, 1078, 396, 448, 996, 416, 1777, 1078, 1120, 1208, 1208,
  723, 861, 694, 1038, 1049, 1638, 1084, 1050, 1014, 806, 436, 806, 1236,
];
// A character outside the table counts as a digit's width.
const FALLBACK = 1100;

export type TextWeight = 'light' | 'regular';

export function textWidth(
  text: string,
  fontSize: number,
  weight: TextWeight = 'regular',
): number {
  const table = weight === 'light' ? LIGHT : REGULAR;
  let units = 0;
  for (const ch of text) {
    units += table[ch.charCodeAt(0) - 32] ?? FALLBACK;
  }
  return (units / UNITS_PER_EM) * fontSize;
}
