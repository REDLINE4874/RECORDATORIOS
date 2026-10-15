# Recordatorios

## Estructura

```text
RECORDATORIOS/
├── apps-script/
│   └── Code.gs                         API de Google Apps Script
└── frontend/
    ├── index.html                      Página principal
    ├── assets/
    │   └── icon/                       Iconos de la aplicación
    ├── css/                            Estilos divididos por responsabilidad
    │   ├── base.css                    Variables, estilos globales y tema
    │   ├── navigation.css              Barra de navegación y pestañas
    │   ├── layout.css                  Vistas, paneles y estructura general
    │   ├── tables.css                  Tablas y tablas de clientes
    │   ├── controls.css                Selectores y controles de estado
    │   ├── clients.css                 Filtros, seguimiento y detalle de clientes
    │   ├── feedback.css                Notificaciones, diálogos y avisos
    │   └── responsive.css              Ajustes para pantallas pequeñas
    └── js/
        ├── app-config.js               Configuración y estado compartido
        ├── whatsapp.js                 Enlaces, mensajes y seguimiento de WhatsApp
        ├── ui-controls.js               Utilidades y controles de la interfaz
        ├── reminders.js                Carga de datos y tablas de recordatorios
        ├── clients.js                  Filtros, tabla de clientes e inicialización
        └── components/
            └── theme-toggle.js         Control del tema visual
```

Para abrir la aplicación localmente, abre `frontend/index.html` en el navegador.
Si se publica en un hosting, configura `frontend/` como la carpeta pública del sitio.
