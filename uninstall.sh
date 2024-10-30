#!/bin/bash

echo "Uninstall CBSUptime. This will remove CBSUptime from this server"
read -r -p "Do you want to uninstall CBSUptime? [y/N] " response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])+$ ]]
then
    echo "OK!"
else
    exit
fi


echo "Uninstalling CBSUptime..."
sudo docker compose down
sudo docker compose rm
echo "CBSUptime uninstalled."
echo "We would like to hear your feedback to make this product better for you and for other users, please email us at hello@uptime.cbsretail.net."
echo " - If you notice a bug, we will fix it for you."
echo " - If you need a feature, we will add that to the roadmap and let you know the estimated time to ship."
echo "We would love to hear your feedback. Email: hello@uptime.cbsretail.net"
