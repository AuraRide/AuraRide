# syntax=docker/dockerfile:1.7

# -------- build stage --------
FROM golang:1.23-alpine AS build
WORKDIR /src

# Goproxy 走国内镜像加速
ENV GOPROXY=https://goproxy.cn,direct \
    GOSUMDB=off \
    CGO_ENABLED=0

# 先拷 go.mod / go.sum,利用 layer 缓存
COPY go.mod go.sum ./
RUN go mod download

# 拷余下源码
COPY . .

# 构建 + 精简符号表
RUN go build -trimpath -ldflags="-s -w" -o /out/api ./cmd/api

# -------- runtime stage --------
FROM alpine:3.20
RUN apk add --no-cache ca-certificates tzdata wget && \
    addgroup -S app && adduser -S -G app app

WORKDIR /app
COPY --from=build /out/api /app/api

# migrations 一起带进镜像,api 启动时跑
COPY internal/migrations /app/migrations

USER app
EXPOSE 8080
ENV TZ=Asia/Shanghai

ENTRYPOINT ["/app/api"]
