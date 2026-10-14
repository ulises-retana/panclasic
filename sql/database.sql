-- ============================================
-- Pan Clásico — Base de datos MySQL
-- Ejecutar en XAMPP (phpMyAdmin o terminal)
-- ============================================

-- Crear la base de datos si no existe
CREATE DATABASE IF NOT EXISTS panaderia
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE panaderia;

-- ============================================
-- 1. PRODUCTOS
-- ============================================
CREATE TABLE IF NOT EXISTS productos (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  nombre      VARCHAR(150)   NOT NULL,
  precio      DECIMAL(10,2)  NOT NULL,
  unidad      VARCHAR(50)    NOT NULL DEFAULT 'pieza',
  descripcion TEXT,
  imagen      VARCHAR(255)   DEFAULT NULL,        -- ruta relativa: img/productos/archivo.jpg
  stock       INT            NOT NULL DEFAULT 0,
  categoria   VARCHAR(100)   DEFAULT 'pan',
  activo      TINYINT(1)     NOT NULL DEFAULT 1,  -- 1 = visible, 0 = oculto
  created_at  TIMESTAMP      DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================
-- 2. COMPRAS (cabecera del pedido)
-- ============================================
CREATE TABLE IF NOT EXISTS compras (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  nombre_cliente  VARCHAR(150)  NOT NULL,
  telefono        VARCHAR(20),
  direccion       TEXT,
  metodo_pago     VARCHAR(50)   NOT NULL DEFAULT 'efectivo',  -- 'efectivo' o 'tarjeta'
  total           DECIMAL(10,2) NOT NULL,
  -- Campos de tarjeta (solo cuando metodo_pago = 'tarjeta')
  tarjeta_ultimos4  VARCHAR(4)   DEFAULT NULL,   -- últimos 4 dígitos (nunca el número completo)
  tarjeta_titular   VARCHAR(150) DEFAULT NULL,   -- nombre como aparece en la tarjeta
  tarjeta_vence     VARCHAR(5)   DEFAULT NULL,   -- formato MM/YY
  fecha             TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================
-- 3. COMPRAS_DETALLE (productos de cada pedido)
-- ============================================
CREATE TABLE IF NOT EXISTS compras_detalle (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  compra_id   INT            NOT NULL,
  producto_id INT            NOT NULL,
  nombre      VARCHAR(150)   NOT NULL,   -- snapshot del nombre al momento de la compra
  precio      DECIMAL(10,2)  NOT NULL,   -- snapshot del precio al momento de la compra
  cantidad    INT            NOT NULL DEFAULT 1,
  FOREIGN KEY (compra_id)   REFERENCES compras(id)   ON DELETE CASCADE,
  FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ============================================
-- 4. MENSAJES (formulario de contacto)
-- ============================================
CREATE TABLE IF NOT EXISTS mensajes (
  id       INT AUTO_INCREMENT PRIMARY KEY,
  nombre   VARCHAR(150) NOT NULL,
  email    VARCHAR(200) NOT NULL,
  mensaje  TEXT         NOT NULL,
  fecha    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================
-- 5. ADMINS
-- ============================================
CREATE TABLE IF NOT EXISTS admins (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  usuario        VARCHAR(100) NOT NULL UNIQUE,
  password_hash  VARCHAR(255) NOT NULL
) ENGINE=InnoDB;

-- ============================================
-- DATOS INICIALES
-- ============================================

-- Admin por defecto
-- Usuario: admin | Contraseña: admin123
-- Hash generado con: password_hash('admin123', PASSWORD_BCRYPT)
INSERT INTO admins (usuario, password_hash) VALUES
  ('admin', '$2y$10$HfzIhGCCaxqducalMe50fukvr7xDHbeTOhSIZSIigK1cmC7.2jVKi');

-- Productos de ejemplo para probar el catálogo
INSERT INTO productos (nombre, precio, unidad, descripcion, imagen, stock, categoria) VALUES
  ('Pan Francés',       8.00,  'pieza', 'Pan crujiente por fuera y suave por dentro, ideal para acompañar tus comidas.',   NULL, 100, 'pan blanco'),
  ('Concha de Vainilla', 12.00, 'pieza', 'Pan dulce clásico mexicano con cubierta de vainilla.',                            NULL, 80,  'pan dulce'),
  ('Concha de Chocolate',12.00, 'pieza', 'Pan dulce clásico mexicano con cubierta de chocolate.',                            NULL, 80,  'pan dulce'),
  ('Cuerno',            15.00, 'pieza', 'Croissant hojaldrado con mantequilla, perfecto para el desayuno.',                 NULL, 60,  'pan dulce'),
  ('Bolillo',            5.00,  'pieza', 'El pan más popular de México, crujiente y esponjoso.',                             NULL, 150, 'pan blanco'),
  ('Polvorón',          10.00, 'pieza', 'Galleta de mantequilla que se deshace en la boca.',                                NULL, 70,  'galletas'),
  ('Oreja',             14.00, 'pieza', 'Pan hojaldrado en forma de oreja con un toque de azúcar.',                         NULL, 50,  'pan dulce'),
  ('Rosca de Canela',   18.00, 'pieza', 'Rosca suave con un glaseado de canela.',                                           NULL, 40,  'pan dulce'),
  ('Baguette',          25.00, 'pieza', 'Pan largo estilo francés, perfecto para sándwiches y para acompañar sopas.',       NULL, 45,  'pan blanco'),
  ('Empanada de Piña',  13.00, 'pieza', 'Pan relleno de mermelada de piña con masa suave.',                                 NULL, 55,  'pan relleno');
