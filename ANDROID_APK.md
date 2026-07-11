# SBS Cronograma — APK Android + Notificaciones FCM

Guía completa para llevar la app de PWA a APK instalable con notificaciones push
nativas vía Firebase Cloud Messaging (FCM).

**Decisiones fijas:**
- `appId` = `com.cronograma.sbs` (permanente, no cambiar)
- Carga **remota**: el APK abre `https://sbs-brain.vercel.app` — cambios en la web se ven al instante sin recompilar
- Backend: Supabase (proyecto `tqkujsattjwejeotsqiz`)
- Envío automático: sí (Edge Function `send-push-fcm` + tabla de idempotencia)

---

## Archivos creados / modificados y por qué

| Archivo | Motivo |
|---|---|
| `.gitignore` | Bloquear keystores, `google-services.json`, artefactos de build |
| `capacitor.config.ts` | Config Capacitor: appId, remote URL, StatusBar/Splash/Push plugins |
| `package.json` | Scripts `cap:sync`, `cap:open`, `cap:assets` |
| `android/` | Proyecto Android generado por `npx cap add android` |
| `android/variables.gradle` | minSdk 23, targetSdk 35, compileSdk 35 |
| `android/app/src/main/AndroidManifest.xml` | Añade `POST_NOTIFICATIONS`, `usesCleartextTraffic=false` |
| `resources/*.png` | Íconos y splash fuente para `@capacitor/assets` |
| `gen-native-assets.mjs` | Script que genera los PNG fuente desde el logo SBS |
| `src/lib/native.ts` | Bootstrap nativo: StatusBar, push FCM, deep-link |
| `src/main.tsx` | Llama `initNative()` al arrancar |
| `src/App.tsx` | `NativeNavBridge` (deep-link) + re-registro FCM tras login |
| `src/components/Layout.tsx` | Safe-area padding en topbar (fix Android 15+) |
| `supabase/device_tokens_fcm.sql` | Tabla tokens FCM con RLS |
| `supabase/push_sent_log.sql` | Idempotencia de envíos |
| `supabase/functions/send-push-fcm/index.ts` | Edge Function que envía a FCM HTTP v1 |
| `supabase/cron_send_push_fcm.sql` | Cron diario opcional |

**Lo que NO se tocó (sigue funcionando):**
- `send-push-brain` (Web Push VAPID) → sigue enviando push a navegadores desktop / iOS
- `push_subscriptions` → no se toca
- Todo el resto del código web

---

## PASO 1 — Confirmar URL de producción

Abrir `capacitor.config.ts` y verificar que `PROD_URL` sea la URL exacta de Vercel.
Si el dominio actual es distinto (dominio custom, otro slug), cambiarlo y correr:

```powershell
cd "C:\Users\barre\OneDrive\Escritorio\Firma Legal S.B.S\sbs-brain"
npm run cap:sync
```

---

## PASO 2 — Crear el proyecto Firebase

1. Ir a https://console.firebase.google.com → **Add project** → nombre "SBS Cronograma"
2. Desactivar Google Analytics (no lo necesitas)
3. Una vez creado, click en el ícono de Android para agregar la app:
   - **Android package name**: `com.cronograma.sbs` (idéntico al `appId`)
   - **App nickname**: `SBS Cronograma`
   - **Debug signing certificate SHA-1**: dejar vacío por ahora
4. **Download `google-services.json`** → guardarlo en:
   ```
   sbs-brain\android\app\google-services.json
   ```
   Este archivo **está en `.gitignore`**, no se sube al repo.
5. Skip los pasos "Add Firebase SDK" y "Next steps" — Capacitor ya trae el plugin

### Habilitar la API HTTP v1 y crear la clave de servicio

1. En la Firebase Console, ir a **Project Settings** (ícono de engranaje) → pestaña **Service accounts**
2. Click **Generate new private key** → confirmar → se descarga un JSON tipo:
   ```
   sbs-cronograma-firebase-adminsdk-xxxxx.json
   ```
3. **Guardar ese archivo fuera del repo** (por ejemplo en `Documentos\SBS\firebase-sa.json`).
   No lo subas a Git ni lo pegues en el chat. De él vas a copiar 3 valores para Supabase.

---

## PASO 3 — Wire de Firebase en el proyecto Android

**No hay que editar ningún `.gradle` a mano.** Capacitor 6 ya generó todo el
wiring cuando se corrió `npx cap add android`:

- `android/build.gradle` línea 11 ya tiene el classpath de Google Services
- `android/app/build.gradle` líneas 47-54 ya tienen este bloque, que aplica el
  plugin de Google Services automáticamente **solo si detecta el archivo**:
  ```gradle
  try {
      def servicesJSON = file('google-services.json')
      if (servicesJSON.text) {
          apply plugin: 'com.google.gms.google-services'
      }
  } catch(Exception e) {
      logger.info("google-services.json not found, google-services plugin not applied. Push Notifications won't work")
  }
  ```
