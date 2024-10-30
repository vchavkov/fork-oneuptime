import URL from "Common/Types/API/URL";
import Link from "Common/Types/Link";
import Footer from "Common/UI/Components/Footer/Footer";
import React, { FunctionComponent, ReactElement } from "react";

export interface ComponentProps {
  copyright?: string | undefined;
  links: Array<Link>;
  className?: string | undefined;
  hidePoweredByOneUptimeBranding?: boolean | undefined;
}

const StatusPageFooter: FunctionComponent<ComponentProps> = (
  props: ComponentProps,
): ReactElement => {
  const links: Array<Link> = [...props.links];

  if (!props.hidePoweredByOneUptimeBranding) {
    links.push({
      title: "Powered by CBSUptime",
      to: URL.fromString("https://uptime.cbsretail.net"),
      openInNewTab: true,
    });
  }

  return (
    <Footer
      className={props.className}
      copyright={props.copyright}
      links={links}
    />
  );
};

export default StatusPageFooter;
