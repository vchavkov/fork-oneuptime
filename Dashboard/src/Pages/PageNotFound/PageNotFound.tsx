// Tailwind
import PageComponentProps from "../PageComponentProps";
import Route from "Common/Types/API/Route";
import Email from "Common/Types/Email";
import NotFound from "Common/UI/Components/404";
import Page from "Common/UI/Components/Page/Page";
import React, { FunctionComponent, ReactElement } from "react";

const PageNotFound: FunctionComponent<
  PageComponentProps
> = (): ReactElement => {
  return (
    <Page title={""} breadcrumbLinks={[]}>
      <NotFound
        homeRoute={new Route("/dashboard")}
        supportEmail={new Email("support@uptime.cbsretail.net")}
      />
    </Page>
  );
};

export default PageNotFound;
