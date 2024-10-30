import RunCron from "../../Utils/Cron";
import { CallRequestMessage } from "Common/Types/Call/CallRequest";
import LIMIT_MAX from "Common/Types/Database/LimitMax";
import OneUptimeDate from "Common/Types/Date";
import Dictionary from "Common/Types/Dictionary";
import { EmailEnvelope } from "Common/Types/Email/EmailMessage";
import EmailTemplateType from "Common/Types/Email/EmailTemplateType";
import NotificationSettingEventType from "Common/Types/NotificationSetting/NotificationSettingEventType";
import ObjectID from "Common/Types/ObjectID";
import { SMSMessage } from "Common/Types/SMS/SMS";
import Text from "Common/Types/Text";
import { EVERY_MINUTE } from "Common/Utils/CronTime";
import AlertService from "Common/Server/Services/AlertService";
import AlertStateTimelineService from "Common/Server/Services/AlertStateTimelineService";
import ProjectService from "Common/Server/Services/ProjectService";
import UserNotificationSettingService from "Common/Server/Services/UserNotificationSettingService";
import Markdown, { MarkdownContentType } from "Common/Server/Types/Markdown";
import Alert from "Common/Models/DatabaseModels/Alert";
import AlertState from "Common/Models/DatabaseModels/AlertState";
import AlertStateTimeline from "Common/Models/DatabaseModels/AlertStateTimeline";
import User from "Common/Models/DatabaseModels/User";

RunCron(
  "AlertOwner:SendStateChangeEmail",
  { schedule: EVERY_MINUTE, runOnStartup: false },
  async () => {
    // get all scheduled events of all the projects.

    const alertStateTimelines: Array<AlertStateTimeline> =
      await AlertStateTimelineService.findBy({
        query: {
          isOwnerNotified: false,
        },
        props: {
          isRoot: true,
        },
        limit: LIMIT_MAX,
        skip: 0,
        select: {
          _id: true,
          createdAt: true,
          projectId: true,
          project: {
            name: true,
          },
          alertId: true,
          alertState: {
            name: true,
          },
        },
      });

    for (const alertStateTimeline of alertStateTimelines) {
      const alertId: ObjectID = alertStateTimeline.alertId!;

      if (!alertId) {
        continue;
      }

      // get alert

      const alert: Alert | null = await AlertService.findOneById({
        id: alertId,
        props: {
          isRoot: true,
        },
        select: {
          _id: true,
          title: true,
          description: true,
          monitor: {
            name: true,
          },
        },
      });

      if (!alert) {
        continue;
      }

      const alertState: AlertState = alertStateTimeline.alertState!;

      // get alert severity
      const alertWithSeverity: Alert | null = await AlertService.findOneById({
        id: alert.id!,
        props: {
          isRoot: true,
        },
        select: {
          _id: true,
          alertSeverity: {
            name: true,
          },
        },
      });

      if (!alertWithSeverity) {
        continue;
      }

      await AlertStateTimelineService.updateOneById({
        id: alertStateTimeline.id!,
        data: {
          isOwnerNotified: true,
        },
        props: {
          isRoot: true,
        },
      });

      // now find owners.

      let doesResourceHasOwners: boolean = true;

      let owners: Array<User> = await AlertService.findOwners(alert.id!);

      if (owners.length === 0) {
        doesResourceHasOwners = false;

        // find project owners.
        owners = await ProjectService.getOwners(alertStateTimeline.projectId!);
      }

      if (owners.length === 0) {
        continue;
      }

      for (const user of owners) {
        const vars: Dictionary<string> = {
          alertTitle: alert.title!,
          projectName: alertStateTimeline.project!.name!,
          currentState: alertState!.name!,
          alertDescription: await Markdown.convertToHTML(
            alert.description! || "",
            MarkdownContentType.Email,
          ),
          resourcesAffected: alert.monitor?.name || "",
          stateChangedAt:
            OneUptimeDate.getDateAsFormattedHTMLInMultipleTimezones({
              date: alertStateTimeline.createdAt!,
              timezones: user.timezone ? [user.timezone] : [],
            }),
          alertSeverity: alertWithSeverity.alertSeverity!.name!,
          alertViewLink: (
            await AlertService.getAlertLinkInDashboard(
              alertStateTimeline.projectId!,
              alert.id!,
            )
          ).toString(),
        };

        if (doesResourceHasOwners === true) {
          vars["isOwner"] = "true";
        }

        const emailMessage: EmailEnvelope = {
          templateType: EmailTemplateType.AlertOwnerStateChanged,
          vars: vars,
          subject: `[Alert ${Text.uppercaseFirstLetter(
            alertState!.name!,
          )}] ${alert.title!}`,
        };

        const sms: SMSMessage = {
          message: `This is a message from CBSUptime. Alert: ${
            alert.title
          } - state changed to ${alertState!
            .name!}. To unsubscribe from this notification go to User Settings in CBSUptime Dashboard.`,
        };

        const callMessage: CallRequestMessage = {
          data: [
            {
              sayMessage: `This is a message from CBSUptime. Alert ${
                alert.title
              }       state changed to ${alertState!
                .name!}. To unsubscribe from this notification go to User Settings in CBSUptime Dashboard. Good bye.`,
            },
          ],
        };

        await UserNotificationSettingService.sendUserNotification({
          userId: user.id!,
          projectId: alertStateTimeline.projectId!,
          emailEnvelope: emailMessage,
          smsMessage: sms,
          callRequestMessage: callMessage,
          eventType:
            NotificationSettingEventType.SEND_ALERT_STATE_CHANGED_OWNER_NOTIFICATION,
        });
      }
    }
  },
);
