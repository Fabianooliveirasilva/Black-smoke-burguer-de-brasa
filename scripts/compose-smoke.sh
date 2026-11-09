#!/usr/bin/env bash
# Smoke test of the production stack: `docker compose up` (Postgres + migrate/seed + app) and
# checks of what only the real containers can prove. Used by CI; runnable on any machine with Docker.
#   SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD=... scripts/compose-smoke.sh   (expects a filled .env)
set -euo pipefail

BASE=${BASE:-http://localhost:3000}
ORIGIN=(-H "Origin: $BASE")
JAR=$(mktemp)
fail() { echo "::error title=compose smoke::$*"; docker compose logs --tail=80 app migrate || true; exit 1; }
ok() { echo "✓ $*"; }

docker compose up -d --build

echo "waiting for $BASE/api/menu"
for _ in $(seq 1 90); do curl -fs "$BASE/api/menu" >/dev/null && break; sleep 2; done
curl -fs "$BASE/api/menu" >/dev/null || fail "app did not answer in 180 s"

[ "$(docker compose ps -a migrate --format '{{.ExitCode}}')" = "0" ] || fail "migrate/seed container did not exit 0"
ok "migrations + seed ran (migrate exited 0)"

PRODUCT=$(curl -fs "$BASE/api/menu" | jq -r '[.categories[].products[] | select(.slug == "smoke-classic")][0].id')
[ -n "$PRODUCT" ] && [ "$PRODUCT" != "null" ] || fail "seeded catalog missing smoke-classic"
ok "catalog served from Postgres"

for path in / /cardapio /cardapio/smoke-classic; do
  [ "$(curl -s -o /dev/null -w '%{http_code}' "$BASE$path")" = "200" ] || fail "$path is not 200"
done
[ "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/cardapio/nao-existe")" = "404" ] || fail "unknown product is not a real 404 (proxy + DB)"
ok "pages 200, unknown product 404"

headers=$(curl -sI "$BASE/")
for h in content-security-policy x-content-type-options referrer-policy x-frame-options; do
  grep -qi "^$h:" <<<"$headers" || fail "missing header $h"
done
ok "security headers present"

code=$(curl -s -o /dev/null -w '%{http_code}' -c "$JAR" "${ORIGIN[@]}" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$SEED_ADMIN_EMAIL\",\"password\":\"$SEED_ADMIN_PASSWORD\"}" "$BASE/api/auth/sign-in/email")
[ "$code" = "200" ] || fail "admin login returned $code"
[ "$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR" "$BASE/api/admin/dashboard")" = "200" ] || fail "admin API not reachable with session"
ok "seeded admin logs in and reaches the admin API"

# The production seed uses the real opening hours and CI runs at any time: open the store through
# the admin API (which also exercises saving settings) so the order below is never "store closed".
settings=$(curl -fs -b "$JAR" "$BASE/api/admin/settings" \
  | jq '.openingHours = [range(0; 7) | {day: ., open: "00:00", close: "23:59"}] | .ordersPaused = false')
[ "$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR" "${ORIGIN[@]}" -X PUT -H 'Content-Type: application/json' -d "$settings" "$BASE/api/admin/settings")" = "200" ] \
  || fail "saving store settings failed"
ok "admin saves store settings"

order=$(curl -fs "${ORIGIN[@]}" -H 'Content-Type: application/json' -d "{
  \"fulfillment\":\"PICKUP\",\"customer\":{\"name\":\"Smoke Compose\",\"phone\":\"11987654321\"},
  \"items\":[{\"productId\":\"$PRODUCT\",\"quantity\":1,\"options\":[],\"removedIngredientIds\":[]}],
  \"paymentMethod\":\"CASH\",\"changeForCents\":null,\"couponCode\":null,\"notes\":null}" "$BASE/api/orders") || fail "order creation failed"
token=$(jq -r .trackingToken <<<"$order")
[ "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/pedido/$token")" = "200" ] || fail "tracking page for a real order is not 200"
ok "order persisted (#$(jq -r .number <<<"$order")) and tracking page served"

url=$(curl -fs -b "$JAR" "${ORIGIN[@]}" -F "file=@public/images/products/onion-smash.jpg;type=image/jpeg" "$BASE/api/admin/uploads" | jq -r .url) \
  || fail "upload failed (volume not writable by the non-root user?)"
[ "$(curl -s -o /dev/null -w '%{http_code}' "$BASE$url")" = "200" ] || fail "uploaded image not served"
ok "upload written to the 'uploads' volume as non-root and served ($url)"

docker compose exec -T app sh -c 'test "$(id -u)" != "0"' || fail "app container runs as root"
ok "app runs as non-root"
echo "compose smoke: all checks passed"
