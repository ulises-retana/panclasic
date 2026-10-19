-- ============================================================================
-- Pan Clásico — sql/database.sql
-- Motor: MySQL 8 / MariaDB 10.5+ · Codificación: utf8mb4
--
-- Cómo usarlo
--   XAMPP : phpMyAdmin → pestaña "Importar" → seleccionar este archivo.
--   Aiven : borra las dos líneas del apartado 0 y ejecuta el resto dentro de la
--           base que te asigne Aiven (normalmente "defaultdb"). Esa misma base
--           va en la variable de entorno DB_NAME.
--
-- Se puede ejecutar varias veces: no borra datos ni duplica los de ejemplo.
--
-- Contenido
--   0. Base de datos
--   1. usuarios          cuentas de clientes y administradores
--   2. productos         catálogo
--   3. compras           cabecera de cada pedido
--   4. compras_detalle   productos de cada pedido
--   5. mensajes          formulario de contacto
--   6. Datos de ejemplo
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 0. BASE DE DATOS
-- ----------------------------------------------------------------------------
CREATE DATABASE IF NOT EXISTS panaderia
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE panaderia;


-- ----------------------------------------------------------------------------
-- 1. USUARIOS
-- Toda cuenta nueva nace como 'cliente'. Para crear el primer administrador:
--   1) regístrate desde la web;
--   2) ejecuta:  UPDATE usuarios SET rol = 'admin' WHERE email = 'tu@correo.com';
-- (después podrás cambiar roles desde la página Usuarios del panel).
-- password_hash guarda un hash de PHP (password_hash), nunca la contraseña.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
  id             INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  nombre         VARCHAR(100)  NOT NULL,
  email          VARCHAR(150)  NOT NULL,
  password_hash  VARCHAR(255)  NOT NULL,
  rol            ENUM('cliente', 'admin') NOT NULL DEFAULT 'cliente',
  creado_en      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_usuarios_email (email)
) ENGINE = InnoDB;


-- ----------------------------------------------------------------------------
-- 2. PRODUCTOS
-- Un producto no se borra: se desactiva (activo = 0) para no perder el
-- historial de las compras que ya lo incluyen.
-- stock es UNSIGNED: la base de datos rechaza cualquier descuento que lo
-- deje por debajo de cero.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS productos (
  id           INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  nombre       VARCHAR(100)  NOT NULL,
  descripcion  TEXT          NULL,
  precio       DECIMAL(8,2)  NOT NULL,
  unidad       VARCHAR(30)   NOT NULL DEFAULT 'pieza',
  categoria    VARCHAR(50)   NOT NULL DEFAULT 'Pan dulce',
  imagen       VARCHAR(255)  NULL,
  stock        INT UNSIGNED  NOT NULL DEFAULT 0,
  activo       TINYINT(1)    NOT NULL DEFAULT 1,
  creado_en    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_productos_activo_categoria (activo, categoria),
  CONSTRAINT ck_productos_precio CHECK (precio >= 0)
) ENGINE = InnoDB;


-- ----------------------------------------------------------------------------
-- 3. COMPRAS
-- usuario_id es opcional: vale NULL cuando compra alguien sin cuenta (o si la
-- cuenta se elimina después). Si no vas a usar historial por cliente, puedes
-- quitar esta columna y su clave foránea.
-- No se guarda ningún dato de tarjeta; metodo_pago solo registra la elección.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS compras (
  id              INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  usuario_id      INT UNSIGNED  NULL,
  nombre_cliente  VARCHAR(100)  NOT NULL,
  telefono        VARCHAR(20)   NULL,
  direccion       VARCHAR(255)  NOT NULL,
  metodo_pago     ENUM('efectivo', 'tarjeta') NOT NULL DEFAULT 'efectivo',
  total           DECIMAL(10,2) NOT NULL,
  creado_en       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_compras_creado_en (creado_en),
  CONSTRAINT fk_compras_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT ck_compras_total CHECK (total >= 0)
) ENGINE = InnoDB;


