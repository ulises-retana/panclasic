CREATE DATABASE IF NOT EXISTS panaderia
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE panaderia;

CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  email VARCHAR(200) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  rol ENUM('cliente', 'admin') NOT NULL DEFAULT 'cliente',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS productos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  precio DECIMAL(10,2) NOT NULL,
  unidad VARCHAR(50) NOT NULL DEFAULT 'pieza',
  descripcion TEXT,
  imagen VARCHAR(255) DEFAULT NULL,
  stock INT NOT NULL DEFAULT 0,
  categoria VARCHAR(100) DEFAULT 'pan',
  activo TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS compras (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre_cliente VARCHAR(150) NOT NULL,
  telefono VARCHAR(20) DEFAULT NULL,
  direccion VARCHAR(500) NOT NULL,
  metodo_pago VARCHAR(50) NOT NULL DEFAULT 'efectivo',
  total DECIMAL(10,2) NOT NULL,
  fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS compras_detalle (
  id INT AUTO_INCREMENT PRIMARY KEY,
  compra_id INT NOT NULL,
  producto_id INT NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  precio DECIMAL(10,2) NOT NULL,
  cantidad INT NOT NULL DEFAULT 1,
  CONSTRAINT fk_compra_detalle_compra FOREIGN KEY (compra_id) REFERENCES compras(id) ON DELETE CASCADE,
  CONSTRAINT fk_compra_detalle_producto FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS mensajes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  email VARCHAR(200) NOT NULL,
  mensaje TEXT NOT NULL,
  fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO productos (nombre, precio, unidad, descripcion, stock, categoria)
SELECT datos.nombre, datos.precio, 'pieza', datos.descripcion, datos.stock, datos.categoria
FROM (
  SELECT 'Pan Francés' AS nombre, 8.00 AS precio, 'Pan crujiente por fuera y suave por dentro.' AS descripcion, 100 AS stock, 'pan blanco' AS categoria
  UNION ALL SELECT 'Concha de Vainilla', 12.00, 'Pan dulce clásico con cubierta de vainilla.', 80, 'pan dulce'
  UNION ALL SELECT 'Concha de Chocolate', 12.00, 'Pan dulce clásico con cubierta de chocolate.', 80, 'pan dulce'
  UNION ALL SELECT 'Cuerno', 15.00, 'Pan hojaldrado con mantequilla.', 60, 'pan dulce'
  UNION ALL SELECT 'Bolillo', 5.00, 'Pan crujiente y esponjoso.', 150, 'pan blanco'
  UNION ALL SELECT 'Polvorón', 10.00, 'Galleta de mantequilla.', 70, 'galletas'
  UNION ALL SELECT 'Oreja', 14.00, 'Pan hojaldrado con azúcar.', 50, 'pan dulce'
  UNION ALL SELECT 'Rosca de Canela', 18.00, 'Rosca suave con glaseado de canela.', 40, 'pan dulce'
  UNION ALL SELECT 'Baguette', 25.00, 'Pan estilo francés.', 45, 'pan blanco'
  UNION ALL SELECT 'Empanada de Piña', 13.00, 'Pan relleno de mermelada de piña.', 55, 'pan relleno'
) AS datos
WHERE NOT EXISTS (
  SELECT 1 FROM productos AS existentes WHERE existentes.nombre = datos.nombre
);

-- Para dar permisos de administrador a una cuenta ya registrada:
-- UPDATE usuarios SET rol = 'admin' WHERE email = 'tu-correo@example.com';
