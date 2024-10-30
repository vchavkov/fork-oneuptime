#!/bin/bash

echo "Uninstall CBS Uptime. This will remove CBS Uptime from this server"
read -r -p "Do you want to uninstall CBS Uptime? [y/N] " response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])+$ ]]
then
    echo "OK!"
else
    exit
fi


echo "Uninstalling CBS Uptime..."
sudo docker compose down
sudo docker compose rm
echo "CBS Uptime uninstalled."
echo "We would like to hear your feedback to make this product better for you and for other users, please email us at hello@uptime.cbsretail.net."
echo " - If you notice a bug, we will fix it for you."
echo " - If you need a feature, we will add that to the roadmap and let you know the estimated time to ship."
echo "We would love to hear your feedback. Email: hello@oneuptime.com"
