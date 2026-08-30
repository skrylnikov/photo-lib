export const moveItemById = <T extends { id: string }>(items: readonly T[], id: string, target: number): T[] => {
  const from = items.findIndex((item) => item.id === id);
  if (from < 0 || target < 0 || target >= items.length || from === target) return [...items];
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(target, 0, moved);
  return next;
};

export const filterMedia = <T extends { originalName: string; status: string }>(
  items: readonly T[],
  query: string,
  status: string,
): T[] => {
  const normalizedQuery = query.trim().toLocaleLowerCase('ru-RU');
  return items.filter((item) =>
    (status === 'all' || item.status === status)
    && item.originalName.toLocaleLowerCase('ru-RU').includes(normalizedQuery),
  );
};
