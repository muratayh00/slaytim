# Sentry Kurulum ve Alert Eşikleri

## 1. Kurulum Adımları

### Client (Next.js)
```bash
cd client
npm install
# @sentry/nextjs paketi package.json'a eklendi — npm install ile yükler
```

### Server (Express)
```bash
cd server
npm install
# @sentry/node paketi package.json'a eklendi — npm install ile yükler
```

---

## 2. Ortam Değişkenleri

### client/.env.local
```
NEXT_PUBLIC_SENTRY_DSN=https://<key>@<org>.ingest.sentry.io/<project-id>
SENTRY_ORG=your-sentry-org-slug
SENTRY_PROJECT=slaytim-client
SENTRY_AUTH_TOKEN=sntrys_...   # Source map upload için (CI/CD ortamında)
```

### server/.env
```
SENTRY_DSN=https://<key>@<org>.ingest.sentry.io/<project-id>
```

---

## 3. Sentry Proje Oluşturma

1. https://sentry.io → Projects → New Project
2. Platform: **Next.js** (client) + **Node.js** (server için ayrı proje)
3. DSN bilgilerini yukarıdaki env değişkenlerine yapıştır.
4. Kaynak harita yüklemesi için `SENTRY_AUTH_TOKEN` oluştur:
   - Settings → Auth Tokens → Create New Token → scope: `project:releases`

---

## 4. Alert Eşikleri (Önerilen)

Sentry UI → Alerts → Create Alert Rule bölümünden aşağıdaki kurallar oluşturulmalıdır.

### 4.1 Kritik Hata Patlaması
| Alan | Değer |
|------|-------|
| **Trigger** | Error count |
| **Eşik** | > 50 hata / 5 dakika |
| **Ortam** | production |
| **Bildirim** | E-posta + Slack (anlık) |

### 4.2 Yükleme Hatası (Upload Failure)
| Alan | Değer |
|------|-------|
| **Trigger** | Issue alert — `transaction: POST /api/slides` |
| **Eşik** | > 10 hata / 10 dakika |
| **Filtre** | `level: error` |
| **Bildirim** | E-posta |

### 4.3 Kimlik Doğrulama Hatası Tırmanması
| Alan | Değer |
|------|-------|
| **Trigger** | Issue alert — `transaction: POST /api/auth/login` |
| **Eşik** | > 30 hata / 5 dakika |
| **Not** | Rate limiter zaten 20 istek/15 dk sınırı koyuyor; bu ek katman |
| **Bildirim** | E-posta (brute-force işareti) |

### 4.4 Performans — Yavaş Sayfa (P95)
| Alan | Değer |
|------|-------|
| **Trigger** | Transaction duration P95 |
| **Eşik** | > 3000 ms |
| **Kapsam** | Tüm sayfalar |
| **Bildirim** | E-posta (günlük özet) |

### 4.5 Arama/Feed Yavaşlama
| Alan | Değer |
|------|-------|
| **Trigger** | Transaction duration P75 |
| **Eşik** | > 800 ms |
| **Transaction** | `GET /api/topics` veya `GET /api/slides/popular` |
| **Bildirim** | E-posta |

---

## 5. Source Map Yapılandırması (CI/CD)

```yaml
# GitHub Actions örneği
- name: Upload Sentry Source Maps
  env:
    SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
    SENTRY_ORG: your-org
    SENTRY_PROJECT: slaytim-client
  run: |
    cd client
    npm run build
    # @sentry/nextjs otomatik olarak withSentryConfig içinden yükler
```

---

## 6. Mevcut Entegrasyon Durumu

| Dosya | Durum |
|-------|-------|
| `client/sentry.client.config.ts` | Oluşturuldu |
| `client/sentry.server.config.ts` | Oluşturuldu |
| `client/sentry.edge.config.ts` | Oluşturuldu |
| `client/instrumentation.ts` | Oluşturuldu |
| `client/next.config.js` | `withSentryConfig` sarmalandı |
| `client/package.json` | `@sentry/nextjs ^8` eklendi |
| `server/package.json` | `@sentry/node ^8` eklendi |
| `server/src/index.js` | Sentry init (production only) eklendi |

**Not:** Sentry yalnızca `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` env değişkeni mevcut olduğunda devreye girer. Değişken yoksa uygulama normal çalışmaya devam eder.
