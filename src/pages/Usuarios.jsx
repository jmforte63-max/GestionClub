import { useState } from 'react';

const initialUsers = [
  { id: 1, nombre: 'Administrador', email: 'admin@club.com', rol: 'admin' },
  { id: 2, nombre: 'Juan Torres', email: 'juan@club.com', rol: 'director' },
  { id: 3, nombre: 'María López', email: 'maria@club.com', rol: 'editor' },
];

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState(initialUsers);
  const [form, setForm] = useState({ nombre: '', email: '', rol: 'editor' });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const addUser = () => {
    if (!form.nombre || !form.email) return;

    setUsuarios((prev) => [
      ...prev,
      {
        id: Date.now(),
        nombre: form.nombre,
        email: form.email,
        rol: form.rol,
      },
    ]);

    setForm({ nombre: '', email: '', rol: 'editor' });
  };

  const removeUser = (id) => {
    const confirmado = window.confirm('¿Seguro que quieres eliminar este usuario?');
    if (!confirmado) return;

    setUsuarios((prev) => prev.filter((user) => user.id !== id));
  };

  return (
    <>
      <section className="card section-card">
        <div className="section-header">
          <h2>Crear usuario</h2>
        </div>

        <div className="form-grid">
          <div className="field-group">
            <label>Nombre</label>
            <input type="text" name="nombre" value={form.nombre} onChange={handleChange} placeholder="Ana García" />
          </div>
          <div className="field-group">
            <label>Email</label>
            <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="ana@club.com" />
          </div>
          <div className="field-group">
            <label>Rol</label>
            <select name="rol" value={form.rol} onChange={handleChange}>
              <option value="admin">Administrador</option>
              <option value="director">Director</option>
              <option value="editor">Editor</option>
            </select>
          </div>
          <div className="field-group">
            <button className="primary-button" onClick={addUser}>Guardar usuario</button>
          </div>
        </div>
      </section>

      <section className="card section-card">
        <div className="section-header">
          <h2>Usuarios del sistema</h2>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((user) => (
                <tr key={user.id}>
                  <td>{user.nombre}</td>
                  <td>{user.email}</td>
                  <td><span className={`badge ${user.rol}`}>{user.rol}</span></td>
                  <td>
                    <button className="delete-button" onClick={() => removeUser(user.id)}>Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
