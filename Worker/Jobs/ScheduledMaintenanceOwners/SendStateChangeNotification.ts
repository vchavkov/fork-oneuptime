import RunCron from "../../Utils/Cron";
import { CallRequestMessage } from "Common/Types/Call/CallRequest";
import LIMIT_MAX from "Common/Types/Database/LimitMax";
import OneUptimeDate from "Common/Types/Date";
import Dictionary from "Common/Types/Dictionary";
import { EmailEnvelope } from "Common/Types/Email/EmailMessage";
import EmailTemplateType from "Common/Types/Email/EmailTemplateType";
import NotificationSettingEventType from "Common/Types/NotificationSetting/NotificationSettingEventType";
import { SMSMessage } from "Common/Types/SMS/SMS";
import Text from "Common/Types/Text";
import { EVERY_MINUTE } from "Common/Utils/CronTime";
import ProjectService from "Common/Server/Services/ProjectService";
import ScheduledMaintenanceService from "Common/Server/Services/ScheduledMaintenanceService";
import ScheduledMaintenanceStateTimelineService from "Common/Server/Services/ScheduledMaintenanceStateTimelineService";
import UserNotificationSettingService from "Common/Server/Services/UserNotificationSettingService";
import Markdown, { MarkdownContentType } from "Common/Server/Types/Markdown";
import ScheduledMaintenance from "Common/Models/DatabaseModels/ScheduledMaintenance";
import ScheduledMaintenanceState from "Common/Models/DatabaseModels/ScheduledMaintenanceState";
import ScheduledMaintenanceStateTimeline from "Common/Models/DatabaseModels/ScheduledMaintenanceStateTimeline";
import User from "Common/Models/DatabaseModels/User";

RunCron(
  "ScheduledMaintenanceOwner:SendStateChangeEmail",
  { schedule: EVERY_MINUTE, runOnStartup: false },
  async () => {
    // get all scheduled events of all the projects.

    const scheduledMaintenanceStateTimelines: Array<ScheduledMaintenanceStateTimeline> =
      await ScheduledMaintenanceStateTimelineService.findBy({
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
          startsAt: true,
          projectId: true,
          project: {
            name: true,
          },
          scheduledMaintenance: {
            _id: true,
            title: true,
            description: true,
          },
          scheduledMaintenanceState: {
            name: true,
          },
        },
      });

    for (const scheduledMaintenanceStateTimeline of scheduledMaintenanceStateTimelines) {
      const scheduledMaintenance: ScheduledMaintenance =
        scheduledMaintenanceStateTimeline.scheduledMaintenance!;
      const scheduledMaintenanceState: ScheduledMaintenanceState =
        scheduledMaintenanceStateTimeline.scheduledMaintenanceState!;

      await ScheduledMaintenanceStateTimelineService.updateOneById({
        id: scheduledMaintenanceStateTimeline.id!,
        data: {
          isOwnerNotified: true,
        },
        props: {
          isRoot: true,
        },
      });

      // now find owners.

      let doesResourceHasOwners: boolean = true;

      let owners: Array<User> = await ScheduledMaintenanceService.findOwners(
        scheduledMaintenance.id!,
      );

      if (owners.length === 0) {
        doesResourceHasOwners = false;

        // find project owners.
        owners = await ProjectService.getOwners(
          scheduledMaintenanceStateTimeline.projectId!,
        );
      }

      if (owners.length === 0) {
        continue;
      }

      for (const user of owners) {
        const vars: Dictionary<string> = {
          scheduledMaintenanceTitle: scheduledMaintenance.title!,
          projectName: scheduledMaintenanceStateTimeline.project!.name!,
          currentState: scheduledMaintenanceState!.name!,
          scheduledMaintenanceDescription: await Markdown.convertToHTML(
            scheduledMaintenance.description! || "",
            MarkdownContentType.Email,
          ),
          stateChangedAt:
            OneUptimeDate.getDateAsFormattedHTMLInMultipleTimezones({
              date: scheduledMaintenanceStateTimeline.startsAt!,
              timezones: user.timezone ? [user.timezone] : [],
            }),
          scheduledMaintenanceViewLink: (
            await ScheduledMaintenanceService.getScheduledMaintenanceLinkInDashboard(
              scheduledMaintenanceStateTimeline.projectId!,
              scheduledMaintenance.id!,
            )
          ).toString(),
        };

        if (doesResourceHasOwners === true) {
          vars["isOwner"] = "true";
        }

        const emailMessage: EmailEnvelope = {
          templateType: EmailTemplateType.ScheduledMaintenanceOwnerStateChanged,
          vars: vars,
          subject: `[Scheduled Maintenance ${Text.uppercaseFirstLetter(
            scheduledMaintenanceState!.name!,
          )}] - ${scheduledMaintenance.title}`,
        };

        const sms: SMSMessage = {
          message: `This is a message from CBSUptime. Scheduled maintenance event - ${
            scheduledMaintenance.title
          }, state changed to ${scheduledMaintenanceState!
            .name!}. To view this event, go to CBSUptime Dashboard. To unsubscribe from this notification go to User Settings in CBSUptime Dashboard.`,
        };

        const callMessage: CallRequestMessage = {
          data: [
            {
              sayMessage: `This is a message from CBSUptime. Scheduled maintenance event ${
                scheduledMaintenance.title
              } state changed to ${scheduledMaintenanceState!
                .name!}. To view this event, go to CBSUptime Dashboard. To unsubscribe from this notification go to User Settings in CBSUptime Dashboard. Good bye.`,
            },
          ],
        };

        await UserNotificationSettingService.sendUserNotification({
          userId: user.id!,
          projectId: scheduledMaintenanceStateTimeline.projectId!,
          emailEnvelope: emailMessage,
          smsMessage: sms,
          callRequestMessage: callMessage,
          eventType:
            NotificationSettingEventType.SEND_SCHEDULED_MAINTENANCE_STATE_CHANGED_OWNER_NOTIFICATION,
        });
      }
    }
  },
);
