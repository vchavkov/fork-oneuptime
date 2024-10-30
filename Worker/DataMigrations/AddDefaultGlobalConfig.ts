import DataMigrationBase from "./DataMigrationBase";
import ObjectID from "Common/Types/ObjectID";
import GlobalConfigService from "Common/Server/Services/GlobalConfigService";
import GlobalConfig, {
  EmailServerType,
} from "Common/Models/DatabaseModels/GlobalConfig";

export default class AddDefaultGlobalConfig extends DataMigrationBase {
  public constructor() {
    super("AddDefaultGlobalConfig");
  }

  public override async migrate(): Promise<void> {
    // get all the users with email isVerified true.

    const globalConfig: GlobalConfig = new GlobalConfig();
    globalConfig.id = ObjectID.getZeroObjectID();
    globalConfig.emailServerType = EmailServerType.Internal;
    globalConfig.sendgridFromName = "CBSUptime";
    globalConfig.smtpFromName = "CBSUptime";

    await GlobalConfigService.create({
      data: globalConfig,
      props: {
        isRoot: true,
      },
    });
  }

  public override async rollback(): Promise<void> {
    return;
  }
}
