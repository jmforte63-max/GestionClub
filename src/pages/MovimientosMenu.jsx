import '../styles/Reportes.css';

export default function MovimientosMenu({ onNavigate }) {
  return (
    <div className="reportes-menu">
      <div className="reportes-menu-header">
        <span className="reportes-menu-kicker">Finanzas</span>
        <h1>Movimientos</h1>
        <p>Selecciona el tipo de movimiento que quieres registrar.</p>
      </div>

      <div className="reportes-menu-grid">
        <button className="reporte-card reporte-card-ingreso" onClick={() => onNavigate('ingresos')}>
          <span className="reporte-card-icon">+</span>
          <span className="reporte-card-content">
            <strong>Ingreso</strong>
            <small>Registra entradas de dinero al club.</small>
          </span>
          <span className="reporte-card-arrow">→</span>
        </button>

        <button className="reporte-card reporte-card-gasto" onClick={() => onNavigate('egresos')}>
          <span className="reporte-card-icon">−</span>
          <span className="reporte-card-content">
            <strong>Gasto</strong>
            <small>Controla pagos y gastos del club.</small>
          </span>
          <span className="reporte-card-arrow">→</span>
        </button>

        <button className="reporte-card reporte-card-traspaso" onClick={() => onNavigate('traspasos')}>
          <span className="reporte-card-icon">⇄</span>
          <span className="reporte-card-content">
            <strong>Traspaso</strong>
            <small>Mueve dinero entre cuentas del club.</small>
          </span>
          <span className="reporte-card-arrow">→</span>
        </button>
      </div>
    </div>
  );
}
