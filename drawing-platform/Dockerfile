FROM node:20-bookworm-slim AS build

WORKDIR /app/drawing-platform

COPY drawing-platform/package.json drawing-platform/package-lock.json ./
RUN npm ci

COPY drawing-platform/ .
COPY md/ /app/md/
RUN npm run build

FROM node:20-bookworm-slim AS runtime

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8787 \
    SYSTEM_CANVAS_DATA_DIR=/app/.data

WORKDIR /app/drawing-platform

COPY drawing-platform/package.json drawing-platform/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/drawing-platform/dist ./dist
COPY --from=build /app/drawing-platform/dist-server ./dist-server

RUN mkdir -p /app/.data && chown node:node /app/.data

USER node

EXPOSE 8787
VOLUME ["/app/.data"]

CMD ["npm", "start"]
