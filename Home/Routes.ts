// improt API
import "./API/BlogAPI";
import { StaticPath, ViewsPath } from "./Utils/Config";
import NotFoundUtil from "./Utils/NotFound";
import ProductCompare, { Product } from "./Utils/ProductCompare";
import HTTPErrorResponse from "Common/Types/API/HTTPErrorResponse";
import HTTPResponse from "Common/Types/API/HTTPResponse";
import URL from "Common/Types/API/URL";
import OneUptimeDate from "Common/Types/Date";
import Dictionary from "Common/Types/Dictionary";
import { JSONObject } from "Common/Types/JSON";
import API from "Common/Utils/API";
import FeatureSet from "Common/Server/Types/FeatureSet";
import Express, {
  ExpressApplication,
  ExpressRequest,
  ExpressResponse,
  ExpressStatic,
} from "Common/Server/Utils/Express";
import "ejs";
import builder from "xmlbuilder2";
import { XMLBuilder } from "xmlbuilder2/lib/interfaces";
import OSSFriends, { OSSFriend } from "./Utils/OSSFriends";
import Reviews from "./Utils/Reviews";

const HomeFeatureSet: FeatureSet = {
  init: async (): Promise<void> => {
    const app: ExpressApplication = Express.getExpressApp();

    //Routes
    app.get("/", (_req: ExpressRequest, res: ExpressResponse) => {
      const { reviewsList1, reviewsList2, reviewsList3 } = Reviews;

      res.render(`${ViewsPath}/index`, {
        support: false,
        footerCards: true,
        cta: true,
        blackLogo: false,
        requestDemoCta: false,
        reviewsList1,
        reviewsList2,
        reviewsList3,
      });
    });

    app.get(
      "/infrastructure-agent/install.sh",
      (_req: ExpressRequest, res: ExpressResponse) => {
        // fetch the file from https://raw.githubusercontent.com/oneuptime/infrastructure-agent/release/Scripts/Install/Linux.sh  and send it as response
        res.redirect(
          "https://raw.githubusercontent.com/OneUptime/oneuptime/release/InfrastructureAgent/Scripts/Install/Linux.sh",
        );
      },
    );

    app.get("/support", async (_req: ExpressRequest, res: ExpressResponse) => {
      res.render(`${ViewsPath}/support`);
    });

    app.get(
      "/oss-friends",
      async (_req: ExpressRequest, res: ExpressResponse) => {
        res.render(`${ViewsPath}/oss-friends`, {
          ossFriends: OSSFriends.map((friend: OSSFriend) => {
            return {
              ...friend,
              repositoryUrl: friend.repositoryUrl.toString(),
            };
          }),
        });
      },
    );

    app.get("/pricing", (_req: ExpressRequest, res: ExpressResponse) => {
      const pricing: Array<JSONObject> = [
        {
          name: "Status Page",
          data: [
            {
              name: "Public Status Page",
              plans: {
                free: "1",
                growth: "Unlimited",
                scale: "Unlimited",
                enterprise: "Unlimited",
              },
            },
            {
              name: "Subscribers",
              plans: {
                free: "100",
                growth: "Unlimited",
                scale: "Unlimited",
                enterprise: "Unlimited",
              },
            },
            {
              name: "Custom Branding",
              plans: {
                free: true,
                growth: true,
                scale: true,
                enterprise: true,
              },
            },
            {
              name: "SSL Certificate",
              plans: {
                free: true,
                growth: true,
                scale: true,
                enterprise: true,
              },
            },
            {
              name: "Custom Domain",
              plans: {
                free: true,
                growth: true,
                scale: true,
                enterprise: true,
              },
            },
            {
              name: "Private Status Page",
              plans: {
                free: false,
                growth: "Unlimited",
                scale: "Unlimited",
                enterprise: "Unlimited",
              },
            },
            {
              name: "Private Status Page Users",
              plans: {
                free: false,
                growth: "Unlimited",
                scale: "Unlimited",
                enterprise: "Unlimited",
              },
            },
          ],
        },
        {
          name: "Incident Management",
          data: [
            {
              name: "Basic Incident Management",
              plans: {
                free: true,
                growth: true,
                scale: true,
                enterprise: true,
              },
            },
            {
              name: "Public Postmortem Notes",
              plans: {
                free: true,
                growth: true,
                scale: true,
                enterprise: true,
              },
            },
            {
              name: "Private Postmortem Notes",
              plans: {
                free: false,
                growth: true,
                scale: true,
                enterprise: true,
              },
            },
            {
              name: "Incident Workflows",
              plans: {
                free: false,
                growth: true,
                scale: true,
                enterprise: true,
              },
            },
            {
              name: "Custom Incident State",
              plans: {
                free: false,
                growth: true,
                scale: true,
                enterprise: true,
              },
            },
            {
              name: "Custom Incident Severity",
              plans: {
                free: false,
                growth: true,
                scale: true,
                enterprise: true,
              },
            },
          ],
        },
        {
          name: "Monitoring",
          data: [
            {
              name: "Static / Manual Monitors",
              plans: {
                free: true,
                growth: true,
                scale: true,
                enterprise: true,
              },
            },
            {
              name: "Website Monitoring",
              plans: {
                free: true,
                growth: true,
                scale: true,
                enterprise: true,
              },
            },
            {
              name: "API Monitoring",
              plans: {
                free: true,
                growth: true,
                scale: true,
                enterprise: true,
              },
            },
            {
              name: "Synthetic Monitoring (with Playwright)",
              plans: {
                free: true,
                growth: true,
                scale: true,
                enterprise: true,
              },
            },

            {
              name: "IPv4 Monitoring",
              plans: {
                free: true,
                growth: true,
                scale: true,
                enterprise: true,
              },
            },

            {
              name: "IPv6 Monitoring",
              plans: {
                free: true,
                growth: true,
                scale: true,
                enterprise: true,
              },
            },
            {
              name: "Inbound Webhook / Heartbeat Monitoring",
              plans: {
                free: true,
                growth: true,
                scale: true,
                enterprise: true,
              },
            },
            {
              name: "VM or Server Monitoring",
              plans: {
                free: true,
                growth: true,
                scale: true,
                enterprise: true,
              },
            },
            {
              name: "Network Monitoring",
              plans: {
                free: true,
                growth: true,
                scale: true,
                enterprise: true,
              },
            },
            {
              name: "Container Monitoring",
              plans: {
                free: "Coming Soon",
                growth: "Coming Soon",
                scale: "Coming Soon",
                enterprise: "Coming Soon",
              },
            },
            {
              name: "Kubernetes Cluster Monitoring",
              plans: {
                free: "Coming Soon",
                growth: "Coming Soon",
                scale: "Coming Soon",
                enterprise: "Coming Soon",
              },
            },
          ],
        },
        {
          name: "On-Call and Alerts",
          data: [
            {
              name: "Phone Alerts",
              plans: {
                free: true,
                growth: true,
                scale: true,
                enterprise: true,
              },
            },
            {
              name: "SMS Alerts",
              plans: {
                free: true,
                growth: true,
                scale: true,
                enterprise: true,
              },
            },
            {
              name: "Email Alerts",
              plans: {
                free: true,
                growth: true,
                scale: true,
                enterprise: true,
              },
            },
            {
              name: "On-Call Escalation",
              plans: {
                free: false,
                growth: true,
                scale: true,
                enterprise: true,
              },
            },
            {
              name: "Advanced Workflows",
              plans: {
                free: false,
                growth: true,
                scale: true,
                enterprise: true,
              },
            },
            {
              name: "On-Call Rotation",
              plans: {
                free: false,
                growth: true,
                scale: true,
                enterprise: true,
              },
            },
            {
              name: "Logs and Events",
              plans: {
                free: false,
                growth: true,
                scale: true,
                enterprise: true,
              },
            },
            {
              name: "Webhook Alerts",
              plans: {
                free: "Coming Soon",
                growth: "Coming Soon",
                scale: "Coming Soon",
                enterprise: "Coming Soon",
              },
            },

            {
              name: "Vacation and OOO Policy",
              plans: {
                free: "Coming Soon",
                growth: "Coming Soon",
                scale: "Coming Soon",
                enterprise: "Coming Soon",
              },
            },

            {
              name: "On-Call Pay",
              plans: {
                free: "Coming Soon",
                growth: "Coming Soon",
                scale: "Coming Soon",
                enterprise: "Coming Soon",
              },
            },

            {
              name: "Reports",
              plans: {
                free: "Coming Soon",
                growth: "Coming Soon",
                scale: "Coming Soon",
                enterprise: "Coming Soon",
              },
            },
          ],
        },
        {
          name: "Logs Management",
          data: [
            {
              name: "Ingest with OpenTelemetry",
              plans: {
                free: true,
                growth: true,
                scale: true,
                enterprise: true,
              },
            },
            {
              name: "Ingest with Fluentd",
              plans: {
                free: true,
                growth: true,
                scale: true,
                enterprise: true,
              },
            },
            {
              name: "Ingest +1000 Sources",
              plans: {
                free: true,
                growth: true,
                scale: true,
                enterprise: true,
              },
            },
            {
              name: "Application Logs",
              plans: {
                free: true,
                growth: true,
                scale: true,
                enterprise: true,
              },
            },
            {
              name: "Container Logs",
              plans: {
                free: true,
                growth: true,
                scale: true,
                enterprise: true,
              },
            },
            {
              name: "Data Rentention",
              plans: {
                free: "15 days",
                growth: "Custom",
                scale: "Custom",
                enterprise: "Custom",
              },
            },
            {
              name: "Workflows",
              plans: {
                free: false,
                growth: true,
                scale: true,
                enterprise: true,
              },
            },
            {
              name: "Advanced Team Permissions",
              plans: {
                free: false,
                growth: true,
                scale: true,
                enterprise: true,
              },
            },
          ],
        },
        {
          name: "Telemetry / APM",
          data: [
            {
              name: "Metrics",
              plans: {
                free: true,
                growth: true,
                scale: true,
                enterprise: true,
              },
            },
            {
              name: "Traces",
              plans: {
                free: true,
                growth: true,
                scale: true,
                enterprise: true,
              },
            },
            {
              name: "Error Tracking",
              plans: {
                free: true,
                growth: true,
                scale: true,
                enterprise: true,
              },
            },
            {
              name: "Ingest Pricing",
              plans: {
                free: "$0.10/GB",
                growth: "$0.10/GB",
                scale: "$0.10/GB",
                enterprise: "$0.10/GB",
              },
            },
            {
              name: "Data Rentention",
              plans: {
                free: "15 days",
                growth: "Custom",
                scale: "Custom",
                enterprise: "Custom",
              },
            },
            {
              name: "Workflows",
              plans: {
                free: false,
                growth: true,
                scale: true,
                enterprise: true,
              },
            },
            {
              name: "Advanced Team Permissions",
              plans: {
                free: false,
                growth: true,
                scale: true,
                enterprise: true,
              },
            },
          ],
        },
        {
          name: "Error Tracking",
          data: [
            {
              name: "Track Errors and Exceptions",
              plans: {
                free: true,
                growth: true,
                scale: true,
                enterprise: true,
              },
            },
            {
              name: "Cross Microservice Issues",
              plans: {
                free: true,
                growth: true,
                scale: true,
                enterprise: true,
              },
            },
            {
              name: "Distributed Tracing",
              plans: {
                free: true,
                growth: true,
                scale: true,
                enterprise: true,
              },
            },
            {
              name: "Stack Traces",
              plans: {
                free: true,
                growth: true,
                scale: true,
                enterprise: true,
              },
            },
            {
              name: "Version Management",
              plans: {
                free: true,
                growth: true,
                scale: true,
                enterprise: true,
              },
            },
            {
              name: "Data Rentention",
              plans: {
                free: "15 days",
                growth: "Custom",
                scale: "Custom",
                enterprise: "Custom",
              },
            },
            {
              name: "Workflows",
              plans: {
                free: false,
                growth: true,
                scale: true,
                enterprise: true,
              },
            },
            {
              name: "Advanced Team Permissions",
              plans: {
                free: false,
                growth: true,
                scale: true,
                enterprise: true,
              },
            },
          ],
        },
        {
          name: "Reliability Copilot",
          data: [
            {
              name: "Scan your Codebase",
              plans: {
                free: false,
                growth: true,
                scale: true,
                enterprise: true,
              },
            },
            {
              name: "Fix Errors Automatically",
              plans: {
                free: false,
                growth: true,
                scale: true,
                enterprise: true,
              },
            },
            {
              name: "Fix Performance Issues",
              plans: {
                free: false,
                growth: true,
                scale: true,
                enterprise: true,
              },
            },
            {
              name: "Fix DB Queries Automatically",
              plans: {
                free: false,
                growth: true,
                scale: true,
                enterprise: true,
              },
            },
            {
              name: "Fix Frontend Issues",
              plans: {
                free: false,
                growth: true,
                scale: true,
                enterprise: true,
              },
            },
            {
              name: "Integrate with GitHub, GitLab",
              plans: {
                free: false,
                growth: true,
                scale: true,
                enterprise: true,
              },
            },
            {
              name: "Integrate with CI/CD",
              plans: {
                free: false,
                growth: true,
                scale: true,
                enterprise: true,
              },
            },
            {
              name: "Integrate with Issue Tracker",
              plans: {
                free: false,
                growth: true,
                scale: true,
                enterprise: true,
              },
            },
            {
              name: "Integrates with Slack / Team",
              plans: {
                free: false,
                growth: true,
                scale: true,
                enterprise: true,
              },
            },
            {
              name: "Advanced Workflows",
              plans: {
                free: false,
                growth: true,
                scale: true,
                enterprise: true,
              },
            },
          ],
        },
        {
          name: "Support and More",
          data: [
            {
              name: "Support",
              plans: {
                free: "Email Support",
                growth: "Email Support",
                scale: "Email and Chat Support",
                enterprise: "Email, Chat, Phone Support",
              },
            },
            {
              name: "Support SLA",
              plans: {
                free: "5 business day",
                growth: "1 business day",
                scale: "6 hours",
                enterprise: "1 hour priority",
              },
            },
            {
              name: "Service SLA",
              plans: {
                free: "99.00%",
                growth: "99.90%",
                scale: "99.95%",
                enterprise: "99.99%",
              },
            },
          ],
        },
        {
          name: "Advanced Features",
          data: [
            {
              name: "API Access",
              plans: {
                free: false,
                growth: true,
                scale: true,
                enterprise: true,
              },
            },
            {
              name: "Advanced Workflows",
              plans: {
                free: false,
                growth: "500 Runs / month",
                scale: "2000 Runs  /month",
                enterprise: "Unlimited Runs",
              },
            },
            {
              name: "5000+ Integrations",
              plans: {
                free: false,
                growth: true,
                scale: true,
                enterprise: true,
              },
            },
          ],
        },
        {
          name: "Billing",
          data: [
            {
              name: "Billing Period",
              plans: {
                free: "Free",
                growth: "Monthly or Yearly",
                scale: "Monthly or Yearly",
                enterprise: "Custom",
              },
            },
            {
              name: "Payment Method",
              plans: {
                free: false,
                growth: "Visa / Mastercard / Amex / Bitcoin",
                scale: "Visa / Mastercard / Amex / Bitcoin",
                enterprise:
                  "Visa / Mastercard / Amex / ACH / Invoices / Bitcoin",
              },
            },
            {
              name: "Cancel Anytime",
              plans: {
                free: true,
                growth: true,
                scale: true,
                enterprise: true,
              },
            },
          ],
        },
      ];

      res.render(`${ViewsPath}/pricing`, {
        pricing,
      });
    });

    app.get(
      "/enterprise/demo",
      (_req: ExpressRequest, res: ExpressResponse) => {
        res.render(`${ViewsPath}/demo`, {
          support: false,
          footerCards: false,
          cta: false,
          blackLogo: true,
          requestDemoCta: false,
        });
      },
    );

    app.get(
      "/product/status-page",
      (_req: ExpressRequest, res: ExpressResponse) => {
        res.render(`${ViewsPath}/status-page`);
      },
    );

    app.get(
      "/product/logs-management",
      (_req: ExpressRequest, res: ExpressResponse) => {
        res.render(`${ViewsPath}/logs-management`);
      },
    );

    app.get("/product/apm", (_req: ExpressRequest, res: ExpressResponse) => {
      res.render(`${ViewsPath}/apm`);
    });

    app.get("/status-page", (_req: ExpressRequest, res: ExpressResponse) => {
      res.redirect("/product/status-page");
    });

    app.get(
      "/logs-manageemnt",
      (_req: ExpressRequest, res: ExpressResponse) => {
        res.redirect("/product/logs-manageemnt");
      },
    );

    let gitHubContributors: Array<JSONObject> = [];
    let gitHubBasicInfo: JSONObject | null = null;
    let gitHubCommits: string = "-";

    app.get("/about", async (_req: ExpressRequest, res: ExpressResponse) => {
      if (gitHubContributors.length === 0) {
        let contributors: Array<JSONObject> = [];

        let hasMoreContributors: boolean = true;

        let pageNumber: number = 1;

        while (hasMoreContributors) {
          const response: HTTPResponse<Array<JSONObject>> | HTTPErrorResponse =
            await API.get<Array<JSONObject>>(
              URL.fromString(
                "https://api.github.com/repos/oneuptime/oneuptime/contributors?page=" +
                  pageNumber,
              ),
            );
          pageNumber++;
          if ((response.data as Array<JSONObject>).length < 30) {
            hasMoreContributors = false;
          }

          contributors = contributors.concat(
            response.data as Array<JSONObject>,
          );
        }

        //cache it.
        gitHubContributors = [...contributors];
      }

      const response: HTTPResponse<JSONObject> = await API.get(
        URL.fromString(
          "https://api.github.com/repos/oneuptime/oneuptime/commits?sha=master&per_page=1&page=1",
        ),
      );

      if (gitHubCommits === "-") {
        // this is of type: '<https://api.github.com/repositories/380744866/commits?sha=master&per_page=1&page=2>; rel="next", <https://api.github.com/repositories/380744866/commits?sha=master&per_page=1&page=22486>; rel="last"',
        const link: string | undefined = response.headers["link"];
        const urlString: string | undefined = link
          ?.split(",")[1]
          ?.split(";")[0]
          ?.replace("<", "")
          .replace(">", "")
          .trim();
        const url: URL = URL.fromString(urlString!);
        const commits: string = Number.parseInt(
          url.getQueryParam("page") as string,
        ).toLocaleString();

        if (!gitHubBasicInfo) {
          const basicInfo: HTTPResponse<JSONObject> = await API.get(
            URL.fromString("https://api.github.com/repos/oneuptime/oneuptime"),
          );

          gitHubBasicInfo = basicInfo.data as JSONObject;
        }

        gitHubCommits = commits;
      }

      res.render(`${ViewsPath}/about`, {
        contributors: gitHubContributors,
        basicInfo: gitHubBasicInfo,
        commits: gitHubCommits,
      });
    });

    app.get(
      "/product/status-page",
      (_req: ExpressRequest, res: ExpressResponse) => {
        res.render(`${ViewsPath}/status-page`, {
          support: false,
          footerCards: true,
          cta: true,
          blackLogo: false,
          requestDemoCta: false,
          footerCtaText:
            "Start with Status Pages, expand into everything else. Sign up today.",
        });
      },
    );

    app.get("/status-page", (_req: ExpressRequest, res: ExpressResponse) => {
      res.redirect("/product/status-page");
    });

    app.get("/workflows", (_req: ExpressRequest, res: ExpressResponse) => {
      res.redirect("/product/workflows");
    });

    app.get("/on-call", (_req: ExpressRequest, res: ExpressResponse) => {
      res.redirect("/product/on-call");
    });

    app.get(
      "/product/monitoring",
      (_req: ExpressRequest, res: ExpressResponse) => {
        res.render(`${ViewsPath}/monitoring`);
      },
    );

    app.get(
      "/product/on-call",
      (_req: ExpressRequest, res: ExpressResponse) => {
        res.render(`${ViewsPath}/on-call`);
      },
    );

    app.get(
      "/product/workflows",
      (_req: ExpressRequest, res: ExpressResponse) => {
        res.render(`${ViewsPath}/workflows`);
      },
    );

    app.get(
      "/product/incident-management",
      (_req: ExpressRequest, res: ExpressResponse) => {
        res.render(`${ViewsPath}/incident-management`);
      },
    );

    app.get(
      "/incident-management",
      (_req: ExpressRequest, res: ExpressResponse) => {
        res.redirect("/product/incident-management");
      },
    );

    app.get(
      "/enterprise/overview",
      (_req: ExpressRequest, res: ExpressResponse) => {
        res.render(`${ViewsPath}/enterprise-overview.ejs`, {
          support: false,
          footerCards: true,
          cta: true,
          blackLogo: false,
          requestDemoCta: true,
        });
      },
    );

    app.get("/legal", (_req: ExpressRequest, res: ExpressResponse) => {
      res.render(`${ViewsPath}/legal.ejs`, {
        support: false,
        footerCards: true,
        cta: true,
        blackLogo: false,
        section: "terms",
        requestDemoCta: false,
      });
    });

    app.get("/legal/terms", (_req: ExpressRequest, res: ExpressResponse) => {
      res.render(`${ViewsPath}/legal.ejs`, {
        support: false,
        footerCards: true,
        cta: true,
        blackLogo: false,
        section: "terms",
        requestDemoCta: false,
      });
    });

    app.get("/legal/privacy", (_req: ExpressRequest, res: ExpressResponse) => {
      res.render(`${ViewsPath}/legal.ejs`, {
        support: false,
        footerCards: true,
        cta: true,
        blackLogo: false,
        section: "privacy",
        requestDemoCta: false,
      });
    });

    app.get("/legal/contact", (_req: ExpressRequest, res: ExpressResponse) => {
      res.render(`${ViewsPath}/legal.ejs`, {
        support: false,
        footerCards: true,
        cta: true,
        blackLogo: false,
        section: "contact",
        requestDemoCta: false,
      });
    });

    app.get(
      "/legal/subprocessors",
      (_req: ExpressRequest, res: ExpressResponse) => {
        res.render(`${ViewsPath}/legal.ejs`, {
          support: false,
          footerCards: true,
          cta: true,
          blackLogo: false,
          section: "subprocessors",
          requestDemoCta: false,
        });
      },
    );

    app.get("/legal/ccpa", (_req: ExpressRequest, res: ExpressResponse) => {
      res.render(`${ViewsPath}/legal.ejs`, {
        support: false,
        footerCards: true,
        cta: true,
        blackLogo: false,
        section: "ccpa",
        requestDemoCta: false,
      });
    });

    app.get("/legal/hipaa", (_req: ExpressRequest, res: ExpressResponse) => {
      res.render(`${ViewsPath}/legal.ejs`, {
        support: false,
        footerCards: true,
        cta: true,
        blackLogo: false,
        section: "hipaa",
        requestDemoCta: false,
      });
    });

    app.get("/legal/dmca", (_req: ExpressRequest, res: ExpressResponse) => {
      res.render(`${ViewsPath}/legal.ejs`, {
        support: false,
        footerCards: true,
        cta: true,
        blackLogo: false,
        section: "dmca",
        requestDemoCta: false,
      });
    });

    app.get("/legal/pci", (_req: ExpressRequest, res: ExpressResponse) => {
      res.render(`${ViewsPath}/legal.ejs`, {
        support: false,
        footerCards: true,
        cta: true,
        blackLogo: false,
        section: "pci",
        requestDemoCta: false,
      });
    });

    app.get(
      "/legal/iso-27001",
      (_req: ExpressRequest, res: ExpressResponse) => {
        res.render(`${ViewsPath}/legal.ejs`, {
          support: false,
          footerCards: true,
          cta: true,
          blackLogo: false,
          section: "iso-27001",
          requestDemoCta: false,
        });
      },
    );

    app.get(
      "/legal/iso-27017",
      (_req: ExpressRequest, res: ExpressResponse) => {
        res.render(`${ViewsPath}/legal.ejs`, {
          footerCards: true,
          support: false,
          cta: true,
          blackLogo: false,
          section: "iso-27017",
          requestDemoCta: false,
        });
      },
    );

    app.get(
      "/legal/iso-27018",
      (_req: ExpressRequest, res: ExpressResponse) => {
        res.render(`${ViewsPath}/legal.ejs`, {
          footerCards: true,
          support: false,
          cta: true,
          blackLogo: false,
          section: "iso-27018",
          requestDemoCta: false,
        });
      },
    );

    app.get(
      "/legal/iso-27017",
      (_req: ExpressRequest, res: ExpressResponse) => {
        res.render(`${ViewsPath}/legal.ejs`, {
          footerCards: true,
          support: false,
          cta: true,
          blackLogo: false,
          section: "iso-27017",
          requestDemoCta: false,
        });
      },
    );

    app.get(
      "/legal/iso-27018",
      (_req: ExpressRequest, res: ExpressResponse) => {
        res.render(`${ViewsPath}/legal.ejs`, {
          footerCards: true,
          support: false,
          cta: true,
          blackLogo: false,
          section: "iso-27018",
          requestDemoCta: false,
        });
      },
    );

    app.get("/legal/soc-2", (_req: ExpressRequest, res: ExpressResponse) => {
      res.render(`${ViewsPath}/legal.ejs`, {
        footerCards: true,
        support: false,
        cta: true,
        blackLogo: false,
        section: "soc-2",
        requestDemoCta: false,
      });
    });

    app.get("/legal/soc-3", (_req: ExpressRequest, res: ExpressResponse) => {
      res.render(`${ViewsPath}/legal.ejs`, {
        footerCards: true,
        support: false,
        cta: true,
        blackLogo: false,
        section: "soc-3",
        requestDemoCta: false,
      });
    });

    app.get(
      "/legal/data-residency",
      (_req: ExpressRequest, res: ExpressResponse) => {
        res.render(`${ViewsPath}/legal.ejs`, {
          footerCards: true,
          support: false,
          cta: true,
          blackLogo: false,
          section: "data-residency",
          requestDemoCta: false,
        });
      },
    );

    app.get("/legal/gdpr", (_req: ExpressRequest, res: ExpressResponse) => {
      res.render(`${ViewsPath}/legal.ejs`, {
        footerCards: true,
        support: false,
        cta: true,
        blackLogo: false,
        section: "gdpr",
        requestDemoCta: false,
      });
    });

    app.get("/legal/sla", (_req: ExpressRequest, res: ExpressResponse) => {
      res.render(`${ViewsPath}/legal.ejs`, {
        footerCards: true,
        support: false,
        cta: true,
        blackLogo: false,
        section: "sla",
        requestDemoCta: false,
      });
    });

    app.get(
      "/compare/:product",
      (req: ExpressRequest, res: ExpressResponse) => {
        const productConfig: Product = ProductCompare(
          req.params["product"] as string,
        );

        if (!productConfig) {
          return NotFoundUtil.renderNotFound(res);
        }
        res.render(`${ViewsPath}/product-compare.ejs`, {
          support: false,
          footerCards: true,
          cta: true,
          blackLogo: false,
          requestDemoCta: false,
          productConfig,
          onlyShowCompareTable: false,
        });
      },
    );

    // Generate sitemap
    app.get(
      "/sitemap.xml",
      async (_req: ExpressRequest, res: ExpressResponse) => {
        const siteUrls: Array<URL> = [
          URL.fromString("https://uptime.cbsretail.net/"),
          URL.fromString("https://uptime.cbsretail.net/pricing"),
          URL.fromString("https://uptime.cbsretail.net/support"),
          URL.fromString("https://uptime.cbsretail.net/about"),
          URL.fromString("https://uptime.cbsretail.net/product/status-page"),
          URL.fromString("https://uptime.cbsretail.net/product/incident-management"),
          URL.fromString("https://uptime.cbsretail.net/product/on-call"),
          URL.fromString("https://uptime.cbsretail.net/enterprise/overview"),
          URL.fromString("https://uptime.cbsretail.net/enterprise/demo"),
          URL.fromString("https://uptime.cbsretail.net/legal/terms"),
          URL.fromString("https://uptime.cbsretail.net/legal/privacy"),
          URL.fromString("https://uptime.cbsretail.net/legal/gdpr"),
          URL.fromString("https://uptime.cbsretail.net/legal/ccpa"),
          URL.fromString("https://uptime.cbsretail.net/legal"),
          URL.fromString("https://uptime.cbsretail.net/compare/pagerduty"),
          URL.fromString("https://uptime.cbsretail.net/compare/pingdom"),
          URL.fromString("https://uptime.cbsretail.net/compare/status-page.io"),
          URL.fromString("https://uptime.cbsretail.net/compare/incident.io"),
          URL.fromString("https://uptime.cbsretail.net/legal/soc-2"),
          URL.fromString("https://uptime.cbsretail.net/legal/soc-3"),
          URL.fromString("https://uptime.cbsretail.net/legal/iso-27017"),
          URL.fromString("https://uptime.cbsretail.net/legal/iso-27018"),
          URL.fromString("https://uptime.cbsretail.net/legal/hipaa"),
          URL.fromString("https://uptime.cbsretail.net/legal/pci"),
          URL.fromString("https://uptime.cbsretail.net/legal/sla"),
          URL.fromString("https://uptime.cbsretail.net/legal/iso-27001"),
          URL.fromString("https://uptime.cbsretail.net/legal/data-residency"),
          URL.fromString("https://uptime.cbsretail.net/legal/dmca"),
          URL.fromString("https://uptime.cbsretail.net/legal/subprocessors"),
          URL.fromString("https://uptime.cbsretail.net/legal/contact"),
        ];

        // Build xml
        const urlsetAttr: Dictionary<string> = {
          xmlns: "http://www.sitemaps.org/schemas/sitemap/0.9",
          "xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
          "xsi:schemaLocation":
            "http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd",
        };

        // Get previous day's date/timestamp
        const today: Date = OneUptimeDate.getOneDayAgo();
        const timestamp: string = today.toISOString();

        const urlset: XMLBuilder = builder.create().ele("urlset");

        // Apply attributes to root element
        for (const key in urlsetAttr) {
          urlset.att({ key: urlsetAttr[key] });
        }

        //Append urls to root element
        siteUrls.forEach((url: URL) => {
          const urlElement: XMLBuilder = urlset.ele("url");
          urlElement.ele("loc").txt(url.toString());
          urlElement.ele("lastmod").txt(timestamp);
        });

        // Generate xml file
        const xml: string = urlset.end({ prettyPrint: true });

        res.setHeader("Content-Type", "text/xml");
        res.send(xml);
      },
    );

    /*
     * Cache policy for static contents
     * Loads up the site faster
     */
    app.use(
      ExpressStatic(StaticPath, {
        setHeaders(res: ExpressResponse) {
          res.setHeader("Cache-Control", "public,max-age=31536000,immutable");
        },
      }),
    );

    app.get("/*", (_req: ExpressRequest, res: ExpressResponse) => {
      return NotFoundUtil.renderNotFound(res);
    });
  },
};

export default HomeFeatureSet;
