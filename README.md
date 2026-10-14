# Recordatorios

## Estructura

```text
apps-script/
  Code.gs                 API de Google Apps Script
frontend/
  index.html              Página principal
  assets/                 Iconos e imágenes
  css/
    styles.css            Estilos
  js/
    app-config.js         Configuración y estado compartido
    whatsapp.js           Enlaces, mensajes y seguimiento de WhatsApp
    ui-controls.js        Utilidades, estados y controles de la interfaz
    reminders.js          Carga de datos y tablas de recordatorios
    clients.js            Filtros, tabla de clientes e inicialización
    components/
      theme-toggle.js     Control del tema visual
```

Para abrir la aplicación localmente, abre `frontend/index.html` en el navegador.
Si se publica en un hosting, configura `frontend/` como la carpeta pública del sitio.
