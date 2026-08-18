export function normalizarEscudoUrl(valor) {
  const texto = String(valor ?? '').trim();

  if (!texto) {
    return '';
  }

  const url = /^https?:\/\//i.test(texto) ? texto : `https://${texto}`;

  try {
    const parsed = new URL(url);

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return '';
    }

    if (!parsed.hostname) {
      return '';
    }

    return parsed.toString();
  } catch {
    return '';
  }
}
