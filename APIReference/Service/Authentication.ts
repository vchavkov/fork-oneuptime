import { ViewsPath } from "../Utils/Config";
import ResourceUtil, { ModelDocumentation } from "../Utils/Resources";
import { ExpressRequest, ExpressResponse } from "Common/Server/Utils/Express";

// Retrieve resources documentation
const Resources: Array<ModelDocumentation> = ResourceUtil.getResources();

export default class ServiceHandler {
  public static async executeResponse(
    req: ExpressRequest,
    res: ExpressResponse,
  ): Promise<void> {
    let pageTitle: string = "";
    let pageDescription: string = "";

    // Extract page parameter from request
    const page: string | undefined = req.params["page"];
    const pageData: any = {};

    // Set default page title and description for the authentication page
    pageTitle = "Authentication";
    pageDescription = "Learn how to authenticate requests with CBSUptime API";

    // Render the index page with the specified parameters
    return res.render(`${ViewsPath}/pages/index`, {
      page: page,
      resources: Resources,
      pageTitle: pageTitle,
      pageDescription: pageDescription,
      pageData: pageData,
    });
  }
}
