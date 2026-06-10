#!/bin/sh
# 服务器一键部署 —— 放在服务器 /opt/anxinmao/deploy.sh,SSH 后一句话上线:
#   ssh root@38.12.6.3 '/opt/anxinmao/deploy.sh'
#
# 流程:pull → build → 换容器 → 健康检查。
# 安全性:build 在 stop 旧容器【之前】—— 构建失败时线上不受影响(set -e 直接停)。
# env:用服务器上的持久文件 /opt/anxinmao/.env.runtime(600,不进 git);
#      首次不存在时从正在跑的旧容器抽一份生成。
set -e
cd /opt/anxinmao

ENV_FILE=/opt/anxinmao/.env.runtime
if [ ! -f "$ENV_FILE" ]; then
  echo "== 首次:从旧容器抽 env 生成 $ENV_FILE =="
  docker inspect anxinmao --format '{{range .Config.Env}}{{println .}}{{end}}' \
    | grep -E '^(LLM_PROVIDER|DEEPSEEK_API_KEY|DEEPSEEK_MODEL|DASHSCOPE_API_KEY|ARK_API_KEY|ADMIN_KEY)=' \
    > "$ENV_FILE"
  chmod 600 "$ENV_FILE"
fi
echo "env keys: $(grep -oE '^[A-Z_]+=' "$ENV_FILE" | tr -d '=' | tr '\n' ' ')"

echo "== git pull =="
git fetch origin
git pull --ff-only origin main
git log --oneline -1

echo "== docker build(失败则线上不动)=="
docker build -t anxinmao:latest .

echo "== 换容器 =="
docker stop anxinmao >/dev/null 2>&1 || true
docker rm anxinmao >/dev/null 2>&1 || true
docker run -d --name anxinmao --restart unless-stopped \
  -p 3100:3000 \
  -v /opt/anxinmao/data:/app/.data \
  --env-file "$ENV_FILE" \
  anxinmao:latest >/dev/null

sleep 5
echo "== 健康检查 =="
docker ps --filter name=anxinmao --format '{{.Status}}'
curl -sf -o /dev/null http://localhost:3100/ && echo "health: OK" || { echo "health: FAIL"; exit 1; }
echo "== 部署完成 =="
