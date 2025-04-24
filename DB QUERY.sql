--Crear la instancia con el nombre SEDA, posterior a ello ejecutar el query 

CREATE DATABASE Transmisiones2;
GO

USE Transmisiones2;

CREATE TABLE Clientes (
IDCliente INT IDENTITY(1,1) PRIMARY KEY NOT NULL,
Nombre NVARCHAR (50) NOT NULL,
Apellido NVARCHAR (50) NOT NULL,
Domicilio NVARCHAR (255) NOT NULL,
Correo NVARCHAR (50),
);

CREATE TABLE Telefono (
IDTel INT IDENTITY(1,1) PRIMARY KEY NOT NULL,
IDCliente INT NOT NULL,
Telefono NVARCHAR(20) NOT NULL,
Tipo VARCHAR (50),
CONSTRAINT FK_TelefonoCliente FOREIGN KEY (IDCliente) REFERENCES Clientes(IDCliente)
);

CREATE TABLE Vehiculos (
IDVehiculo INT IDENTITY(1,1) PRIMARY KEY NOT NULL,
IDCliente INT NOT NULL,
Placas NVARCHAR (50) NOT NULL,
Marca NVARCHAR (50) NOT NULL,
Linea_Vehiculo NVARCHAR(50) NOT NULL,
Modelo NVARCHAR(50) NOT NULL,
Color NVARCHAR(50),
Kilometraje INT NOT NULL,
Testigos NVARCHAR (50),
CONSTRAINT FK_VehiculosCliente FOREIGN KEY (IDCliente) REFERENCES Clientes(IDCliente)
);

CREATE TABLE Sucursales (
IDSucursal INT IDENTITY(1,1) PRIMARY KEY NOT NULL,
Nombre NVARCHAR (100) NOT NULL,
Direccion NVARCHAR (255) NOT NULL,
Telefono NVARCHAR(20) NOT NULL
);

CREATE TABLE Asesor (
IDAsesor INT IDENTITY(1,1) PRIMARY KEY NOT NULL,
Nombre VARCHAR(50) NOT NULL,
Apellido VARCHAR(50) NOT NULL,
IDSucursal INT NOT NULL,
CONSTRAINT FK_AsesorSucursales FOREIGN KEY (IDSucursal) REFERENCES Sucursales(IDSucursal)
);

CREATE TABLE EstatusPieza (
IDEstatus INT IDENTITY(1,1) PRIMARY KEY NOT NULL,
Estatus VARCHAR(50) NOT NULL
);

CREATE TABLE Piezas (
IDPieza INT IDENTITY(1,1) PRIMARY KEY NOT NULL,
Nombre_pieza NVARCHAR(100) NOT NULL,
SKU NVARCHAR(100),
Marca NVARCHAR(100),
Cantidad INT,
Costo_compra DECIMAL (18,2),
Precio_venta DECIMAL (18,2) NOT NULL,
IDEstatus INT,
Foto VARBINARY(MAX),
CONSTRAINT FK_PiezasEstatusPieza FOREIGN KEY (IDEstatus) REFERENCES EstatusPieza (IDEstatus)
);

CREATE TABLE Anaquel (
IDAnaquel INT IDENTITY(1,1) PRIMARY KEY NOT NULL,
Numero_anaquel INT NOT NULL,
Fila NVARCHAR (50),
Tarima NVARCHAR(50),
IDPieza INT,
CONSTRAINT FK_AnaquelPiezas FOREIGN KEY (IDPieza) REFERENCES Piezas (IDPieza)
);

CREATE TABLE EstatusCotizacion (
IDEstatus INT IDENTITY(1,1) PRIMARY KEY NOT NULL,
Estatus VARCHAR (50) NOT NULL
);

CREATE TABLE Cotizaciones(
IDCotizacion INT IDENTITY(1,1) PRIMARY KEY NOT NULL,
Folio NVARCHAR(100) NOT NULL,
Fecha DATETIME,
IDCliente INT NOT NULL,
IDVehiculo INT NOT NULL,
Falla NVARCHAR(255),
Precio_cotizacion DECIMAL (18,2),
IDEstatus INT,
CONSTRAINT FK_CotizacionesClientes FOREIGN KEY (IDCliente) REFERENCES Clientes (IDCliente),
CONSTRAINT FK_CotizacionesVehiculos FOREIGN KEY (IDVehiculo) REFERENCES Vehiculos (IDVehiculo),
CONSTRAINT FK_CotizacionesEstatusCotizacion FOREIGN KEY (IDEstatus) REFERENCES EstatusCotizacion (IDEstatus)
);

CREATE TABLE Entrega(
IDEntrega INT IDENTITY (1,1) PRIMARY KEY NOT NULL,
Fecha DATETIME
);

CREATE TABLE Ingresos(
IDIngreso INT IDENTITY (1,1) PRIMARY KEY NOT NULL,
Folio NVARCHAR(100) NOT NULL,
FechaIngreso DATETIME,
IDAsesor INT NOT NULL,
IDCliente INT NOT NULL,
IDVehiculo INT NOT NULL,
Diagnostico NVARCHAR(255),
Total DECIMAL (18,2),
IDEntrega INT,
Fotos VARBINARY(MAX),
IDCotizacion INT,
CONSTRAINT FK_IngresosAsesor FOREIGN KEY (IDAsesor) REFERENCES Asesor (IDAsesor),
CONSTRAINT FK_IngresosClientes FOREIGN KEY (IDCliente) REFERENCES Clientes (IDCliente),
CONSTRAINT FK_IngresosVehiculos FOREIGN KEY (IDVehiculo) REFERENCES Vehiculos (IDVehiculo),
CONSTRAINT FK_IngresosEntrega FOREIGN KEY (IDEntrega) REFERENCES Entrega (IDEntrega),
CONSTRAINT FK_IngresosCotizaciones FOREIGN KEY (IDCotizacion) REFERENCES Cotizaciones (IDCotizacion)
);

CREATE TABLE DetallePiezas(
IDDetallePieza INT IDENTITY (1,1) PRIMARY KEY NOT NULL,
IDCotizacion INT,
IDIngreso INT,
IDPieza INT,
Cantidad_Cotizada INT,
Cantidad_Usada INT,
Precio DECIMAL (18,2),
CONSTRAINT FK_DetallePiezasCotizaciones FOREIGN KEY (IDCotizacion) REFERENCES Cotizaciones (IDCotizacion),
CONSTRAINT FK_DetallePiezasIngresos FOREIGN KEY (IDIngreso) REFERENCES Ingresos (IDIngreso),
CONSTRAINT FK_DetallePiezasPiezas FOREIGN KEY (IDPieza) REFERENCES Piezas (IDPieza),
);

CREATE TABLE usuarios(
id INT PRIMARY KEY IDENTITY,
usuario VARCHAR(50),
password NVARCHAR(100),
rol VARCHAR(50),
creado_en DATE
);

INSERT INTO usuarios(usuario, password, rol)
VALUES ('sa', 'acceso', 'admin');

ALTER TABLE Cotizaciones ADD Mano_Obra DECIMAL(18,2) DEFAULT 0;
