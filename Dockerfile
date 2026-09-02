# 智汇中枢 - AI企业内部资料管理系统
# CloudBase 云托管 / Docker 通用镜像
FROM node:20-alpine

WORKDIR /app

# 先装依赖层（利用构建缓存）
COPY package.json package-lock.json ./
RUN npm install --production --registry=https://registry.npmmirror.com

# 拷贝应用代码
COPY server.js ./
COPY lib/ ./lib/
COPY public/ ./public/

# 默认数据目录（云托管时通过挂载卷覆盖，用 EKH_DATA_DIR 指向挂载点）
ENV NODE_ENV=production
ENV EKH_DATA_DIR=/mnt/data

EXPOSE 3000

CMD ["node", "server.js"]
