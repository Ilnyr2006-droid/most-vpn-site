#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  printf 'Run this script as root.\n' >&2
  exit 1
fi

if [[ -f /etc/most-vpn/agent.env ]]; then
  source /etc/most-vpn/agent.env
  agent_token="${MOST_AGENT_TOKEN:?MOST_AGENT_TOKEN is required in /etc/most-vpn/agent.env}"
else
  : "${MOST_CONTROL_URL:?MOST_CONTROL_URL is required}"
  : "${MOST_ENROLL_TOKEN:?MOST_ENROLL_TOKEN is required}"
  agent_token=""
fi

if [[ ! "${MOST_CONTROL_URL}" =~ ^https:// ]] && [[ ! "${MOST_CONTROL_URL}" =~ ^http://(localhost|127\.0\.0\.1)(:[0-9]+)?$ ]]; then
  printf 'MOST_CONTROL_URL must use HTTPS.\n' >&2
  exit 1
fi

apt-get update
apt-get install -y ca-certificates curl jq

xray_binary="/usr/local/bin/xray"
xray_config="/usr/local/etc/xray/config.json"
if [[ ! -x "${xray_binary}" || ! -f "${xray_config}" ]]; then
  printf 'Xray and %s must be configured before enrolling this node.\n' "${xray_config}" >&2
  exit 1
fi

"${xray_binary}" run -test -config "${xray_config}"

if [[ -z "${agent_token}" ]]; then
  enroll_payload="$(jq -n --arg token "${MOST_ENROLL_TOKEN}" --arg hostname "$(hostname -f 2>/dev/null || hostname)" '{token:$token,hostname:$hostname,agentVersion:"1"}')"
  enroll_response="$(curl --fail --silent --show-error \
    -H 'Content-Type: application/json' \
    --data "${enroll_payload}" \
    "${MOST_CONTROL_URL}/api/node/enroll")"
  agent_token="$(jq -er '.agentToken' <<<"${enroll_response}")"
  install -d -m 0750 /etc/most-vpn
  umask 077
  printf 'MOST_CONTROL_URL=%s\nMOST_AGENT_TOKEN=%s\n' "${MOST_CONTROL_URL}" "${agent_token}" > /etc/most-vpn/agent.env
  chmod 0600 /etc/most-vpn/agent.env
fi

install -m 0750 /dev/stdin /usr/local/sbin/most-node-agent <<'MOST_AGENT'
#!/usr/bin/env bash
set -euo pipefail

source /etc/most-vpn/agent.env
xray_binary="/usr/local/bin/xray"
xray_config="/usr/local/etc/xray/config.json"
xray_active=false
config_valid=false

if systemctl is-active --quiet xray; then
  xray_active=true
fi
if "${xray_binary}" run -test -config "${xray_config}" >/dev/null 2>&1; then
  config_valid=true
fi

endpoints='[]'
while IFS=$'\t' read -r port network server_name private_key short_id flow endpoint_path; do
  [[ -n "${port}" && -n "${server_name}" && -n "${private_key}" && -n "${short_id}" ]] || continue
  key_output="$("${xray_binary}" x25519 -i "${private_key}")"
  public_key="$(awk -F': ' '/Password \(PublicKey\)|Public key/ {print $2; exit}' <<<"${key_output}")"
  [[ -n "${public_key}" ]] || continue
  endpoints="$(jq \
    --argjson port "${port}" \
    --arg network "${network}" \
    --arg serverName "${server_name}" \
    --arg publicKey "${public_key}" \
    --arg shortId "${short_id}" \
    --arg flow "${flow}" \
    --arg path "${endpoint_path}" \
    '. + [{port:$port,network:$network,serverName:$serverName,publicKey:$publicKey,shortId:$shortId,flow:$flow,path:$path}]' <<<"${endpoints}")"
done < <(jq -r '.inbounds[] | select(.protocol == "vless" and .streamSettings.security == "reality") | [(.port|tostring), (.streamSettings.network // "tcp"), (.streamSettings.realitySettings.serverNames[0] // ""), (.streamSettings.realitySettings.privateKey // ""), (.streamSettings.realitySettings.shortIds[0] // ""), (.settings.clients[0].flow // ""), (.streamSettings.xhttpSettings.path // "")] | @tsv' "${xray_config}")

payload="$(jq -n \
  --arg hostname "$(hostname -f 2>/dev/null || hostname)" \
  --arg agentVersion "1" \
  --argjson xrayActive "${xray_active}" \
  --argjson configValid "${config_valid}" \
  --argjson endpoints "${endpoints}" \
  '{hostname:$hostname,agentVersion:$agentVersion,xrayActive:$xrayActive,configValid:$configValid,endpoints:$endpoints}')"

curl --fail --silent --show-error \
  -H "Authorization: Bearer ${MOST_AGENT_TOKEN}" \
  -H 'Content-Type: application/json' \
  --data "${payload}" \
  "${MOST_CONTROL_URL}/api/node/heartbeat" >/dev/null

command_response="$(curl --fail --silent --show-error \
  -H "Authorization: Bearer ${MOST_AGENT_TOKEN}" \
  "${MOST_CONTROL_URL}/api/node/commands")"
command_id="$(jq -r '.command.id // empty' <<<"${command_response}")"
[[ -n "${command_id}" ]] || exit 0
command_kind="$(jq -r '.command.kind // empty' <<<"${command_response}")"
client_id="$(jq -r '.command.clientId // empty' <<<"${command_response}")"
client_email="$(jq -r '.command.email // empty' <<<"${command_response}")"

if [[ ! "${command_id}" =~ ^cmd_[0-9a-fA-F-]{36}$ ]] || [[ ! "${client_id}" =~ ^[0-9a-fA-F-]{36}$ ]] || [[ ! "${client_email}" =~ ^[A-Za-z0-9._-]{1,120}$ ]]; then
  exit 1
fi

candidate_config="$(mktemp)"
cleanup() { rm -f "${candidate_config}"; }
trap cleanup EXIT

case "${command_kind}" in
  PROVISION)
    jq --arg clientId "${client_id}" --arg email "${client_email}" '
      .inbounds |= map(
        if .protocol == "vless" and .streamSettings.security == "reality" then
          .settings.clients = ((.settings.clients // []) |
            if any(.[]; .id == $clientId) then .
            else . + [{id:$clientId,email:$email,flow:(.[0].flow // "")}]
            end)
        else . end
      )' "${xray_config}" > "${candidate_config}"
    ;;
  REVOKE)
    jq --arg clientId "${client_id}" '
      .inbounds |= map(
        if .protocol == "vless" and .streamSettings.security == "reality" then
          .settings.clients = ((.settings.clients // []) | map(select(.id != $clientId)))
        else . end
      )' "${xray_config}" > "${candidate_config}"
    ;;
  *)
    exit 1
    ;;
esac

result_error=""
if ! "${xray_binary}" run -test -config "${candidate_config}" >/dev/null 2>&1; then
  result_error="Xray rejected the updated configuration"
elif ! install -m 0600 "${candidate_config}" "${xray_config}"; then
  result_error="Could not install the updated configuration"
elif ! systemctl reload xray 2>/dev/null && ! systemctl restart xray; then
  result_error="Xray could not reload the updated configuration"
fi

if [[ -z "${result_error}" ]]; then
  result_payload='{"success":true}'
else
  result_payload="$(jq -n --arg error "${result_error}" '{success:false,error:$error}')"
fi
curl --fail --silent --show-error \
  -H "Authorization: Bearer ${MOST_AGENT_TOKEN}" \
  -H 'Content-Type: application/json' \
  --data "${result_payload}" \
  "${MOST_CONTROL_URL}/api/node/commands/${command_id}" >/dev/null
MOST_AGENT

install -m 0644 /dev/stdin /etc/systemd/system/most-node-agent.service <<'MOST_SERVICE'
[Unit]
Description=MOST VPN node heartbeat
After=network-online.target xray.service
Wants=network-online.target

[Service]
Type=oneshot
EnvironmentFile=/etc/most-vpn/agent.env
ExecStart=/usr/local/sbin/most-node-agent
User=root
NoNewPrivileges=true
PrivateTmp=true
ProtectHome=true
ProtectSystem=strict
ReadOnlyPaths=/usr/local/etc/xray
MOST_SERVICE

install -m 0644 /dev/stdin /etc/systemd/system/most-node-agent.timer <<'MOST_TIMER'
[Unit]
Description=Send MOST VPN node heartbeat

[Timer]
OnBootSec=10s
OnUnitActiveSec=30s
RandomizedDelaySec=5s
Persistent=true

[Install]
WantedBy=timers.target
MOST_TIMER

systemctl daemon-reload
systemctl enable --now most-node-agent.timer
systemctl start most-node-agent.service
printf 'MOST VPN node enrolled successfully.\n'
