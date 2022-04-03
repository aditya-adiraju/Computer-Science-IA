FROM node:14
WORKDIR /Computer Science IA
COPY package.json .
RUN npm install
COPY . .
CMD npm start