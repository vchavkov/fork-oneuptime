import {
  GetCodeRepositoryPassword,
  GetLlmServerUrl,
  GetLlmType,
  GetOneUptimeURL,
  GetRepositorySecretKey,
} from "../Config";
import CodeRepositoryUtil, { CodeRepositoryResult } from "./CodeRepository";
import CodeRepositoryType from "Common/Types/CodeRepository/CodeRepositoryType";
import BadDataException from "Common/Types/Exception/BadDataException";
import URL from "Common/Types/API/URL";
import LlmType from "../Types/LlmType";
import API from "Common/Utils/API";
import HTTPErrorResponse from "Common/Types/API/HTTPErrorResponse";
import HTTPResponse from "Common/Types/API/HTTPResponse";
import { JSONObject } from "Common/Types/JSON";
import logger from "Common/Server/Utils/Logger";
import CopilotActionTypeUtil from "./CopilotActionTypes";

export default class InitUtil {
  public static async init(): Promise<CodeRepositoryResult> {
    if (GetLlmType() === LlmType.ONEUPTIME_LLM) {
      const llmServerUrl: URL = GetLlmServerUrl();
      // check status of ll, server
      const result: HTTPErrorResponse | HTTPResponse<JSONObject> =
        await API.get(URL.fromString(llmServerUrl.toString()));

      if (result instanceof HTTPErrorResponse) {
        throw new BadDataException(
          "CBS Uptime LLM server is not reachable. Please check the server URL in the environment variables.",
        );
      }
    }

    // check if oneuptime server is up.
    const oneuptimeServerUrl: URL = GetOneUptimeURL();
    const result: HTTPErrorResponse | HTTPResponse<JSONObject> = await API.get(
      URL.fromString(oneuptimeServerUrl.toString() + "/status"),
    );

    if (result instanceof HTTPErrorResponse) {
      throw new BadDataException(
        `CBS Uptime ${GetOneUptimeURL().toString()} is not reachable.  Please check the server URL in the environment variables.`,
      );
    }

    if (!GetRepositorySecretKey()) {
      throw new BadDataException("Repository Secret Key is required");
    }

    const codeRepositoryResult: CodeRepositoryResult =
      await CodeRepositoryUtil.getCodeRepositoryResult();

    // Check if the repository type is GitHub and the GitHub token is provided

    if (codeRepositoryResult.serviceRepositories.length === 0) {
      logger.error(
        "No services found in the repository. Please add services to the repository in CBS Uptime Dashboard.",
      );

      throw new BadDataException(
        "No services found in the repository. Please add services to the repository in CBS Uptime Dashboard.",
      );
    }

    if (
      codeRepositoryResult.codeRepository.repositoryHostedAt ===
        CodeRepositoryType.GitHub &&
      !GetCodeRepositoryPassword()
    ) {
      throw new BadDataException(
        "GitHub token is required for this repository. Please provide the GitHub token in the environment variables.",
      );
    }

    // check copilot action types enabled and print it out for user.
    CopilotActionTypeUtil.printEnabledAndDisabledActionTypes();

    return codeRepositoryResult;
  }
}
