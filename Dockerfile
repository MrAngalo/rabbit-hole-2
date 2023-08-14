FROM node:12-alpine

WORKDIR /app

COPY . .

# Install temporary global packages
RUN npm install -g html-minifier terser
# Minify .ejs and js 
RUN find /app -name "*.ejs" -exec npx html-minifier --collapse-whitespace --remove-comments --output {} {} \;
RUN find /app -name "*.js" -exec npx terser {} --output {} \;
# Cleanup
RUN npm uninstall -g html-minifier terser

RUN npm install

ENV PORT=5000

EXPOSE 5000

CMD npm start