- La dependencia `firebase-messaging` tampoco hay que declararla: viene incluida
  dentro del propio plugin `@capacitor/push-notifications`
  (`node_modules/@capacitor/push-notifications/android/build.gradle`), que lee
  la versión desde `firebaseMessagingVersion` en `android/variables.gradle`
  (ya configurada en `24.0.3`).

Todo lo que falta es:

1. Copiar el `google-services.json` descargado en el Paso 2 a:
   ```
   sbs-brain\android\app\google-services.json
   ```
2. Correr:
   ```powershell
   npx cap sync android
   ```

Si el archivo no está presente el build igual compila (sin push nativo
funcional) — por eso instalar Capacitor no rompió nada mientras tanto.

---

## PASO 4 — Aplicar los SQL en Supabase

Ir al **SQL Editor** del proyecto `tqkujsattjwejeotsqiz` y correr en este orden:

1. `supabase\device_tokens_fcm.sql` (crea tabla + RLS)
2. `supabase\push_sent_log.sql` (idempotencia)

Verificar en **Table editor** que aparezcan `device_tokens` y `push_sent_log`.

---

## PASO 5 — Configurar la Edge Function

1. Desde el `sbs-brain/` correr:
   ```powershell
   npx supabase login
   npx supabase link --project-ref tqkujsattjwejeotsqiz
   npx supabase functions deploy send-push-fcm --no-verify-jwt
   ```
   (`--no-verify-jwt` porque validamos con `WEBHOOK_SECRET` propio)

2. Configurar secretos en **Supabase Dashboard → Edge Functions → send-push-fcm → Secrets**:
   - `FCM_PROJECT_ID` = valor de `project_id` del JSON de service account
   - `FCM_CLIENT_EMAIL` = valor de `client_email`
   - `FCM_PRIVATE_KEY` = valor de `private_key` (multi-línea, pegar TAL CUAL con
     los `-----BEGIN PRIVATE KEY-----` y saltos de línea)
   - `WEBHOOK_SECRET` = el mismo valor que ya usa `send-push-brain`

3. Conectar al webhook de notificaciones:
   - **Supabase → Database → Webhooks → Create a new hook**
   - Name: `send-push-fcm-notifications`
   - Table: `public.notifications`
   - Events: `Insert`
   - Type: `Supabase Edge Functions` → seleccionar `send-push-fcm`
   - HTTP Headers → `Authorization: Bearer <mismo WEBHOOK_SECRET>`

Ahora **cada notificación nueva** dispara push nativo Android automáticamente,
sin cron ni intervención.

### (Opcional) Cron diario para avisos programados

Solo si en el futuro quieres enviar recordatorios programados que **no pasen por
la tabla `notifications`** (ejemplo: "resumen matutino 7am"), correr
`supabase\cron_send_push_fcm.sql` reemplazando placeholders. Requiere crear una
segunda Edge Function `send-push-fcm-scan` que decida qué disparar — no incluida
en esta primera fase.

---

## PASO 6 — Generar el APK firmado

### 6.1 — Instalar Android Studio (una vez)

Si no lo tienes: https://developer.android.com/studio → aceptar defaults.

### 6.2 — Abrir el proyecto

```powershell
cd "C:\Users\barre\OneDrive\Escritorio\Firma Legal S.B.S\sbs-brain"
npm run cap:sync
npm run cap:open
```

Android Studio abre `android/`. Esperar que Gradle sincronice (barra abajo).

### 6.3 — Crear el keystore por primera vez

**Menu Build → Generate Signed Bundle / APK → APK → Next**

En "Key store path" → click **Create new...**:

- **Key store path**: guarda el archivo en `C:\Users\barre\Documentos\SBS\sbs-cronograma.jks` **(NUNCA en el repo — ya está en `.gitignore` por si acaso)**
- **Password**: elige uno fuerte y anótalo en tu gestor de contraseñas
- **Key alias**: `sbs-cronograma`
- **Key password**: puede ser el mismo que el del keystore
- **Validity (years)**: `25`
- **Certificate**: llenar tu nombre y "Firma Legal SBS"

⚠️ **Si pierdes este keystore no podrás publicar actualizaciones bajo la misma
identidad**. Haz un backup del `.jks` en un disco externo o en un gestor de secretos.

### 6.4 — Firmar y generar el APK

En la misma ventana, después de crear el keystore:
- Marca **Both** en signature versions (V1 + V2 + V3)
- Build variant: **release**
- Click **Create**

Al terminar Android Studio muestra "APK(s) generated successfully". El archivo
está en:
```
android\app\release\app-release.apk
```

---

## PASO 7 — Instalar el APK en el teléfono

1. Conectar el celular por USB → habilitar **Depuración USB** en Opciones de
   desarrollador (tocar 7 veces "Número de compilación" en Ajustes → Acerca del
   teléfono para desbloquear las opciones)
2. Copiar `app-release.apk` al teléfono (por WhatsApp Web, Drive, o USB)
3. En el celular, abrir el archivo → autorizar "Instalar apps de fuentes
   desconocidas" para el instalador
