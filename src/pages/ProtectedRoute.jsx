import { useAuth } from '../hooks/useAuth';
import Login from './Login';

export default function ProtectedRoute({ children }) {
  const { estaAutenticado, cargando } = useAuth();

  if (cargando) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '1.2rem'
      }}>
        ⏳ Cargando...
      </div>
    );
  }

  if (!estaAutenticado()) {
    return <Login />;
  }

  return children;
}