-- ----------------------------------------------------------------------------
-- 4. COMPRAS_DETALLE
-- Guarda el nombre y el precio del momento de la compra, así el historial no
-- cambia aunque después edites el producto.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS compras_detalle (
  id           INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  compra_id    INT UNSIGNED  NOT NULL,
  producto_id  INT UNSIGNED  NOT NULL,
  nombre       VARCHAR(100)  NOT NULL,
  precio       DECIMAL(8,2)  NOT NULL,
  cantidad     INT UNSIGNED  NOT NULL,

  PRIMARY KEY (id),
  UNIQUE KEY uq_detalle_compra_producto (compra_id, producto_id),
  KEY idx_detalle_producto (producto_id),
  CONSTRAINT fk_detalle_compra
    FOREIGN KEY (compra_id) REFERENCES compras (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_detalle_producto
    FOREIGN KEY (producto_id) REFERENCES productos (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT ck_detalle_cantidad CHECK (cantidad > 0)
) ENGINE = InnoDB;


-- ----------------------------------------------------------------------------
-- 5. MENSAJES (formulario de contacto)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mensajes (
  id         INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  nombre     VARCHAR(100)  NOT NULL,
  email      VARCHAR(150)  NOT NULL,
  mensaje    TEXT          NOT NULL,
  creado_en  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_mensajes_creado_en (creado_en)
) ENGINE = InnoDB;


-- ----------------------------------------------------------------------------
-- 6. DATOS DE EJEMPLO
-- Cada producto se inserta solo si no existe otro con el mismo nombre.
-- Las imágenes quedan vacías: se asignan desde el panel de administración.
-- ----------------------------------------------------------------------------
INSERT INTO productos (nombre, descripcion, precio, unidad, categoria, stock)
SELECT ejemplo.nombre, ejemplo.descripcion, ejemplo.precio, ejemplo.unidad, ejemplo.categoria, ejemplo.stock
FROM (
  SELECT 'Pan francés' AS nombre, 'Crujiente por fuera y suave por dentro.' AS descripcion, 0.20 AS precio, 'pieza' AS unidad, 'Pan salado' AS categoria, 150 AS stock
  UNION ALL
  SELECT 'Baguette', 'Barra larga de masa madre, corteza dorada.', 1.50, 'pieza', 'Pan salado', 25
  UNION ALL
  SELECT 'Pan de sándwich', 'Pan de molde suave, bolsa de 20 rebanadas.', 2.25, 'bolsa', 'Pan salado', 20
  UNION ALL
  SELECT 'Pan integral', 'Con harina integral y semillas.', 2.75, 'bolsa', 'Pan salado', 15
  UNION ALL
  SELECT 'Concha de vainilla', 'Pan dulce con cubierta de azúcar y vainilla.', 0.75, 'pieza', 'Pan dulce', 40
  UNION ALL
  SELECT 'Cuernito de mantequilla', 'Hojaldrado, ligero y dorado.', 0.60, 'pieza', 'Pan dulce', 50
  UNION ALL
  SELECT 'Empanada de piña', 'Rellena de dulce de piña.', 0.90, 'pieza', 'Pan dulce', 30
  UNION ALL
  SELECT 'Rosca de canela', 'Rosca suave con glaseado de canela.', 1.25, 'pieza', 'Pan dulce', 18
  UNION ALL
  SELECT 'Pastel de chocolate', 'Tres capas con ganache de cacao.', 14.00, 'pieza', 'Pasteles', 8
  UNION ALL
  SELECT 'Pastel tres leches', 'Bizcocho esponjoso bañado en tres leches.', 12.50, 'pieza', 'Pasteles', 6
  UNION ALL
  SELECT 'Galletas de avena', 'Bolsa de 6 galletas de avena y pasas.', 3.00, 'bolsa', 'Galletas', 35
) AS ejemplo
WHERE NOT EXISTS (
  SELECT 1 FROM productos AS existente WHERE existente.nombre = ejemplo.nombre
);
