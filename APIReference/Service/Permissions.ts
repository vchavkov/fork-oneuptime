import { ViewsPath } from "../Utils/Config";
import ResourceUtil, { ModelDocumentation } from "../Utils/Resources";
import { PermissionHelper, PermissionProps } from "Common/Types/Permission";
import { ExpressRequest, ExpressResponse } from "Common/Server/Utils/Express";

const Resources: Array<ModelDocumentation> = ResourceUtil.getResources();

export default class ServiceHandler {
  public static async executeResponse(
    req: ExpressRequest,
    res: ExpressResponse,
  ): Promise<void> {
    // Initialize page title and description
    let pageTitle: string = "";
    let pageDescription: string = "";

    // Get the requested page
    const page: string | undefined = req.params["page"];
    const pageData: any = {};

    // Set page title and description
    pageTitle = "Permissions";
    pageDescription = "Learn how permissions work with CBS Uptime";

    // Filter permissions to only include those assignable to tenants
    pageData.permissions = PermissionHelper.getAllPermissionProps().filter(
      (i: PermissionProps) => {
        return i.isAssignableToTenant;
      },
    );

    // Render the page
    return res.render(`${ViewsPath}/pages/index`, {
      page: page,
      resources: Resources,
      pageTitle: pageTitle,
      pageDescription: pageDescription,
      pageData: pageData,
    });
  }
}
