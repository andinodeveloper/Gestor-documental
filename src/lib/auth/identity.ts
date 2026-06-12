export function normalizeDui(value: string) {
  return value.replace(/[^0-9k]/gi, "").toLowerCase();
}

export function expandDuiCandidates(value: string) {
  const normalized = normalizeDui(value);

  if (!normalized) {
    return [];
  }

  if (normalized.length !== 9) {
    return [normalized];
  }

  return [normalized, `${normalized.slice(0, 8)}-${normalized.slice(8)}`];
}

export function maskEmail(email: string) {
  const [user, domain] = email.split("@");

  if (!user || !domain) {
    return email;
  }

  const visibleUser = user.length <= 2 ? user : `${user.slice(0, 2)}***`;
  return `${visibleUser}@${domain}`;
}
