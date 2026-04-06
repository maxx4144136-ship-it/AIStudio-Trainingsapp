# 🚀 Deployment Workflow & Troubleshooting Guide (React SPA + PHP JSON Storage)

Dieses Dokument beschreibt den exakten Workflow, um eine React-App mit einfacher PHP-Datenhaltung auf einem VPS (Nginx) zu deployen. Es basiert auf den Erkenntnissen aus dem "FitnessMaxx"-Projekt und dient als Vorlage für zukünftige Apps.

---

## 1. Architektur-Überblick

*   **Frontend:** React (Vite) Single Page Application (SPA).
*   **Backend:** Ein einziges PHP-Skript (`api.php`), das JSON-Daten empfängt und speichert.
*   **Datenbank:** Eine einfache JSON-Datei (`data.json`) im selben Ordner.
*   **Server:** VPS mit Nginx und PHP-FPM.

---

## 2. Vorbereitung der App (Frontend)

Bevor der Build erstellt wird, müssen folgende Punkte im Code sichergestellt sein:

### A. Hardcoded API URL
In der Hauptdatei (`App.tsx`) muss die volle URL zur API hinterlegt sein. Relative Pfade funktionieren oft nicht zuverlässig bei SPAs.

```typescript
// App.tsx
const API_URL = "https://deine-domain.tech/api.php";
```

### B. Robustes Error-Handling
Die `saveToHostinger` (oder ähnliche) Funktion muss HTTP-Statuscodes auswerten und zurückgeben, damit wir Fehler unterscheiden können.

*   **404:** Datei nicht gefunden (Falsche URL).
*   **405:** Methode nicht erlaubt (PHP nicht aktiv/konfiguriert).
*   **500:** Server-Fehler (Meistens fehlende Schreibrechte).

### C. Auto-Sync & Background Saving
Speichern sollte nicht blockieren. Implementiere eine Funktion, die bei jeder Änderung im Hintergrund speichert (`saveData` Wrapper).

---

## 3. Das Backend-Skript (`api.php`)

Die `api.php` muss im `public/` Ordner der App liegen (damit sie im `dist/` landet) und folgende Features haben:

1.  **CORS-Header:** Damit die App von überall zugreifen darf (optional, aber gut für Tests).
2.  **Cache-Control:** Zwingend notwendig, damit Browser nicht alte Daten anzeigen.
3.  **Fehler-Prüfung:** `file_put_contents` muss geprüft werden. Wenn es fehlschlägt, muss ein **HTTP 500** gesendet werden.

**Muster-Code `api.php`:**

```php
<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");
// WICHTIG: Cache deaktivieren!
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");

$file = 'data.json';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = file_get_contents('php://input');
    // Versuch zu speichern
    $result = file_put_contents($file, $data);
    
    if ($result === false) {
        // WICHTIG: Echten Fehler zurückgeben für Debugging
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => "Write permission denied"]);
    } else {
        echo json_encode(["status" => "success"]);
    }
} else {
    // Lesen (GET)
    if (file_exists($file)) {
        echo file_get_contents($file);
    } else {
        echo "null";
    }
}
?>
```

---

## 4. Server-Setup mit Kodee (Der "Kodee-Protokoll")

Dies ist der entscheidende Teil. Kodee (oder der Server-Admin) muss den Server exakt so konfigurieren.

### Schritt 1: PHP Installieren & Nginx Konfigurieren

**Prompt an Kodee:**
> "Bitte installiere PHP (php-fpm) und konfiguriere Nginx so, dass es `.php` Dateien in meinem Web-Root ausführt. Füge dazu den `location ~ \.php$` Block in die Server-Config ein."

**Technischer Hintergrund:**
Nginx braucht diesen Block im `server { ... }` Teil:

```nginx
location ~ \.php$ {
    include snippets/fastcgi-php.conf;
    fastcgi_pass unix:/var/run/php/php8.1-fpm.sock; # Version prüfen!
}
```

### Schritt 2: Deployment

1.  Erstelle den Build: `npm run build`.
2.  Zippe den Inhalt von `dist/` (inklusive `api.php`).
3.  Lade die Dateien in den Web-Root (z.B. `/var/www/deine-domain/dist`).

### Schritt 3: Dateirechte (Der häufigste Fehler!)

Wenn die App **HTTP 500** meldet, fehlen Schreibrechte.

**Prompt an Kodee:**
> "Die App meldet HTTP 500 beim Speichern. Das bedeutet, PHP darf nicht in den Ordner schreiben. Bitte setze den Eigentümer (Owner) des Web-Roots auf den Webserver-User (meist `www-data`) und gib ihm Schreibrechte."

**Befehle (für Kodee/SSH):**

```bash
# 1. Eigentümer ändern (rekursiv)
chown -R www-data:www-data /var/www/deine-domain/dist

# 2. Schreibrechte für Eigentümer setzen
chmod -R 755 /var/www/deine-domain/dist

# 3. Speziell für die Datendatei (falls sie schon existiert)
chmod 664 /var/www/deine-domain/dist/data.json
```

---

## 5. Fehler-Diagnose (Cheat Sheet)

Wenn es nicht funktioniert, schau auf die Fehlermeldung in der App (Settings -> System):

| Fehler | Bedeutung | Lösung |
| :--- | :--- | :--- |
| **HTTP 404** | Datei nicht gefunden | URL in `App.tsx` prüfen. Liegt `api.php` wirklich im Ordner? |
| **HTTP 405** | Method Not Allowed | PHP läuft nicht. Nginx behandelt `api.php` als Textdatei. -> **Schritt 1 wiederholen.** |
| **HTTP 500** | Internal Server Error | PHP läuft, darf aber nicht schreiben. -> **Schritt 3 (Rechte) wiederholen.** |
| **Daten alt** | Caching Problem | Browser-Cache leeren. Prüfen, ob Cache-Header in `api.php` sind. |

---

**Zusammenfassung:**
1. App baut auf `api.php` auf.
2. Server muss PHP ausführen können (Nginx Config).
3. Server-User (`www-data`) muss schreiben dürfen (`chown`).
