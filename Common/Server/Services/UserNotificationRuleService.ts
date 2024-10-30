import DatabaseConfig from "../DatabaseConfig";
import CreateBy from "../Types/Database/CreateBy";
import { OnCreate } from "../Types/Database/Hooks";
import Markdown, { MarkdownContentType } from "../Types/Markdown";
import CallService from "./CallService";
import DatabaseService from "./DatabaseService";
import IncidentService from "./IncidentService";
import IncidentSeverityService from "./IncidentSeverityService";
import MailService from "./MailService";
import ShortLinkService from "./ShortLinkService";
import SmsService from "./SmsService";
import UserEmailService from "./UserEmailService";
import UserOnCallLogService from "./UserOnCallLogService";
import UserOnCallLogTimelineService from "./UserOnCallLogTimelineService";
import { AppApiRoute } from "Common/ServiceRoute";
import Hostname from "../../Types/API/Hostname";
import Protocol from "../../Types/API/Protocol";
import Route from "../../Types/API/Route";
import URL from "../../Types/API/URL";
import CallRequest from "../../Types/Call/CallRequest";
import { LIMIT_PER_PROJECT } from "../../Types/Database/LimitMax";
import OneUptimeDate from "../../Types/Date";
import Dictionary from "../../Types/Dictionary";
import Email from "../../Types/Email";
import EmailMessage from "../../Types/Email/EmailMessage";
import EmailTemplateType from "../../Types/Email/EmailTemplateType";
import BadDataException from "../../Types/Exception/BadDataException";
import NotificationRuleType from "../../Types/NotificationRule/NotificationRuleType";
import ObjectID from "../../Types/ObjectID";
import Phone from "../../Types/Phone";
import SMS from "../../Types/SMS/SMS";
import UserNotificationEventType from "../../Types/UserNotification/UserNotificationEventType";
import UserNotificationExecutionStatus from "../../Types/UserNotification/UserNotificationExecutionStatus";
import UserNotificationStatus from "../../Types/UserNotification/UserNotificationStatus";
import Incident from "Common/Models/DatabaseModels/Incident";
import IncidentSeverity from "Common/Models/DatabaseModels/IncidentSeverity";
import ShortLink from "Common/Models/DatabaseModels/ShortLink";
import UserEmail from "Common/Models/DatabaseModels/UserEmail";
import Model from "Common/Models/DatabaseModels/UserNotificationRule";
import UserOnCallLog from "Common/Models/DatabaseModels/UserOnCallLog";
import UserOnCallLogTimeline from "Common/Models/DatabaseModels/UserOnCallLogTimeline";

export class Service extends DatabaseService<Model> {
  public constructor() {
    super(Model);
  }

