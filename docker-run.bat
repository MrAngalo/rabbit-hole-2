docker rmi rabbit
docker build -t rabbit .
docker run -it --rm --env-file .env -p 5000:5000 rabbit