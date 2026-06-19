export const parseDate = (dateStr) => {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return dateStr;
  
  if (typeof dateStr === 'number') return new Date(dateStr);
  
  if (dateStr.includes('T')) {
    return new Date(dateStr);
  }
  
  // Convert 'YYYY-MM-DD HH:MM:SS.mmmmmm' to 'YYYY-MM-DDTHH:MM:SS.mmmmmmZ'
  const isoStr = dateStr.replace(' ', 'T') + 'Z';
  const d = new Date(isoStr);
  if (!isNaN(d.getTime())) return d;
  
  return new Date(dateStr);
};

export const formatDateString = (dateStr) => {
  try {
    const d = parseDate(dateStr);
    if (isNaN(d.getTime())) return dateStr || 'N/A';
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  } catch (e) {
    return dateStr || 'N/A';
  }
};

export const formatLocalDate = (dateStr) => {
  try {
    const d = parseDate(dateStr);
    if (isNaN(d.getTime())) return dateStr || 'N/A';
    return d.toLocaleString();
  } catch (e) {
    return dateStr || 'N/A';
  }
};

export const formatLocalTime = (dateStr) => {
  try {
    const d = parseDate(dateStr);
    if (isNaN(d.getTime())) return dateStr || 'N/A';
    return d.toLocaleTimeString();
  } catch (e) {
    return dateStr || 'N/A';
  }
};

export const formatShortDate = (dateStr) => {
  try {
    const d = parseDate(dateStr);
    if (isNaN(d.getTime())) return dateStr || 'N/A';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch (e) {
    return dateStr || 'N/A';
  }
};