  public async executeNotificationRuleItem(
    userNotificationRuleId: ObjectID,
    options: {
      projectId: ObjectID;
      triggeredByIncidentId?: ObjectID | undefined;
      userNotificationEventType: UserNotificationEventType;
      onCallPolicyExecutionLogId?: ObjectID | undefined;
      onCallPolicyId: ObjectID | undefined;
      onCallPolicyEscalationRuleId?: ObjectID | undefined;
      userNotificationLogId: ObjectID;
      userBelongsToTeamId?: ObjectID | undefined;
      onCallDutyPolicyExecutionLogTimelineId?: ObjectID | undefined;
    },
  ): Promise<void> {
    // get user notification log and see if this rule has already been executed. If so then skip.

    const userOnCallLog: UserOnCallLog | null =
      await UserOnCallLogService.findOneById({
        id: options.userNotificationLogId,
        props: {
          isRoot: true,
        },
        select: {
          _id: true,
          executedNotificationRules: true,
        },
      });

    if (!userOnCallLog) {
      throw new BadDataException("User notification log not found.");
    }

    if (
      Object.keys(userOnCallLog.executedNotificationRules || {}).includes(
        userNotificationRuleId.toString(),
      )
    ) {
      // already executed.
      return;
    }

    if (!userOnCallLog.executedNotificationRules) {
      userOnCallLog.executedNotificationRules = {};
    }

    userOnCallLog.executedNotificationRules[userNotificationRuleId.toString()] =
      OneUptimeDate.getCurrentDate();

    await UserOnCallLogService.updateOneById({
      id: userOnCallLog.id!,
      data: {
        executedNotificationRules: {
          ...userOnCallLog.executedNotificationRules,
        },
      } as any,
      props: {
        isRoot: true,
      },
    });

    // find notification rule item.
    const notificationRuleItem: Model | null = await this.findOneById({
      id: userNotificationRuleId!,
      select: {
        _id: true,
        userId: true,
        userCall: {
          phone: true,
          isVerified: true,
        },
        userSms: {
          phone: true,
          isVerified: true,
        },
        userEmail: {
          email: true,
          isVerified: true,
        },
      },
      props: {
        isRoot: true,
      },
    });

    if (!notificationRuleItem) {
      throw new BadDataException("Notification rule item not found.");
    }

    const logTimelineItem: UserOnCallLogTimeline = new UserOnCallLogTimeline();
    logTimelineItem.projectId = options.projectId;
    logTimelineItem.userNotificationLogId = options.userNotificationLogId;
    logTimelineItem.userNotificationRuleId = userNotificationRuleId;
    logTimelineItem.userNotificationLogId = options.userNotificationLogId;
    logTimelineItem.userId = notificationRuleItem.userId!;
    logTimelineItem.userNotificationEventType =
      options.userNotificationEventType;

    if (options.userBelongsToTeamId) {
      logTimelineItem.userBelongsToTeamId = options.userBelongsToTeamId;
    }

    if (options.onCallPolicyId) {
      logTimelineItem.onCallDutyPolicyId = options.onCallPolicyId;
    }

    if (options.onCallPolicyEscalationRuleId) {
      logTimelineItem.onCallDutyPolicyEscalationRuleId =
        options.onCallPolicyEscalationRuleId;
    }

    if (options.onCallPolicyExecutionLogId) {
      logTimelineItem.onCallDutyPolicyExecutionLogId =
        options.onCallPolicyExecutionLogId;
    }

    if (options.triggeredByIncidentId) {
      logTimelineItem.triggeredByIncidentId = options.triggeredByIncidentId;
    }

    if (options.onCallDutyPolicyExecutionLogTimelineId) {
      logTimelineItem.onCallDutyPolicyExecutionLogTimelineId =
        options.onCallDutyPolicyExecutionLogTimelineId;
    }

    // add status and status message and save.

    let incident: Incident | null = null;

    if (
      options.userNotificationEventType ===
        UserNotificationEventType.IncidentCreated &&
      options.triggeredByIncidentId
    ) {
      incident = await IncidentService.findOneById({
        id: options.triggeredByIncidentId!,
        props: {
          isRoot: true,
        },
        select: {
          _id: true,
          title: true,
          description: true,
          projectId: true,
          project: {
            name: true,
          },
          currentIncidentState: {
            name: true,
          },
          incidentSeverity: {
            name: true,
          },
          rootCause: true,
        },
      });
    }

    if (!incident) {
      throw new BadDataException("Incident not found.");
    }

    if (
      notificationRuleItem.userEmail?.email &&
      notificationRuleItem.userEmail?.isVerified
    ) {
      // send email.
      if (
        options.userNotificationEventType ===
          UserNotificationEventType.IncidentCreated &&
        incident
      ) {
        // create an error log.
        logTimelineItem.status = UserNotificationStatus.Sending;
        logTimelineItem.statusMessage = `Sending email to ${notificationRuleItem.userEmail?.email.toString()}`;
        logTimelineItem.userEmailId = notificationRuleItem.userEmail.id!;

        const updatedLog: UserOnCallLogTimeline =
          await UserOnCallLogTimelineService.create({
            data: logTimelineItem,
            props: {
              isRoot: true,
            },
          });

        const emailMessage: EmailMessage =
          await this.generateEmailTemplateForIncidentCreated(
            notificationRuleItem.userEmail?.email,
            incident,
            updatedLog.id!,
          );

        // send email.

        MailService.sendMail(emailMessage, {
          userOnCallLogTimelineId: updatedLog.id!,
          projectId: options.projectId,
        }).catch(async (err: Error) => {
          await UserOnCallLogTimelineService.updateOneById({
            id: updatedLog.id!,
            data: {
              status: UserNotificationStatus.Error,
              statusMessage: err.message || "Error sending email.",
            },
            props: {
              isRoot: true,
            },
          });
        });
      }
    }

    // if you have an email but is not verified, then create a log.
    if (
      notificationRuleItem.userEmail?.email &&
      !notificationRuleItem.userEmail?.isVerified
    ) {
      // create an error log.
      logTimelineItem.status = UserNotificationStatus.Error;
      logTimelineItem.statusMessage = `Email notification not sent because email ${notificationRuleItem.userEmail?.email.toString()} is not verified.`;

      await UserOnCallLogTimelineService.create({
        data: logTimelineItem,
        props: {
          isRoot: true,
        },
      });
    }

    // send sms.
    if (
      notificationRuleItem.userSms?.phone &&
      notificationRuleItem.userSms?.isVerified
    ) {
      // send sms.
      if (
        options.userNotificationEventType ===
          UserNotificationEventType.IncidentCreated &&
        incident
      ) {
        // create an error log.
        logTimelineItem.status = UserNotificationStatus.Sending;
        logTimelineItem.statusMessage = `Sending SMS to ${notificationRuleItem.userSms?.phone.toString()}.`;
        logTimelineItem.userSmsId = notificationRuleItem.userSms.id!;

        const updatedLog: UserOnCallLogTimeline =
          await UserOnCallLogTimelineService.create({
            data: logTimelineItem,
            props: {
              isRoot: true,
            },
          });

        const smsMessage: SMS =
          await this.generateSmsTemplateForIncidentCreated(
            notificationRuleItem.userSms.phone,
            incident,
            updatedLog.id!,
          );

        // send email.

        SmsService.sendSms(smsMessage, {
          projectId: incident.projectId,
          userOnCallLogTimelineId: updatedLog.id!,
        }).catch(async (err: Error) => {
          await UserOnCallLogTimelineService.updateOneById({
            id: updatedLog.id!,
            data: {
              status: UserNotificationStatus.Error,
              statusMessage: err.message || "Error sending SMS.",
            },
            props: {
              isRoot: true,
            },
          });
        });
      }
    }

    if (
      notificationRuleItem.userSms?.phone &&
      !notificationRuleItem.userSms?.isVerified
    ) {
      // create a log.
      logTimelineItem.status = UserNotificationStatus.Error;
      logTimelineItem.statusMessage = `SMS not sent because phone ${notificationRuleItem.userSms?.phone.toString()} is not verified.`;

      await UserOnCallLogTimelineService.create({
        data: logTimelineItem,
        props: {
          isRoot: true,
        },
      });
    }

    // send call.
    if (
      notificationRuleItem.userCall?.phone &&
      notificationRuleItem.userCall?.isVerified
    ) {
      // send call.
      logTimelineItem.status = UserNotificationStatus.Sending;
      logTimelineItem.statusMessage = `Making a call to ${notificationRuleItem.userCall?.phone.toString()}.`;
      logTimelineItem.userCallId = notificationRuleItem.userCall.id!;

      const updatedLog: UserOnCallLogTimeline =
        await UserOnCallLogTimelineService.create({
          data: logTimelineItem,
          props: {
            isRoot: true,
          },
        });

      const callRequest: CallRequest =
        await this.generateCallTemplateForIncidentCreated(
          notificationRuleItem.userCall?.phone,
          incident,
          updatedLog.id!,
        );

      // send email.

      CallService.makeCall(callRequest, {
        projectId: incident.projectId,
        userOnCallLogTimelineId: updatedLog.id!,
      }).catch(async (err: Error) => {
        await UserOnCallLogTimelineService.updateOneById({
          id: updatedLog.id!,
          data: {
            status: UserNotificationStatus.Error,
            statusMessage: err.message || "Error making call.",
          },
          props: {
            isRoot: true,
          },
        });
      });
    }

    if (
      notificationRuleItem.userCall?.phone &&
      !notificationRuleItem.userCall?.isVerified
    ) {
      // create a log.
      logTimelineItem.status = UserNotificationStatus.Error;
      logTimelineItem.statusMessage = `Call not sent because phone ${notificationRuleItem.userCall?.phone.toString()} is not verified.`;

      await UserOnCallLogTimelineService.create({
        data: logTimelineItem,
        props: {
          isRoot: true,
        },
      });
    }
  }

