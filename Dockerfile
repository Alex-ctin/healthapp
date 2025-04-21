# Sử dụng Node.js phiên bản chính thức
FROM node:20

# Đặt thư mục làm việc trong container
WORKDIR /app

# Sao chép package.json và package-lock.json vào container
COPY package*.json ./

# Cài đặt các package
RUN npm install

# Sao chép toàn bộ source code vào container
COPY . .

# Mở cổng cho ứng dụng
EXPOSE 3000

# Chạy ứng dụng
CMD ["npm", "start"]
