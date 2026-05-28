# 安心猫 生产镜像 —— Node 20(Next.js 16 要求 ≥20.9),与 host 环境隔离。
# 简单单阶段构建:稳 > 镜像大小(磁盘够用)。
FROM node:20-alpine

WORKDIR /app

# 先装依赖(利用 layer cache:package 没变就不重装)
COPY package.json package-lock.json ./
RUN npm ci

# 拷源码 + 生产构建(next build --webpack,带 next-pwa 生成 sw.js)
COPY . .
RUN npm run build

# Next.js 默认监听 3000(容器内);host 侧用 -p 映射到别的端口
EXPOSE 3000

# 生产启动
CMD ["npm", "start"]
