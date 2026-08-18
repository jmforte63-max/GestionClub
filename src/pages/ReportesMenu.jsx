import '../styles/Reportes.css';

export default function ReportesMenu({ onNavigate }) {
  return (
    <div className="reportes-menu">
      <div className="reportes-menu-header">
        <span className="reportes-menu-kicker">Informes</span>
        <h1>Reportes</h1>
        <p>Selecciona el informe que quieres consultar.</p>
      </div>

      <div className="reportes-menu-grid">
        <button className="reporte-card reporte-card-iva" onClick={() => onNavigate('reporte-iva')}>
          <span className="reporte-card-icon">%</span>
          <span className="reporte-card-content">
            <strong>Cálculo de IVA</strong>
            <small>Consulta el IVA cobrado y pagado por periodo.</small>
          </span>
          <span className="reporte-card-arrow">→</span>
        </button>

        <button className="reporte-card reporte-card-balance" onClick={() => onNavigate('reporte-balance')}>
          <span className="reporte-card-icon">€</span>
          <span className="reporte-card-content">
            <strong>Balance financiero</strong>
            <small>Compara ingresos, gastos y saldo neto del periodo.</small>
          </span>
          <span className="reporte-card-arrow">→</span>
        </button>
      </div>
    </div>
  );
}
