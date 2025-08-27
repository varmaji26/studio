# Stage 1: Next.js एप्लीकेशन को बनाने के लिए
FROM node:18-alpine AS builder

WORKDIR /app

# package.json और package-lock.json को कॉपी करें
COPY package.json ./

# सभी ज़रूरी चीज़ें इनस्टॉल करें
RUN npm install

# बाकी सारे कोड को कॉपी करें
COPY . .

# Next.js एप्लीकेशन को बिल्ड करें
RUN npm run build

# Stage 2: छोटी कंटेनर में एप्लीकेशन को चलाएं
FROM node:18-alpine

# वर्किंग डायरेक्टरी सेट करें
WORKDIR /app

# पहले स्टेज से बिल्ड की गई फ़ाइलें कॉपी करें
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./
COPY --from=builder /app/public ./public

# PORT 8080 पर सेट करें
ENV PORT 8080

# पोर्ट खोलें
EXPOSE 8080

# प्रोडक्शन मोड में एप्लीकेशन को चलाएं
CMD ["npm", "run", "start"]
