#!/bin/bash

scriptDir=$(dirname -- "$(readlink -f -- "$BASH_SOURCE")")

HOST_TO_CHECK="$1"

if [ $# -eq 0 ]; then
    HOST_TO_CHECK="localhost"
fi

echo "We will need to wait ~5-10 minutes for things to settle down, migrations to finish, and TLS certs to be issued"
echo ""
echo "⏳ Waiting for CBS Uptime to boot (this will take a few minutes)"
echo ""
echo ""


bash $scriptDir/endpoint-status.sh "App" $HOST_TO_CHECK

bash $scriptDir/endpoint-status.sh "App (Status Check)" $HOST_TO_CHECK/status

bash $scriptDir/endpoint-status.sh "App (Ready Check)" $HOST_TO_CHECK/status/ready

bash $scriptDir/endpoint-status.sh "Dashboard" $HOST_TO_CHECK/dashboard

bash $scriptDir/endpoint-status.sh "Dashboard (Ready Check)" $HOST_TO_CHECK/dashboard/status/ready

bash $scriptDir/endpoint-status.sh "Dashboard (Status Check)" $HOST_TO_CHECK/dashboard/status

bash $scriptDir/endpoint-status.sh "Status Page" $HOST_TO_CHECK/status-page

bash $scriptDir/endpoint-status.sh "Status Page (Ready Check)" $HOST_TO_CHECK/status-page/status/ready

bash $scriptDir/endpoint-status.sh "Status Page (Status Check)" $HOST_TO_CHECK/status-page/status

bash $scriptDir/endpoint-status.sh "Accounts" $HOST_TO_CHECK/accounts

bash $scriptDir/endpoint-status.sh "Accounts (Ready Check)" $HOST_TO_CHECK/accounts/status/ready

bash $scriptDir/endpoint-status.sh "Accounts (Status Check)" $HOST_TO_CHECK/accounts/status

bash $scriptDir/endpoint-status.sh "Admin Dashboard" $HOST_TO_CHECK/admin/status/ready

bash $scriptDir/endpoint-status.sh "Admin Dashboard (Status Check)" $HOST_TO_CHECK/admin/status

bash $scriptDir/endpoint-status.sh "Admin Dashboard (Ready Check)" $HOST_TO_CHECK/admin/status/ready

bash $scriptDir/endpoint-status.sh "Ingestor (Ready Check)" $HOST_TO_CHECK/ingestor/status/ready

bash $scriptDir/endpoint-status.sh "Ingestor (Status Check)" $HOST_TO_CHECK/ingestor/status

echo "🚀 CBS Uptime is up! 🚀"
echo ""
echo "🎉🎉🎉  Done! 🎉🎉🎉"

echo "We would like to hear your feedback to make this product better for you and for other users, please email us at hello@uptime.cbsretail.net."
echo " - If you notice a bug, we will fix it for you."
echo " - If you need a feature, we will add that to the roadmap and let you know the estimated time to ship."
echo "- If you are an enterprise customer, we offer dedicated engineering support to build oneuptime features you need to integrate CBS Uptime for your organization. Please contact us at sales@uptime.cbsretail.net"
echo "We would love to hear your feedback. Email: hello@uptime.cbsretail.net"
