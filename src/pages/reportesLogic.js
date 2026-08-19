export const mesesDelAno = [
  { value: '01', label: 'Enero' },
  { value: '02', label: 'Febrero' },
  { value: '03', label: 'Marzo' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Mayo' },
  { value: '06', label: 'Junio' },
  { value: '07', label: 'Julio' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Septiembre' },
  { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' },
  { value: '12', label: 'Diciembre' },
];

export const obtenerMesesDeTemporada = (temporada = '') => {
  const match = String(temporada || '').match(/^(\d{4})\/(\d{2})$/);
  if (!match) {
    return mesesDelAno;
  }

  const anioInicio = Number(match[1]);
  const meses = [];

  for (let mes = 7; mes <= 12; mes += 1) {
    meses.push({ value: String(mes).padStart(2, '0'), label: mesesDelAno[mes - 1].label });
  }

  for (let mes = 1; mes <= 6; mes += 1) {
    meses.push({ value: String(mes).padStart(2, '0'), label: mesesDelAno[mes - 1].label });
  }

  return meses.map((mes) => ({
    ...mes,
    year: mes.value >= '07' ? anioInicio : anioInicio + 1,
  }));
};

export const getTrimestresDeTemporada = (temporada = '') => {
  const meses = obtenerMesesDeTemporada(temporada);

  return [
    { value: '01', label: `Q1 (${meses[0]?.label || 'Jul'}-${meses[2]?.label || 'Sep'})` },
    { value: '02', label: `Q2 (${meses[3]?.label || 'Oct'}-${meses[5]?.label || 'Dic'})` },
    { value: '03', label: `Q3 (${meses[6]?.label || 'Ene'}-${meses[8]?.label || 'Mar'})` },
    { value: '04', label: `Q4 (${meses[9]?.label || 'Abr'}-${meses[11]?.label || 'Jun'})` },
  ];
};

export const getMesesDeTrimestre = (trimestre, temporada = '') => {
  const map = {
    '01': ['07', '08', '09'],
    '02': ['10', '11', '12'],
    '03': ['01', '02', '03'],
    '04': ['04', '05', '06'],
  };

  if (temporada) {
    const mesesTemporada = obtenerMesesDeTemporada(temporada).map((mes) => mes.value);
    const trimestresTemporada = {
      '01': mesesTemporada.slice(0, 3),
      '02': mesesTemporada.slice(3, 6),
      '03': mesesTemporada.slice(6, 9),
      '04': mesesTemporada.slice(9, 12),
    };

    return trimestresTemporada[trimestre] || map[trimestre] || ['07', '08', '09'];
  }

  return map[trimestre] || ['07', '08', '09'];
};

export const getPeriodoActual = (trimestre, temporada = '') => getMesesDeTrimestre(trimestre, temporada);

export const obtenerTemporadasDisponibles = (temporadaActual = '') => {
  const fechaActual = new Date();
  const anioActual = fechaActual.getFullYear();
  const esDesdeJulio = fechaActual.getMonth() >= 6;
  const temporadaBase = esDesdeJulio ? anioActual : anioActual - 1;
  const temporadas = [
    `${temporadaBase - 1}/${String(temporadaBase).slice(-2)}`,
    `${temporadaBase}/${String(temporadaBase + 1).slice(-2)}`,
    `${temporadaBase + 1}/${String(temporadaBase + 2).slice(-2)}`
  ];

  return Array.from(new Set([temporadaActual, ...temporadas].filter(Boolean)));
};

export const obtenerTemporadaDesdeFecha = (fecha, selectedSeason = '') => {
  if (!fecha) {
    const ahora = new Date();
    const anioActual = ahora.getFullYear();
    return ahora.getMonth() >= 6 ? `${anioActual}/${String(anioActual + 1).slice(-2)}` : `${anioActual - 1}/${String(anioActual).slice(-2)}`;
  }

  const fechaObj = new Date(`${fecha}T00:00:00`);
  if (Number.isNaN(fechaObj.getTime())) {
    return selectedSeason || obtenerTemporadaDesdeFecha(new Date().toISOString().slice(0, 10));
  }

  const anio = fechaObj.getFullYear();
  return fechaObj.getMonth() >= 6 ? `${anio}/${String(anio + 1).slice(-2)}` : `${anio - 1}/${String(anio).slice(-2)}`;
};

export const calcularSaldoAcumuladoPorCuenta = (movimientos = []) => {
  const lista = Array.isArray(movimientos) ? movimientos : [];
  let saldoAcumulado = 0;

  return lista
    .slice()
    .sort((a, b) => new Date(a?.fecha || a?.fecha_creacion || 0) - new Date(b?.fecha || b?.fecha_creacion || 0))
    .map((movimiento) => {
      const valor = Number(movimiento?.total_con_iva ?? movimiento?.monto ?? 0);
      const esIngreso = movimiento?._tipo === 'ingreso';
      saldoAcumulado += esIngreso ? valor : -valor;
      return { ...movimiento, saldoAcumulado };
    });
};

export const calcularIvaMovimiento = (movimiento, ivaConcepto = 0) => {
  const monto = Number(movimiento?.monto ?? 0);
  const totalConIva = Number(movimiento?.total_con_iva ?? 0);
  const ivaPorcentaje = Number(movimiento?.iva ?? 0);

  if (Number.isFinite(totalConIva) && totalConIva > monto && Number.isFinite(monto)) {
    return Math.max(totalConIva - monto, 0);
  }

  if (Number.isFinite(ivaPorcentaje) && ivaPorcentaje > 0) {
    return monto * (ivaPorcentaje / 100);
  }

  if (Number.isFinite(Number(ivaConcepto)) && Number(ivaConcepto) > 0) {
    return monto * (Number(ivaConcepto) / 100);
  }

  return 0;
};
