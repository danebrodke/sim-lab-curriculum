export function getCurrentAcademicYearLabel(): string {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  // Academic year: July (6) through June (5)
  if (month >= 6) {
    return `${year}-${year + 1}`;
  }
  return `${year - 1}-${year}`;
}

export function getAcademicYearDates(label: string): { start: string; end: string } {
  const [startYear] = label.split('-').map(Number);
  return {
    start: `${startYear}-07-01`,
    end: `${startYear + 1}-06-30`,
  };
}

export function getAdjacentYearLabel(label: string, direction: 'prev' | 'next'): string {
  const [startYear, endYear] = label.split('-').map(Number);
  if (direction === 'next') {
    return `${startYear + 1}-${endYear + 1}`;
  }
  return `${startYear - 1}-${endYear - 1}`;
}
