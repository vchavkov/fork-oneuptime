import BadDataException from "../Exception/BadDataException";

enum MonitorType {
  Manual = "Manual",
  Website = "Website",
  API = "API",
  Ping = "Ping",
  Kubernetes = "Kubernetes",
  IP = "IP",
  IncomingRequest = "Incoming Request",
  Port = "Port",
  Server = "Server",
  SSLCertificate = "SSL Certificate",

  // These two monitor types are same but we are keeping them separate for now - this is for marketing purposes
  SyntheticMonitor = "Synthetic Monitor",
  CustomJavaScriptCode = "Custom JavaScript Code",

  // Telemetry monitor types
  Logs = "Logs",
  Metrics = "Metrics",
  Traces = "Traces",
}

export default MonitorType;

export interface MonitorTypeProps {
  monitorType: MonitorType;
  description: string;
  title: string;
}

export class MonitorTypeHelper {
  public static getAllMonitorTypeProps(): Array<MonitorTypeProps> {
    const monitorTypeProps: Array<MonitorTypeProps> = [
      {
        monitorType: MonitorType.API,
        title: "API",
        description:
          "This monitor type lets you monitor any API - GET, POST, PUT, DELETE or more.",
      },
      {
        monitorType: MonitorType.Manual,
        title: "Manual",
        description:
          "This monitor is a static monitor and will not actually monitor anything. It will however help you to integrate CBS Uptime with external monitoring tools and utilities.",
      },
      {
        monitorType: MonitorType.Website,
        title: "Website",
        description:
          "This monitor type lets you monitor landing pages like home page of your company / blog or more.",
      },
      {
        monitorType: MonitorType.Ping,
        title: "Ping",
        description:
          "This monitor type does the basic ping test of an endpoint.",
      },
      // {
      //     monitorType: MonitorType.Kubernetes,
      //     title: 'Kubernetes',
      //     description:
      //         'This monitor types lets you monitor Kubernetes clusters.',
      // },
      {
        monitorType: MonitorType.IP,
        title: "IP",
        description:
          "This monitor type lets you monitor any IPv4 or IPv6 addresses.",
      },
      {
        monitorType: MonitorType.IncomingRequest,
        title: "Incoming Request",
        description:
          "This monitor type lets you ping CBS Uptime from any external device or service with a custom payload.",
      },
      {
        monitorType: MonitorType.Port,
        title: "Port",
        description: "This monitor type lets you monitor any TCP or UDP port.",
      },
      {
        monitorType: MonitorType.Server,
        title: "Server / VM",
        description:
          "This monitor type lets you monitor any server, VM, or any machine.",
      },
      {
        monitorType: MonitorType.SSLCertificate,
        title: "SSL Certificate",
        description:
          "This monitor type lets you monitor SSL certificates of any domain.",
      },
      {
        monitorType: MonitorType.SyntheticMonitor,
        title: "Synthetic Monitor",
        description:
          "This monitor type lets you monitor your web application UI.",
      },
      {
        monitorType: MonitorType.CustomJavaScriptCode,
        title: "Custom JavaScript Code",
        description:
          "This monitor type lets you run custom JavaScript code on a schedule.",
      },
      {
        monitorType: MonitorType.Logs,
        title: "Logs",
        description: "This monitor type lets you monitor logs from any source.",
      },
      {
        monitorType: MonitorType.Traces,
        title: "Traces",
        description:
          "This monitor type lets you monitor traces from any source.",
      },
      // ,
      // {
      //   monitorType: MonitorType.Metrics,
      //   title: "Metrics",
      //   description:
      //     "This monitor type lets you monitor metrics from any source.",
      // },
    ];

    return monitorTypeProps;
  }

  public static getDescription(monitorType: MonitorType): string {
    const monitorTypeProps: Array<MonitorTypeProps> =
      this.getAllMonitorTypeProps().filter((item: MonitorTypeProps) => {
        return item.monitorType === monitorType;
      });

    if (!monitorTypeProps[0]) {
      throw new BadDataException(
        `${monitorType} does not have monitorType props`,
      );
    }

    return monitorTypeProps[0].description;
  }

  public static getTitle(monitorType: MonitorType): string {
    const monitorTypeProps: Array<MonitorTypeProps> =
      this.getAllMonitorTypeProps().filter((item: MonitorTypeProps) => {
        return item.monitorType === monitorType;
      });

    if (!monitorTypeProps[0]) {
      throw new BadDataException(
        `${monitorType} does not have monitorType props`,
      );
    }

    return monitorTypeProps[0].title;
  }

  public static isProbableMonitor(monitorType: MonitorType): boolean {
    const isProbeableMonitor: boolean =
      monitorType === MonitorType.API ||
      monitorType === MonitorType.Website ||
      monitorType === MonitorType.IP ||
      monitorType === MonitorType.Ping ||
      monitorType === MonitorType.Port ||
      monitorType === MonitorType.SSLCertificate ||
      monitorType === MonitorType.SyntheticMonitor ||
      monitorType === MonitorType.CustomJavaScriptCode;
    return isProbeableMonitor;
  }

  public static getActiveMonitorTypes(): Array<MonitorType> {
    return [
      MonitorType.API,
      MonitorType.Website,
      MonitorType.IP,
      MonitorType.Ping,
      MonitorType.Port,
      MonitorType.SSLCertificate,
      MonitorType.SyntheticMonitor,
      MonitorType.CustomJavaScriptCode,
      MonitorType.IncomingRequest,
      MonitorType.Server,
      MonitorType.Logs,
      MonitorType.Metrics,
      MonitorType.Traces,
    ];
  }

  public static doesMonitorTypeHaveDocumentation(
    monitorType: MonitorType,
  ): boolean {
    return (
      monitorType === MonitorType.IncomingRequest ||
      monitorType === MonitorType.Server
    );
  }

  public static doesMonitorTypeHaveInterval(monitorType: MonitorType): boolean {
    return this.isProbableMonitor(monitorType);
  }

  public static doesMonitorTypeHaveCriteria(monitorType: MonitorType): boolean {
    return monitorType !== MonitorType.Manual;
  }
}