4. Instalar. Aparecerá **SBS Cronograma** en el launcher
5. Al primer inicio pedirá permiso de notificaciones (Android 13+). Aceptar.
6. Al hacer login se registra el token FCM automáticamente. Verificar en Supabase:
   ```sql
   select * from public.device_tokens where user_id = auth.uid();
   ```

---

## PASO 8 — Probar el circuito completo manualmente

### Prueba A — Desde Firebase Console (más rápido)

1. Firebase Console → **Messaging** → **Send your first message**
2. **Notification title**: "Prueba SBS"
3. **Notification text**: "Si ves esto, todo el circuito funciona"
4. **Send test message** → pegar el token FCM copiado de `device_tokens.token`
5. **Test** → el celular debe vibrar y mostrar la notificación

### Prueba B — Vía la Edge Function (prueba real de tu flujo)

```powershell
$TOKEN = "REEMPLAZAR_CON_WEBHOOK_SECRET"
$RECIPIENT = "REEMPLAZAR_CON_UUID_USUARIO"

curl -X POST "https://tqkujsattjwejeotsqiz.supabase.co/functions/v1/send-push-fcm" `
  -H "Authorization: Bearer $TOKEN" `
  -H "Content-Type: application/json" `
  -d "{`"recipient`":`"$RECIPIENT`",`"title`":`"Prueba FCM`",`"body`":`"Desde Edge Function`",`"ruta`":`"/tareas`",`"kind`":`"test`"}"
```

Respuesta esperada:
```json
{"sent":1,"total":1}
```

Al tocar la notificación en el celular, la app debe abrir en la ruta `/tareas`.

### Prueba C — Vía el webhook real (fin a fin)

Insertar una fila en `notifications` desde el SQL editor:
```sql
insert into public.notifications (recipient, title, body, link, kind)
values (auth.uid(), 'Prueba webhook', 'Vino del INSERT', '/agenda', 'test');
```
Debe llegar tanto la Web Push como la FCM al mismo tiempo.

---

## PASO 9 — Actualizar la app en el futuro

**Cambio SOLO web (95% de los casos):**
- Editar código, `git push origin main` → Vercel deploya → el APK ya lo ve.
- **NO recompilar APK**, **NO reinstalar en teléfono**. Los cambios aparecen al reabrir la app.

**Requiere recompilar APK:**
- Cambio de plugin de Capacitor (agregar/quitar) → `npx cap sync android` → generar APK nuevo
- Cambio de `AndroidManifest.xml`, íconos, splash, permisos, `variables.gradle`
- Cambio de `capacitor.config.ts` (`appId`, `server.url`, plugins)
- Cambio de versión (`versionCode` / `versionName` en `android/app/build.gradle`) para OTA de Play Store — no aplica ahora (uso personal)

---

## Checklist final de validación

- [ ] `capacitor.config.ts` tiene la URL correcta de Vercel en `PROD_URL`
- [ ] Proyecto Firebase creado con package name `com.cronograma.sbs`
- [ ] `google-services.json` en `android/app/` (y NO en el repo)
- [ ] `android/build.gradle` tiene el classpath de Google Services
- [ ] `android/app/build.gradle` tiene `apply plugin: 'com.google.gms.google-services'` y la dep de firebase-messaging
- [ ] SQL `device_tokens_fcm.sql` y `push_sent_log.sql` corridos en Supabase
- [ ] Edge Function `send-push-fcm` deployada
- [ ] Secretos `FCM_PROJECT_ID`, `FCM_CLIENT_EMAIL`, `FCM_PRIVATE_KEY`, `WEBHOOK_SECRET` configurados
- [ ] Webhook de `notifications` INSERT → `send-push-fcm` creado con header Authorization
- [ ] Keystore `sbs-cronograma.jks` respaldado fuera del repo
- [ ] APK firmado generado y instalado en un teléfono
- [ ] Al login aparece un registro nuevo en `device_tokens`
- [ ] Prueba B (curl) devuelve `{"sent":1}` y llega la notificación
- [ ] Al tocar la notificación abre en la ruta correcta (deep-link OK)
- [ ] La barra de estado del sistema NO tapa el buscador de la topbar (fix Android 15+)
- [ ] `npm run build` sigue compilando sin errores (web sigue viva)

---

## Notas de seguridad

- **Nunca** subir al repo: `google-services.json`, `.jks`/`.keystore`, `firebase-service-account*.json`
- **Nunca** pegar en un chat la `private_key` del service account ni la contraseña del keystore
- Los secretos van directo al panel de Supabase (Edge Functions → Secrets) o al panel de Firebase
- Si sospechas que el keystore o el service account fueron comprometidos: revocar la clave en Firebase Console y regenerar

---

## Bug conocido corregido proactivamente

**Android 15+ (API 35) edge-to-edge:** el sistema dibuja la status bar encima de
la topbar sticky de la app. Se corrigió con dos capas defensivas:
1. `StatusBar.setOverlaysWebView({ overlay: false })` en `src/lib/native.ts`
2. `padding-top: max(env(safe-area-inset-top), 1rem)` en el `<header>` de `Layout.tsx`
