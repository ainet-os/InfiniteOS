#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
TEMPLATE_DIR="${SCRIPT_DIR}/deb"

PKG_NAME="infinite-agent"
BASE_VERSION="0.1.0"
COMMIT_TIMEZONE="${COMMIT_TIMEZONE:-Asia/Shanghai}"
COMMIT_TIMESTAMP="${COMMIT_TIMESTAMP:-$(TZ="${COMMIT_TIMEZONE}" git -C "${REPO_ROOT}" log -1 --format='%cd' --date=format-local:'%Y%m%d%H%M%S')}"
COMMIT_ID="${COMMIT_ID:-$(git -C "${REPO_ROOT}" rev-parse --short=8 HEAD)}"
VERSION="${BASE_VERSION}+rev${COMMIT_TIMESTAMP}.git${COMMIT_ID}"
ARCH="${ARCH:-$(dpkg --print-architecture)}"

BUILD_ROOT="${SCRIPT_DIR}/.build"
STAGE_DIR="${BUILD_ROOT}/${PKG_NAME}_${VERSION}_${ARCH}"
DEBIAN_DIR="${STAGE_DIR}/DEBIAN"
OUTPUT_DIR="${REPO_ROOT}/dist"
OUTPUT_DEB="${OUTPUT_DIR}/${PKG_NAME}_${VERSION}_${ARCH}.deb"

NPM_REGISTRY="${NPM_REGISTRY:-https://registry.npmmirror.com}"
export NPM_CONFIG_CACHE="${BUILD_ROOT}/.npm-cache"
export NPM_CONFIG_REGISTRY="${NPM_REGISTRY}"
mkdir -p "${NPM_CONFIG_CACHE}"

required_cmds=(git npm rsync dpkg-deb dpkg sed awk du install)
for cmd in "${required_cmds[@]}"; do
  if ! command -v "${cmd}" >/dev/null 2>&1; then
    echo "Missing required command: ${cmd}" >&2
    exit 1
  fi
done

echo "==> Building ${PKG_NAME} version ${VERSION} (${ARCH})"
echo "==> Using npm registry: ${NPM_CONFIG_REGISTRY}"
find "${BUILD_ROOT}" -mindepth 1 -maxdepth 1 -type d -name "${PKG_NAME}_*" -exec rm -rf {} +
mkdir -p "${DEBIAN_DIR}" "${OUTPUT_DIR}"
rm -fv ${OUTPUT_DIR}/*.deb

echo "==> Building frontend dist with VITE_API_BASE_URL=/api"
(
  cd "${REPO_ROOT}/frontend"
  npm ci
  VITE_API_BASE_URL=/api npm run build-only
)

echo "==> Building backend bundle"
(
  cd "${REPO_ROOT}/backend"
  npm ci
  npm run build
)

echo "==> Staging backend bundle"
install -d "${STAGE_DIR}/opt/iosm/backend/dist" "${STAGE_DIR}/opt/iosm/backend/config"
install -m 0644 "${REPO_ROOT}/backend/dist/server.mjs" "${STAGE_DIR}/opt/iosm/backend/dist/server.mjs"

echo "==> Staging frontend dist"
install -d "${STAGE_DIR}/opt/iosm/frontend/dist"
rsync -a "${REPO_ROOT}/frontend/dist/" "${STAGE_DIR}/opt/iosm/frontend/dist/"

echo "==> Installing systemd service and nginx config"
install -d "${STAGE_DIR}/etc/iosm" "${STAGE_DIR}/etc/nginx/sites-available" "${STAGE_DIR}/lib/systemd/system"

install -m 0644 "${TEMPLATE_DIR}/backend.env" "${STAGE_DIR}/etc/iosm/backend.env"
install -m 0644 "${TEMPLATE_DIR}/iosm.conf" "${STAGE_DIR}/etc/nginx/sites-available/iosm.conf"
install -m 0644 "${TEMPLATE_DIR}/iosm-backend.service" "${STAGE_DIR}/lib/systemd/system/iosm-backend.service"

INSTALLED_SIZE="$(
  du -sk "${STAGE_DIR}/opt" "${STAGE_DIR}/etc" "${STAGE_DIR}/lib" \
    | awk '{sum += $1} END {print sum + 1}'
)"

echo "==> Rendering DEBIAN metadata"
sed \
  -e "s/__PKG_NAME__/${PKG_NAME}/g" \
  -e "s/__VERSION__/${VERSION}/g" \
  -e "s/__ARCH__/${ARCH}/g" \
  -e "s/__INSTALLED_SIZE__/${INSTALLED_SIZE}/g" \
  "${TEMPLATE_DIR}/control" > "${DEBIAN_DIR}/control"

install -m 0755 "${TEMPLATE_DIR}/postinst" "${DEBIAN_DIR}/postinst"
install -m 0755 "${TEMPLATE_DIR}/prerm" "${DEBIAN_DIR}/prerm"
install -m 0755 "${TEMPLATE_DIR}/postrm" "${DEBIAN_DIR}/postrm"
install -m 0644 "${TEMPLATE_DIR}/conffiles" "${DEBIAN_DIR}/conffiles"

echo "==> Building deb package"
dpkg-deb --build --root-owner-group "${STAGE_DIR}" "${OUTPUT_DEB}" >/dev/null

echo "==> Done"
echo "Package: ${OUTPUT_DEB}"
