import type { VendorContact } from '@/types/database';

export function parseVendorContacts(raw: string): VendorContact[] {
  if (!raw || raw.trim() === '') return [];

  // Split on "/" for multiple contacts
  const contactStrings = raw.split('/').map(s => s.trim()).filter(Boolean);
  return contactStrings.map(parseOneContact);
}

function parseOneContact(raw: string): VendorContact {
  // Normalize "at" keyword: "Josh Marsile at Polynovo" -> "Josh Marsile, Polynovo"
  const normalized = raw.replace(/\s+at\s+/gi, ', ');
  const parts = normalized.split(',').map(s => s.trim());

  // Find the email part
  const emailIndex = parts.findIndex(p => p.includes('@'));
  const email = emailIndex >= 0 ? parts[emailIndex] : null;

  // First part is always the name
  const name = parts[0] || '';

  // Middle parts (between name and email) are company
  let company: string | null = null;
  if (parts.length >= 3 && emailIndex >= 0) {
    const companyParts = parts.slice(1, emailIndex);
    company = companyParts.join(', ') || null;
  }

  return { name, email, company };
}

// Extract contacts embedded in vendor column (e.g., "Acera/Restrata Travis Bass: BassT@acera-surgical.com")
export function extractContactFromVendor(vendor: string): { cleanVendor: string; contact: VendorContact | null } {
  const emailMatch = vendor.match(/([^,/:]+?)\s*[:]\s*(\S+@\S+)/);
  if (emailMatch) {
    const contactName = emailMatch[1].trim();
    const contactEmail = emailMatch[2].trim();
    const cleanVendor = vendor.substring(0, vendor.indexOf(contactName)).replace(/[,/]\s*$/, '').trim();
    return {
      cleanVendor: cleanVendor || vendor.split(/\s+/)[0],
      contact: { name: contactName, email: contactEmail, company: null },
    };
  }
  return { cleanVendor: vendor, contact: null };
}
