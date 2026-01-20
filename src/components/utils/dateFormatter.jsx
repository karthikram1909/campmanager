import { parseISO, format, parse, isValid } from "date-fns";

/**
 * Centralized date formatting utility
 * Ensures all dates across the application display in DD/MMM/YYYY format
 */

/**
 * Parse a date string safely
 * @param {string} dateString - Date string in various formats
 * @returns {Date|null} - Parsed date or null if invalid
 */
export const parseDate = (dateString) => {
  if (!dateString || typeof dateString !== 'string') return null;
  
  try {
    // Try ISO format (YYYY-MM-DD)
    if (dateString.includes('-')) {
      const date = parseISO(dateString);
      if (isValid(date)) return date;
    }
    
    // Try dd/mm/yyyy format
    if (dateString.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const date = parse(dateString, 'dd/MM/yyyy', new Date());
      if (isValid(date)) return date;
    }
    
    // Try dd/mmm/yyyy format
    if (dateString.match(/^\d{2}\/[A-Za-z]{3}\/\d{4}$/)) {
      const date = parse(dateString, 'dd/MMM/yyyy', new Date());
      if (isValid(date)) return date;
    }
    
    return null;
  } catch (err) {
    return null;
  }
};

/**
 * Format date to DD/MMM/YYYY (e.g., 26/Dec/2025)
 * @param {string} dateString - Date string to format
 * @returns {string} - Formatted date or '-' if invalid
 */
export const formatDate = (dateString) => {
  if (!dateString) return '-';
  
  try {
    const date = parseDate(dateString);
    if (!date || !isValid(date)) {
      return dateString; // Return original if can't parse
    }
    
    return format(date, 'dd/MMM/yyyy');
  } catch (err) {
    console.error('Error formatting date:', dateString, err);
    return dateString || '-';
  }
};

/**
 * Format date and time to DD/MMM/YYYY HH:mm
 * @param {string} dateString - Date string
 * @param {string} timeString - Time string (HH:mm)
 * @returns {string} - Formatted date-time or '-'
 */
export const formatDateTime = (dateString, timeString) => {
  const formattedDate = formatDate(dateString);
  if (formattedDate === '-' || !timeString) return formattedDate;
  return `${formattedDate} ${timeString}`;
};