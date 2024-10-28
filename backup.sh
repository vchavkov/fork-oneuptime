# This file takes last 30 days backup. Make sure you run this file at least once/day.
# The backup will be in the format of db-(date of the month).backup
# Before the backup, please make sure DATABASE_BACKUP_* ENV vars in config.env is set properly.

export $(grep -v '^#' config.env | xargs)

echo "Starting backup...."

IMAGE_NAME="401376717990.dkr.ecr.us-east-1.amazonaws.com/docker-hub/library/postgres:15"

# Backup as SQL, CANNOT be used with pg_restore.
sudo docker run --net=host --rm \
--env-file config.env \
--volume=$(pwd)$DATABASE_BACKUP_DIRECTORY:/var/lib/postgresql/data \
$IMAGE_NAME /usr/bin/pg_dump --format=plain --clean --create \
--dbname=postgresql://$DATABASE_BACKUP_USERNAME:$DATABASE_BACKUP_PASSWORD@$DATABASE_BACKUP_HOST:$DATABASE_BACKUP_PORT/$DATABASE_BACKUP_NAME \
--file=/var/lib/postgresql/data/db-$(date +%d).sql

# Backup as Tar can be used with pg_restore
sudo docker run --net=host --rm \
--env-file config.env \
--volume=$(pwd)$DATABASE_BACKUP_DIRECTORY:/var/lib/postgresql/data \
$IMAGE_NAME /usr/bin/pg_dump --format=tar --clean --create \
--dbname=postgresql://$DATABASE_BACKUP_USERNAME:$DATABASE_BACKUP_PASSWORD@$DATABASE_BACKUP_HOST:$DATABASE_BACKUP_PORT/$DATABASE_BACKUP_NAME \
--file=/var/lib/postgresql/data/db-$(date +%d).tar

echo "Backup completed successfully!"
