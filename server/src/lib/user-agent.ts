export function parseUserAgent(ua: string): { browser: string; os: string } {
  let browser = "Unknown Browser";
  let os = "Unknown OS";

  if (ua.includes("Firefox") && !ua.includes("Seamonkey")) {
    browser = "Firefox";
  } else if (ua.includes("Edg/")) {
    browser = "Edge";
  } else if (ua.includes("Chrome") && !ua.includes("Edg/")) {
    browser = "Chrome";
  } else if (ua.includes("Safari") && !ua.includes("Chrome")) {
    browser = "Safari";
  } else if (ua.includes("Opera") || ua.includes("OPR")) {
    browser = "Opera";
  } else if (ua.includes("curl")) {
    browser = "curl";
  } else if (ua.includes("node")) {
    browser = "Node.js";
  } else if (ua.includes("PostmanRuntime")) {
    browser = "Postman";
  }

  if (ua.includes("Windows")) {
    os = "Windows";
  } else if (ua.includes("Mac OS")) {
    os = "macOS";
  } else if (ua.includes("Linux")) {
    os = "Linux";
  } else if (ua.includes("Android")) {
    os = "Android";
  } else if (ua.includes("iPhone") || ua.includes("iPad")) {
    os = "iOS";
  }

  return { browser, os };
}
