export type UserRegionContext = {
  countryCode?: string;
  source: "explicit" | "header" | "locale" | "unknown";
  locale?: string;
  timeZone?: string;
};

const COUNTRY_NAME: Record<string, string> = {
  CN: "中国大陆",
  HK: "中国香港",
  MO: "中国澳门",
  TW: "中国台湾",
  US: "美国",
  CA: "加拿大",
  GB: "英国",
  AU: "澳大利亚",
  SG: "新加坡",
  JP: "日本",
};

function cleanText(raw: unknown, max = 80): string | undefined {
  if (typeof raw !== "string") return undefined;
  const text = raw.trim();
  return text ? text.slice(0, max) : undefined;
}

function countryCode(raw: unknown): string | undefined {
  const text = cleanText(raw, 12)?.toUpperCase();
  if (!text || text === "XX" || text === "UNKNOWN") return undefined;
  return /^[A-Z]{2}$/.test(text) ? text : undefined;
}

function localeCountry(raw: unknown): string | undefined {
  const locale = cleanText(raw, 40);
  if (!locale) return undefined;
  const parts = locale.split(/[-_]/);
  return countryCode(parts[1]);
}

function regionFromBody(body: Record<string, unknown>): UserRegionContext | null {
  const nested =
    body.region && typeof body.region === "object"
      ? (body.region as Record<string, unknown>)
      : {};
  const locale = cleanText(nested.locale ?? body.locale, 40);
  const timeZone = cleanText(nested.timeZone ?? body.timeZone, 80);
  const explicit = countryCode(
    nested.countryCode ?? nested.country ?? body.countryCode ?? body.country,
  );
  if (explicit) return { countryCode: explicit, source: "explicit", locale, timeZone };

  const fromLocale = localeCountry(locale);
  if (fromLocale) return { countryCode: fromLocale, source: "locale", locale, timeZone };
  if (timeZone === "Asia/Shanghai") {
    return { countryCode: "CN", source: "locale", locale, timeZone };
  }
  return locale || timeZone ? { source: "unknown", locale, timeZone } : null;
}

function headerCountry(req: Request): string | undefined {
  return (
    countryCode(req.headers.get("cf-ipcountry")) ??
    countryCode(req.headers.get("x-vercel-ip-country")) ??
    countryCode(req.headers.get("x-country-code")) ??
    countryCode(req.headers.get("cloudfront-viewer-country"))
  );
}

function acceptLanguageCountry(req: Request): string | undefined {
  const header = req.headers.get("accept-language");
  const first = header?.split(",")[0]?.trim();
  return localeCountry(first);
}

export function userRegionFromRequest(
  req: Request,
  body: Record<string, unknown>,
): UserRegionContext {
  const fromBody = regionFromBody(body);
  if (fromBody?.countryCode) return fromBody;

  const fromHeader = headerCountry(req);
  if (fromHeader) {
    return {
      countryCode: fromHeader,
      source: "header",
      locale: fromBody?.locale,
      timeZone: fromBody?.timeZone,
    };
  }

  const fromAcceptLanguage = acceptLanguageCountry(req);
  if (fromAcceptLanguage) {
    return {
      countryCode: fromAcceptLanguage,
      source: "locale",
      locale: fromBody?.locale ?? req.headers.get("accept-language")?.split(",")[0]?.trim(),
      timeZone: fromBody?.timeZone,
    };
  }

  return fromBody ?? { source: "unknown" };
}

export function regionPrompt(region: UserRegionContext): string {
  const country = region.countryCode
    ? `${region.countryCode}(${COUNTRY_NAME[region.countryCode] ?? "未知地区"})`
    : "(unknown)";
  return [
    "【用户地区上下文】",
    `detected_country: ${country}`,
    `source: ${region.source}`,
    region.locale ? `locale: ${region.locale}` : "",
    region.timeZone ? `time_zone: ${region.timeZone}` : "",
    "使用边界:",
    "- 地区只用于判断商品/药品可得性和就医表达方式;IP/语言/时区都可能不准。",
    "- 当用户问具体品牌、购买渠道或本地是否可买时,如果地区不确定,先问用户所在国家/地区。",
  ]
    .filter(Boolean)
    .join("\n");
}