  public async generateCallTemplateForIncidentCreated(
    to: Phone,
    incident: Incident,
    userOnCallLogTimelineId: ObjectID,
  ): Promise<CallRequest> {
    const host: Hostname = await DatabaseConfig.getHost();

    const httpProtocol: Protocol = await DatabaseConfig.getHttpProtocol();

    const callRequest: CallRequest = {
      to: to,
      data: [
        {
          sayMessage: "This is a call from CBSUptime",
        },
        {
          sayMessage: "A new incident has been created",
        },
        {
          sayMessage: incident.title!,
        },
        {
          introMessage: "To acknowledge this incident press 1",
          numDigits: 1,
          timeoutInSeconds: 10,
          noInputMessage: "You have not entered any input. Good bye",
          onInputCallRequest: {
            "1": {
              sayMessage: "You have acknowledged this incident. Good bye",
            },
            default: {
              sayMessage: "Invalid input. Good bye",
            },
          },
          responseUrl: new URL(
            httpProtocol,
            host,
            new Route(AppApiRoute.toString())
              .addRoute(new UserOnCallLogTimeline().crudApiPath!)
              .addRoute(
                "/call/gather-input/" + userOnCallLogTimelineId.toString(),
              ),
          ),
        },
      ],
    };

    return callRequest;
  }

