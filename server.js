const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();
app.use(express.json());
app.use(cors());

// Configuración de conexión a PostgreSQL
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'gambling_soccer',
  password: 'killmepls0210',
  port: 5432,
});

// Ruta de registro de usuario
app.post('/register', async (req, res) => {
  const { nombres, apellidos, usuario, contraseña, fechaNacimiento, cedula, email } = req.body;

  if (!nombres || !apellidos || !usuario || !contraseña || !fechaNacimiento || !cedula || !email) {
    return res.status(400).json({ message: 'Por favor completa todos los campos' });
  }

  try {
    const hashedPassword = await bcrypt.hash(contraseña, 10);

    const query = `
      INSERT INTO users (nombres, apellidos, usuario, contraseña, cedula, email, fecha_nacimiento, saldo)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id;
    `;
    const values = [nombres, apellidos, usuario, hashedPassword, cedula, email, fechaNacimiento, 0];
    const result = await pool.query(query, values);

    res.status(201).json({ message: 'Registro exitoso', userId: result.rows[0].id });
  } catch (error) {
    console.error('Error al registrar el usuario:', error);
    res.status(500).json({ message: 'Error al registrar el usuario' });
  }
});

// Ruta de inicio de sesión
app.post('/login', async (req, res) => {
  const { usuario, contraseña } = req.body;

  if (!usuario || !contraseña) {
    return res.status(400).json({ message: 'Por favor completa todos los campos' });
  }

  try {
    const query = 'SELECT * FROM users WHERE usuario = $1';
    const result = await pool.query(query, [usuario]);

    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Usuario o contraseña incorrectos' });
    }

    const user = result.rows[0];
    const isPasswordValid = await bcrypt.compare(contraseña, user.contraseña);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Usuario o contraseña incorrectos' });
    }

    res.status(200).json({
      message: 'Inicio de sesión exitoso',
      usuario: {
        id: user.id,
        nombres: user.nombres,
        apellidos: user.apellidos,
        email: user.email,
        saldo: user.saldo,
      },
    });
  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    res.status(500).json({ message: 'Error al iniciar sesión' });
  }
});

// Ruta para recargar saldo
app.post('/recargar-saldo', async (req, res) => {
  const { userId, monto } = req.body;

  if (!userId || !monto || monto <= 0) {
    return res.status(400).json({ message: 'Datos inválidos para la recarga' });
  }

  try {
    const query = 'UPDATE users SET saldo = saldo + $1 WHERE id = $2 RETURNING saldo';
    const result = await pool.query(query, [monto, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.status(200).json({ message: 'Recarga exitosa', nuevoSaldo: result.rows[0].saldo });
  } catch (error) {
    console.error('Error al recargar saldo:', error);
    res.status(500).json({ message: 'Error al recargar saldo' });
  }
});

// Ruta para retirar saldo
app.post('/retirar-saldo', async (req, res) => {
  const { userId, monto } = req.body;

  if (!userId || !monto || monto <= 0) {
    return res.status(400).json({ message: 'Datos inválidos para el retiro' });
  }

  try {
    const query = 'UPDATE users SET saldo = saldo - $1 WHERE id = $2 RETURNING saldo';
    const result = await pool.query(query, [monto, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.status(200).json({ message: 'Retiro exitoso', nuevoSaldo: result.rows[0].saldo });
  } catch (error) {
    console.error('Error al retirar saldo:', error);
    res.status(500).json({ message: 'Error al retirar saldo' });
  }
});

// Iniciar el servidor
const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
