# This file takes last 30 days backup. Make sure you run this file at least once/day. 
# The backup will be in the format of db-(date of the month).backup
# Before the backup, please make sure DATABASE_BACKUP_* ENV vars in config.env is set properly. 

export $(grep -v '^#' config.env | xargs)

echo "Starting backup...."

# Backup as SQL, CANNOT be used with pg_restore.
sudo docker run --net=host --rm \
--env-file config.env \
--volume=$(pwd)$DATABASE_BACKUP_DIRECTORY:/var/lib/postgresql/data \
postgres:latest /usr/bin/pg_dump --format=plain --clean --create --dbname=postgresql://$DATABASE_BACKUP_USERNAME:$DATABASE_BACKUP_PASSWORD@$DATABASE_BACKUP_HOST:$DATABASE_BACKUP_PORT/$DATABASE_BACKUP_NAME --file=/var/lib/postgresql/data/db-$(date +%Y-%m-%d-%H-%M-%S).sql

# Backup as Tar can be used with pg_restore
sudo docker run --net=host --rm \
--env-file config.env \
--volume=$(pwd)$DATABASE_BACKUP_DIRECTORY:/var/lib/postgresql/data \
postgres:latest /usr/bin/pg_dump --format=tar --clean --create --dbname=postgresql://$DATABASE_BACKUP_USERNAME:$DATABASE_BACKUP_PASSWORD@$DATABASE_BACKUP_HOST:$DATABASE_BACKUP_PORT/$DATABASE_BACKUP_NAME --file=/var/lib/postgresql/data/db-$(date +%Y-%m-%d-%H-%M-%S).tar

echo "Backup completed successfully!"