  public async generateSmsTemplateForIncidentCreated(
    to: Phone,
    incident: Incident,
    userOnCallLogTimelineId: ObjectID,
  ): Promise<SMS> {
    const host: Hostname = await DatabaseConfig.getHost();
    const httpProtocol: Protocol = await DatabaseConfig.getHttpProtocol();

    const shortUrl: ShortLink = await ShortLinkService.saveShortLinkFor(
      new URL(
        httpProtocol,
        host,
        new Route(AppApiRoute.toString())
          .addRoute(new UserOnCallLogTimeline().crudApiPath!)
          .addRoute("/acknowledge/" + userOnCallLogTimelineId.toString()),
      ),
    );
    const url: URL = await ShortLinkService.getShortenedUrl(shortUrl);

    const sms: SMS = {
      to,
      message: `This is a message from CBSUptime. A new incident has been created. ${
        incident.title
      }. To acknowledge this incident, please click on the following link ${url.toString()}`,
    };

    return sms;
  }

  public async generateEmailTemplateForIncidentCreated(
    to: Email,
    incident: Incident,
    userOnCallLogTimelineId: ObjectID,
  ): Promise<EmailMessage> {
    const host: Hostname = await DatabaseConfig.getHost();
    const httpProtocol: Protocol = await DatabaseConfig.getHttpProtocol();

    const vars: Dictionary<string> = {
      incidentTitle: incident.title!,
      projectName: incident.project!.name!,
      currentState: incident.currentIncidentState!.name!,
      incidentDescription: await Markdown.convertToHTML(
        incident.description! || "",
        MarkdownContentType.Email,
      ),
      incidentSeverity: incident.incidentSeverity!.name!,
      rootCause:
        incident.rootCause || "No root cause identified for this incident",
      incidentViewLink: (
        await IncidentService.getIncidentLinkInDashboard(
          incident.projectId!,
          incident.id!,
        )
      ).toString(),
      acknowledgeIncidentLink: new URL(
        httpProtocol,
        host,
        new Route(AppApiRoute.toString())
          .addRoute(new UserOnCallLogTimeline().crudApiPath!)
          .addRoute("/acknowledge/" + userOnCallLogTimelineId.toString()),
      ).toString(),
    };

    const emailMessage: EmailMessage = {
      toEmail: to!,
      templateType: EmailTemplateType.AcknowledgeIncident,
      vars: vars,
      subject: "ACTION REQUIRED: Incident created - " + incident.title!,
    };

    return emailMessage;
  }

  public async startUserNotificationRulesExecution(
    userId: ObjectID,
    options: {
      projectId: ObjectID;
      triggeredByIncidentId?: ObjectID | undefined;
      userNotificationEventType: UserNotificationEventType;
      onCallPolicyExecutionLogId?: ObjectID | undefined;
      onCallPolicyId: ObjectID | undefined;
      onCallPolicyEscalationRuleId?: ObjectID | undefined;
      userBelongsToTeamId?: ObjectID | undefined;
      onCallDutyPolicyExecutionLogTimelineId?: ObjectID | undefined;
      onCallScheduleId?: ObjectID | undefined;
    },
  ): Promise<void> {
    // add user notification log.
    const userOnCallLog: UserOnCallLog = new UserOnCallLog();

    userOnCallLog.userId = userId;
    userOnCallLog.projectId = options.projectId;

    if (options.triggeredByIncidentId) {
      userOnCallLog.triggeredByIncidentId = options.triggeredByIncidentId;
    }

    userOnCallLog.userNotificationEventType = options.userNotificationEventType;

    if (options.onCallPolicyExecutionLogId) {
      userOnCallLog.onCallDutyPolicyExecutionLogId =
        options.onCallPolicyExecutionLogId;
    }

    if (options.onCallPolicyId) {
      userOnCallLog.onCallDutyPolicyId = options.onCallPolicyId;
    }

    if (options.onCallDutyPolicyExecutionLogTimelineId) {
      userOnCallLog.onCallDutyPolicyExecutionLogTimelineId =
        options.onCallDutyPolicyExecutionLogTimelineId;
    }

    if (options.onCallPolicyEscalationRuleId) {
      userOnCallLog.onCallDutyPolicyEscalationRuleId =
        options.onCallPolicyEscalationRuleId;
    }

    if (options.userBelongsToTeamId) {
      userOnCallLog.userBelongsToTeamId = options.userBelongsToTeamId;
    }

    if (options.onCallScheduleId) {
      userOnCallLog.onCallDutyScheduleId = options.onCallScheduleId;
    }

    userOnCallLog.status = UserNotificationExecutionStatus.Scheduled;
    userOnCallLog.statusMessage = "Scheduled";

    await UserOnCallLogService.create({
      data: userOnCallLog,
      props: {
        isRoot: true,
      },
    });
  }

