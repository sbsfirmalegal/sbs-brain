// Edge Function: envía notificaciones push nativas Android vía FCM HTTP v1.
//
// Sirve DOS caminos de entrada:
//   1) Webhook de INSERT en public.notifications (mismo payload que send-push-brain).
//      Cuando llega una fila nueva, se dispara automáticamente el push nativo
//      al dueño de la notificación en todos sus dispositivos con FCM token.
//   2) Llamada manual (pruebas o cron). Enviar POST con:
//        { "recipient": "<uuid del user>", "title": "...", "body": "...",
//          "ruta": "/tareas", "kind": "manual" }
//
// Secretos que hay que configurar en Supabase → Edge Functions → Secrets:
//   FCM_PROJECT_ID   = id del proyecto Firebase (ej. "sbs-cronograma")
//   FCM_CLIENT_EMAIL = client_email del service account JSON
//   FCM_PRIVATE_KEY  = private_key del service account JSON (con -----BEGIN/END-----
//                       y los \n literales; Supabase lo acepta multilínea)
//   WEBHOOK_SECRET   = mismo valor que usa send-push-brain para auth (opcional)
//
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los inyecta Supabase.
//
// Idempotencia: si el body trae `dedupe_key`, se registra en push_sent_log y
// no se reenvía para el mismo (fecha UTC, kind, dedupe_key).

import { createClient } from "npm:@supabase/supabase-js@2";
import { SignJWT, importPKCS8 } from "npm:jose@5.9.6";

const FCM_PROJECT_ID = Deno.env.get("FCM_PROJECT_ID")!;
const FCM_CLIENT_EMAIL = Deno.env.get("FCM_CLIENT_EMAIL")!;
const FCM_PRIVATE_KEY_RAW = Deno.env.get("FCM_PRIVATE_KEY")!;
const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET");

// Los secretos multilínea de Supabase suelen llegar con \n literales
const FCM_PRIVATE_KEY = FCM_PRIVATE_KEY_RAW.replace(/\\n/g, "\n");

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// -------- OAuth2 access token cache (dura ~1h) --------
let cachedToken: { value: string; exp: number } | null = null;

async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp > now + 60) return cachedToken.value;

  const key = await importPKCS8(FCM_PRIVATE_KEY, "RS256");
  const jwt = await new SignJWT({
    scope: "https://www.googleapis.com/auth/firebase.messaging",
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(FCM_CLIENT_EMAIL)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key);

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) {
    throw new Error("no se pudo obtener access token de Google: " + (await res.text()));
  }
  const data = await res.json();
  cachedToken = { value: data.access_token, exp: now + (data.expires_in ?? 3600) };
  return cachedToken.value;
}

// -------- FCM send --------
interface FcmMessagePayload {
  title: string;
  body: string;
  ruta?: string;
  kind?: string;
}

async function sendToToken(accessToken: string, token: string, p: FcmMessagePayload) {
  const url = `https://fcm.googleapis.com/v1/projects/${FCM_PROJECT_ID}/messages:send`;
  const message = {
    message: {
      token,
      notification: { title: p.title, body: p.body },
      data: {
        // Todos los valores de `data` en FCM deben ser strings
        ruta: p.ruta ?? "/hoy",
        kind: p.kind ?? "generic",
      },
      android: {
        priority: "HIGH",
        notification: {
          channel_id: "default",
          click_action: "FLUTTER_NOTIFICATION_CLICK",
        },
      },
    },
  };
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
  });
  return { ok: res.ok, status: res.status, body: await res.text() };
}

// -------- Idempotencia opcional --------
async function alreadySent(kind: string, dedupeKey: string): Promise<boolean> {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("push_sent_log")
    .select("id")
    .eq("sent_date", today)
    .eq("kind", kind)
    .eq("dedupe_key", dedupeKey)
    .maybeSingle();
  return !!data;
}

async function markSent(kind: string, dedupeKey: string) {
  const today = new Date().toISOString().slice(0, 10);
  await supabase.from("push_sent_log").insert({
    sent_date: today,
    kind,
    dedupe_key: dedupeKey,
  });
}

// -------- Handler --------
interface NotificationRecord {
  id: string;
  recipient: string;
  title: string;
  body: string | null;
  link: string | null;
  kind: string;
}

interface DirectPayload {
  recipient: string;
  title: string;
  body?: string;
  ruta?: string;
  kind?: string;
  dedupe_key?: string;
}

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: NotificationRecord | null;
}

Deno.serve(async (req) => {
  if (WEBHOOK_SECRET) {
    const auth = req.headers.get("Authorization");
    if (auth?.replace("Bearer ", "").trim() !== WEBHOOK_SECRET) {
      return new Response("No autorizado", { status: 401 });
    }
  }

  try {
    const raw = await req.json();

    // Normalizar a un payload directo (recipient/title/body/ruta/kind/dedupe_key)
    let payload: DirectPayload;

    if ((raw as WebhookPayload).type && (raw as WebhookPayload).record) {
      const w = raw as WebhookPayload;
      if (w.type !== "INSERT" || !w.record) {
        return new Response("ignorado", { status: 200 });
      }
      const n = w.record;
      payload = {
        recipient: n.recipient,
        title: n.title,
        body: n.body ?? "",
        ruta: n.link ?? "/hoy",
        kind: n.kind,
        dedupe_key: n.id,
      };
    } else {
      payload = raw as DirectPayload;
    }

    if (!payload.recipient || !payload.title) {
      return new Response("faltan campos requeridos", { status: 400 });
    }

    // Idempotencia si trae dedupe_key
    if (payload.dedupe_key) {
      if (await alreadySent(payload.kind ?? "generic", payload.dedupe_key)) {
        return new Response(JSON.stringify({ skipped: "already_sent" }), { status: 200 });
      }
    }

    const { data: tokens, error } = await supabase
      .from("device_tokens")
      .select("token")
      .eq("user_id", payload.recipient)
      .eq("platform", "android");

    if (error) throw error;
    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: "no device_tokens" }), {
        status: 200,
      });
    }

    const accessToken = await getAccessToken();

    const results = await Promise.allSettled(
      tokens.map((t) =>
        sendToToken(accessToken, t.token, {
          title: payload.title,
          body: payload.body ?? "",
          ruta: payload.ruta,
          kind: payload.kind,
        })
      )
    );

    // Limpiar tokens invalidos (FCM 404 UNREGISTERED / 400 INVALID_ARGUMENT)
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status === "fulfilled" && !r.value.ok) {
        const s = r.value.status;
        const body = r.value.body;
        const dead =
          s === 404 ||
          body.includes("UNREGISTERED") ||
          body.includes("INVALID_ARGUMENT");
        if (dead) {
          await supabase.from("device_tokens").delete().eq("token", tokens[i].token);
        }
      }
    }

    const sent = results.filter(
      (r) => r.status === "fulfilled" && r.value.ok
    ).length;

    if (payload.dedupe_key && sent > 0) {
      await markSent(payload.kind ?? "generic", payload.dedupe_key);
    }

    return new Response(JSON.stringify({ sent, total: tokens.length }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-push-fcm error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
