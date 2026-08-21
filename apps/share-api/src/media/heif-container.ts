export const heifItemReferenceBudget = 256;

type IsoBox = {
  type: string;
  payloadStart: number;
  end: number;
};

export type HeifContainerInspection = {
  majorBrand: string;
  compatibleBrands: string[];
  itemCount: number;
  itemTypes: string[];
  references: Array<{ type: string; count: number }>;
  grid?: { columns: number; rows: number; width: number; height: number };
};

const fourCc = (value: Uint8Array, offset: number): string =>
  Buffer.from(value.buffer, value.byteOffset + offset, 4).toString('ascii');

const readBoxes = (value: Uint8Array, start: number, end: number): IsoBox[] => {
  const boxes: IsoBox[] = [];
  let offset = start;
  while (offset + 8 <= end) {
    let size = Buffer.from(value.buffer, value.byteOffset, value.byteLength).readUInt32BE(offset);
    const type = fourCc(value, offset + 4);
    let headerSize = 8;
    if (size === 1) {
      if (offset + 16 > end) throw new Error('invalid_heif_container');
      const extended = Buffer.from(value.buffer, value.byteOffset, value.byteLength).readBigUInt64BE(offset + 8);
      if (extended > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('invalid_heif_container');
      size = Number(extended);
      headerSize = 16;
    } else if (size === 0) {
      size = end - offset;
    }
    if (size < headerSize || offset + size > end) throw new Error('invalid_heif_container');
    boxes.push({ type, payloadStart: offset + headerSize, end: offset + size });
    offset += size;
  }
  if (offset !== end) throw new Error('invalid_heif_container');
  return boxes;
};

const parseItemInformation = (value: Uint8Array, box: IsoBox): { count: number; types: string[] } => {
  const data = Buffer.from(value.buffer, value.byteOffset, value.byteLength);
  const version = value[box.payloadStart];
  const countSize = version === 0 ? 2 : 4;
  const countOffset = box.payloadStart + 4;
  const count = countSize === 2 ? data.readUInt16BE(countOffset) : data.readUInt32BE(countOffset);
  const entries = readBoxes(value, countOffset + countSize, box.end);
  const types = entries.filter(({ type }) => type === 'infe').map((entry) => {
    const entryVersion = value[entry.payloadStart];
    const typeOffset = entry.payloadStart + (entryVersion === 2 ? 8 : 10);
    return entryVersion === 2 || entryVersion === 3 ? fourCc(value, typeOffset) : 'legacy';
  });
  return { count, types };
};

const parseReferences = (value: Uint8Array, box: IsoBox): Array<{ type: string; count: number }> => {
  const data = Buffer.from(value.buffer, value.byteOffset, value.byteLength);
  const version = value[box.payloadStart];
  const itemIdSize = version === 0 ? 2 : 4;
  return readBoxes(value, box.payloadStart + 4, box.end).map((reference) => ({
    type: reference.type,
    count: data.readUInt16BE(reference.payloadStart + itemIdSize),
  }));
};

const parseGrid = (value: Uint8Array, box: IsoBox): HeifContainerInspection['grid'] => {
  if (box.end - box.payloadStart < 8) return undefined;
  const data = Buffer.from(value.buffer, value.byteOffset, value.byteLength);
  const flags = value[box.payloadStart + 1] ?? 0;
  const longDimensions = (flags & 1) === 1;
  const dimensionOffset = box.payloadStart + 4;
  return {
    rows: (value[box.payloadStart + 2] ?? 0) + 1,
    columns: (value[box.payloadStart + 3] ?? 0) + 1,
    width: longDimensions ? data.readUInt32BE(dimensionOffset) : data.readUInt16BE(dimensionOffset),
    height: longDimensions ? data.readUInt32BE(dimensionOffset + 4) : data.readUInt16BE(dimensionOffset + 2),
  };
};

export const inspectHeifContainer = (value: Uint8Array): HeifContainerInspection => {
  const boxes = readBoxes(value, 0, value.byteLength);
  const fileType = boxes.find(({ type }) => type === 'ftyp');
  const metadata = boxes.find(({ type }) => type === 'meta');
  if (!fileType || !metadata || fileType.end - fileType.payloadStart < 8) {
    throw new Error('invalid_heif_container');
  }

  const brands: string[] = [];
  for (let offset = fileType.payloadStart + 8; offset + 4 <= fileType.end; offset += 4) {
    brands.push(fourCc(value, offset));
  }
  const children = readBoxes(value, metadata.payloadStart + 4, metadata.end);
  const itemInformation = children.find(({ type }) => type === 'iinf');
  const itemReferences = children.find(({ type }) => type === 'iref');
  const itemData = children.find(({ type }) => type === 'idat');
  const items = itemInformation ? parseItemInformation(value, itemInformation) : { count: 0, types: [] };

  return {
    majorBrand: fourCc(value, fileType.payloadStart),
    compatibleBrands: brands,
    itemCount: items.count,
    itemTypes: items.types,
    references: itemReferences ? parseReferences(value, itemReferences) : [],
    grid: itemData ? parseGrid(value, itemData) : undefined,
  };
};

export const exceedsHeifComplexityBudget = (inspection: HeifContainerInspection): boolean =>
  inspection.itemCount > heifItemReferenceBudget ||
  inspection.references.some(({ count }) => count > heifItemReferenceBudget);
