export const deviceLabels = { ios: 'iOS', computer: '컴퓨터', android: 'Android', local: '로컬 폴더' };
const collator = new Intl.Collator('ko', { numeric: true, sensitivity: 'base' });

// Keep folders and files in separate groups for every key and direction.
export function sortFiles(entries, key = 'name', direction = 'asc') {
  return [...entries].sort((a, b) => {
    if ((a.type === 'folder') !== (b.type === 'folder')) return a.type === 'folder' ? -1 : 1;
    let difference = key === 'date'
      ? Date.parse(a.createdAt) - Date.parse(b.createdAt)
      : key === 'device'
        ? collator.compare(deviceLabels[a.device] || deviceLabels.local, deviceLabels[b.device] || deviceLabels.local)
        : collator.compare(a.name, b.name);
    if (!difference) difference = collator.compare(a.name, b.name);
    return direction === 'desc' ? -difference : difference;
  });
}
