# Multi-stage Dockerfile para ConfereAI (SPA React + Vite)

# Estagio 1: Compilacao da aplicacao
FROM node:22-alpine AS builder

WORKDIR /app

# Copia manifestos de dependencia para aproveitar cache de camadas
COPY package.json package-lock.json ./

# Instalacao exata e limpa das dependencias
RUN npm ci

# Copia todo o codigo-fonte
COPY . .

# Gera o bundle de producao na pasta /app/dist
RUN npm run build

# Estagio 2: Servidor web leve e de alta performance
FROM nginx:1.30.2-alpine3.23 AS runner

# Remove os arquivos padroes do nginx
RUN rm -rf /usr/share/nginx/html/*

# Copia a configuracao otimizada com suporte a SPA e gzip
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia os arquivos compilados do estagio de build
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