  protected override async onBeforeCreate(
    createBy: CreateBy<Model>,
  ): Promise<OnCreate<Model>> {
    if (
      !createBy.data.userCallId &&
      !createBy.data.userCall &&
      !createBy.data.userEmail &&
      !createBy.data.userSms &&
      !createBy.data.userSmsId &&
      !createBy.data.userEmailId
    ) {
      throw new BadDataException("Call, SMS, or Email is required");
    }

    return {
      createBy,
      carryForward: null,
    };
  }

  public async addDefaultNotificationRuleForUser(
    projectId: ObjectID,
    userId: ObjectID,
    email: Email,
  ): Promise<void> {
    const incidentSeverities: Array<IncidentSeverity> =
      await IncidentSeverityService.findBy({
        query: {
          projectId,
        },
        props: {
          isRoot: true,
        },
        limit: LIMIT_PER_PROJECT,
        skip: 0,
        select: {
          _id: true,
        },
      });

    //check userEmail

    let userEmail: UserEmail | null = await UserEmailService.findOneBy({
      query: {
        projectId,
        userId,
        email,
      },
      props: {
        isRoot: true,
      },
    });

    if (!userEmail) {
      userEmail = new UserEmail();
      userEmail.projectId = projectId;
      userEmail.userId = userId;
      userEmail.email = email;
      userEmail.isVerified = true;

      userEmail = await UserEmailService.create({
        data: userEmail,
        props: {
          isRoot: true,
        },
      });
    }

    // create for incident severities.
    for (const incidentSeverity of incidentSeverities) {
      //check if this rule already exists.
      const existingRule: Model | null = await this.findOneBy({
        query: {
          projectId,
          userId,
          userEmailId: userEmail.id!,
          incidentSeverityId: incidentSeverity.id!,
          ruleType: NotificationRuleType.ON_CALL_INCIDENT_CREATED,
        },
        props: {
          isRoot: true,
        },
      });

      if (existingRule) {
        continue; // skip this rule.
      }

      const notificationRule: Model = new Model();

      notificationRule.projectId = projectId;
      notificationRule.userId = userId;
      notificationRule.userEmailId = userEmail.id!;
      notificationRule.incidentSeverityId = incidentSeverity.id!;
      notificationRule.notifyAfterMinutes = 0;
      notificationRule.ruleType = NotificationRuleType.ON_CALL_INCIDENT_CREATED;

      await this.create({
        data: notificationRule,
        props: {
          isRoot: true,
        },
      });
    }

    //check if this rule already exists.
    const existingRuleOnCall: Model | null = await this.findOneBy({
      query: {
        projectId,
        userId,
        userEmailId: userEmail.id!,
        ruleType: NotificationRuleType.WHEN_USER_GOES_ON_CALL,
      },
      props: {
        isRoot: true,
      },
    });

    if (!existingRuleOnCall) {
      // on and off call.
      const onCallRule: Model = new Model();

      onCallRule.projectId = projectId;
      onCallRule.userId = userId;
      onCallRule.userEmailId = userEmail.id!;
      onCallRule.notifyAfterMinutes = 0;
      onCallRule.ruleType = NotificationRuleType.WHEN_USER_GOES_ON_CALL;

      await this.create({
        data: onCallRule,
        props: {
          isRoot: true,
        },
      });
    }

    //check if this rule already exists.
    const existingRuleOffCall: Model | null = await this.findOneBy({
      query: {
        projectId,
        userId,
        userEmailId: userEmail.id!,
        ruleType: NotificationRuleType.WHEN_USER_GOES_OFF_CALL,
      },
      props: {
        isRoot: true,
      },
    });

    if (!existingRuleOffCall) {
      // on and off call.
      const offCallRule: Model = new Model();

      offCallRule.projectId = projectId;
      offCallRule.userId = userId;
      offCallRule.userEmailId = userEmail.id!;
      offCallRule.notifyAfterMinutes = 0;
      offCallRule.ruleType = NotificationRuleType.WHEN_USER_GOES_OFF_CALL;

      await this.create({
        data: offCallRule,
        props: {
          isRoot: true,
        },
      });
    }
  }
}
export default new Service();
