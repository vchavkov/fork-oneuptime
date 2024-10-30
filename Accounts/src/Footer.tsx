import React from "react";
import { Link } from "react-router-dom";

const Footer: () => JSX.Element = () => {
  return (
    <div className="footer">
      <p>
        <Link to="/">&copy; CBSUptime</Link>
      </p>
      <p>
        <Link to="/">Contact</Link>
      </p>
      <p>
        <Link to="/">Privacy &amp; terms</Link>
      </p>
    </div>
  );
};

export default Footer;
