#!/usr/bin/env bash

acquire_schema_ops_lock() {
  local root_dir="$1"
  local operation="$2"
  local timeout_seconds="${SCHEMA_OPS_LOCK_TIMEOUT_SECONDS:-900}"
  local lock_dir="${SCHEMA_OPS_LOCK_DIR:-$root_dir/backups/.locks}"
  local lock_file="$lock_dir/mysql-schema-ops.lock"

  if ! [[ "$timeout_seconds" =~ ^[0-9]+$ ]]; then
    echo "SCHEMA_OPS_LOCK_TIMEOUT_SECONDS must be a non-negative integer." >&2
    return 1
  fi
  if ! command -v flock >/dev/null 2>&1; then
    echo "flock is required for schema operations." >&2
    return 1
  fi

  mkdir -p "$lock_dir"
  exec {SCHEMA_OPS_LOCK_FD}>"$lock_file"
  if ! flock -w "$timeout_seconds" "$SCHEMA_OPS_LOCK_FD"; then
    echo "Timed out waiting for schema operation lock: $operation" >&2
    return 1
  fi

  printf '%s operation=%s pid=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$operation" "$$" \
    > "$lock_file"
  echo "Schema operation lock acquired: $operation"
}

release_schema_ops_lock() {
  if [[ -z "${SCHEMA_OPS_LOCK_FD:-}" ]]; then
    return
  fi

  flock -u "$SCHEMA_OPS_LOCK_FD"
  eval "exec ${SCHEMA_OPS_LOCK_FD}>&-"
  unset SCHEMA_OPS_LOCK_FD
}
